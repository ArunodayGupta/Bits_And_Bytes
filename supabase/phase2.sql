-- ============================================================================
-- supabase/phase2.sql
-- HealthSafe / Unified Health Wallet Phase 2 Database Migration
-- Idempotent script for Supabase SQL Editor
-- ============================================================================

-- 1. Add source column to fhir_resources
ALTER TABLE fhir_resources 
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ingested' 
  CHECK (source IN ('ingested', 'ocr_scan'));

-- 2. Update access_logs.lookup_type CHECK constraint idempotently
DO $$
BEGIN
  ALTER TABLE access_logs DROP CONSTRAINT IF EXISTS access_logs_lookup_type_check;
  ALTER TABLE access_logs ADD CONSTRAINT access_logs_lookup_type_check
    CHECK (lookup_type IN ('rx_id', 'abha_timeline', 'care_gaps', 'savings', 'scan', 'demo_patients'));
END $$;

-- 3. Update get_patient_timeline RPC to expose source
CREATE OR REPLACE FUNCTION get_patient_timeline(
  p_abha_id TEXT,
  p_filter_type TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm_abha TEXT;
  v_patient_id UUID;
  v_items JSONB;
  v_next_cursor TIMESTAMPTZ := NULL;
BEGIN
  v_norm_abha := TRIM(COALESCE(p_abha_id, ''));

  -- Verify demo patient exists
  SELECT id INTO v_patient_id
  FROM patients
  WHERE abha_id = v_norm_abha AND is_demo = true;

  IF NOT FOUND THEN
    INSERT INTO access_logs (lookup_type, lookup_key, found)
    VALUES ('abha_timeline', p_abha_id, false);
    RETURN jsonb_build_object('items', '[]'::JSONB, 'next_cursor', null);
  END IF;

  INSERT INTO access_logs (lookup_type, lookup_key, found)
  VALUES ('abha_timeline', v_norm_abha, true);

  -- Fetch items with keyset pagination
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', sub.id,
        'resource_type', sub.resource_type,
        'event_date', sub.event_date,
        'summary_title', sub.summary_title,
        'summary_value', sub.summary_value,
        'speakable_rx_id', sub.speakable_rx_id,
        'source', sub.source,
        'raw_json', sub.raw_json
      )
    ), '[]'::JSONB
  ),
  MIN(sub.event_date)
  INTO v_items, v_next_cursor
  FROM (
    SELECT fr.id, fr.resource_type, fr.event_date, fr.summary_title, fr.summary_value, fr.speakable_rx_id, fr.source, fr.raw_json
    FROM fhir_resources fr
    WHERE fr.patient_id = v_patient_id
      AND (p_filter_type IS NULL OR LOWER(fr.resource_type) = LOWER(p_filter_type))
      AND (p_before IS NULL OR fr.event_date < p_before)
    ORDER BY fr.event_date DESC NULLS LAST, fr.id DESC
    LIMIT LEAST(p_limit, 100)
  ) sub;

  RETURN jsonb_build_object(
    'items', v_items,
    'next_cursor', v_next_cursor
  );
END;
$$;

-- 4. Update get_patient_resources_for_care_gaps RPC to expose source
CREATE OR REPLACE FUNCTION get_patient_resources_for_care_gaps(p_abha_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm_abha TEXT;
  v_patient_id UUID;
  v_resources JSONB;
BEGIN
  v_norm_abha := TRIM(COALESCE(p_abha_id, ''));

  SELECT id INTO v_patient_id
  FROM patients
  WHERE abha_id = v_norm_abha AND is_demo = true;

  IF NOT FOUND THEN
    INSERT INTO access_logs (lookup_type, lookup_key, found)
    VALUES ('care_gaps', p_abha_id, false);
    RETURN '[]'::JSONB;
  END IF;

  INSERT INTO access_logs (lookup_type, lookup_key, found)
  VALUES ('care_gaps', v_norm_abha, true);

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', fr.id,
        'resource_type', fr.resource_type,
        'fhir_id', fr.fhir_id,
        'event_date', fr.event_date,
        'summary_title', fr.summary_title,
        'summary_value', fr.summary_value,
        'source', fr.source,
        'raw_json', fr.raw_json
      ) ORDER BY fr.event_date DESC NULLS LAST
    ), '[]'::JSONB
  )
  INTO v_resources
  FROM fhir_resources fr
  WHERE fr.patient_id = v_patient_id
    AND fr.resource_type IN ('Condition', 'Observation');

  RETURN v_resources;
END;
$$;

-- 5. Update ingest_patient_bundle RPC to preserve/handle source = 'ocr_scan'
CREATE OR REPLACE FUNCTION ingest_patient_bundle(
  p_patient JSONB,
  p_resources JSONB,
  p_prescriptions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_rec RECORD;
  v_pres RECORD;
  v_ingested_count INT := 0;
  v_rx_ids TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- 1. Upsert Patient
  INSERT INTO patients (
    abha_id,
    fhir_id,
    name,
    gender,
    dob,
    phone,
    is_demo
  )
  VALUES (
    p_patient->>'abha_id',
    p_patient->>'fhir_id',
    p_patient->>'name',
    p_patient->>'gender',
    NULLIF(p_patient->>'dob', '')::DATE,
    p_patient->>'phone',
    COALESCE((p_patient->>'is_demo')::BOOLEAN, false)
  )
  ON CONFLICT (abha_id) DO UPDATE SET
    fhir_id = EXCLUDED.fhir_id,
    name = EXCLUDED.name,
    gender = EXCLUDED.gender,
    dob = EXCLUDED.dob,
    phone = EXCLUDED.phone,
    is_demo = EXCLUDED.is_demo,
    updated_at = NOW()
  RETURNING id INTO v_patient_id;

  -- 2. Upsert Prescriptions header rows
  FOR v_pres IN SELECT * FROM jsonb_array_elements(COALESCE(p_prescriptions, '[]'::JSONB))
  LOOP
    INSERT INTO prescriptions (
      rx_id,
      patient_id,
      abha_id,
      hospital_name,
      doctor_name,
      issued_on
    )
    VALUES (
      v_pres.value->>'rx_id',
      v_patient_id,
      p_patient->>'abha_id',
      v_pres.value->>'hospital_name',
      v_pres.value->>'doctor_name',
      (v_pres.value->>'issued_on')::DATE
    )
    ON CONFLICT (rx_id) DO UPDATE SET
      hospital_name = EXCLUDED.hospital_name,
      doctor_name = EXCLUDED.doctor_name,
      issued_on = EXCLUDED.issued_on;

    v_rx_ids := array_append(v_rx_ids, v_pres.value->>'rx_id');
  END LOOP;

  -- 3. Upsert FHIR Resources (Pass 1: without self-joins)
  FOR v_rec IN SELECT * FROM jsonb_array_elements(COALESCE(p_resources, '[]'::JSONB))
  LOOP
    INSERT INTO fhir_resources (
      patient_id,
      abha_id,
      resource_type,
      fhir_id,
      event_date,
      speakable_rx_id,
      summary_title,
      summary_value,
      raw_json,
      source
    )
    VALUES (
      v_patient_id,
      p_patient->>'abha_id',
      v_rec.value->>'resource_type',
      v_rec.value->>'fhir_id',
      NULLIF(v_rec.value->>'event_date', '')::TIMESTAMPTZ,
      v_rec.value->>'speakable_rx_id',
      v_rec.value->>'summary_title',
      v_rec.value->>'summary_value',
      v_rec.value->'raw_json',
      COALESCE(v_rec.value->>'source', 'ingested')
    )
    ON CONFLICT (patient_id, resource_type, fhir_id) DO UPDATE SET
      event_date = EXCLUDED.event_date,
      speakable_rx_id = EXCLUDED.speakable_rx_id,
      summary_title = EXCLUDED.summary_title,
      summary_value = EXCLUDED.summary_value,
      raw_json = EXCLUDED.raw_json,
      source = EXCLUDED.source,
      updated_at = NOW();

    v_ingested_count := v_ingested_count + 1;
  END LOOP;

  -- 4. Pass 2: Resolve and update encounter_id links and prescription encounter links
  FOR v_rec IN SELECT * FROM jsonb_array_elements(COALESCE(p_resources, '[]'::JSONB))
  LOOP
    IF v_rec.value->>'encounter_fhir_id' IS NOT NULL THEN
      UPDATE fhir_resources
      SET encounter_id = (
        SELECT id FROM fhir_resources
        WHERE patient_id = v_patient_id
          AND resource_type = 'Encounter'
          AND fhir_id = v_rec.value->>'encounter_fhir_id'
        LIMIT 1
      )
      WHERE patient_id = v_patient_id
        AND resource_type = v_rec.value->>'resource_type'
        AND fhir_id = v_rec.value->>'fhir_id';
    END IF;
  END LOOP;

  -- Link prescriptions to their parent encounter resource
  FOR v_pres IN SELECT * FROM jsonb_array_elements(COALESCE(p_prescriptions, '[]'::JSONB))
  LOOP
    IF v_pres.value->>'encounter_fhir_id' IS NOT NULL THEN
      UPDATE prescriptions
      SET encounter_resource_id = (
        SELECT id FROM fhir_resources
        WHERE patient_id = v_patient_id
          AND resource_type = 'Encounter'
          AND fhir_id = v_pres.value->>'encounter_fhir_id'
        LIMIT 1
      )
      WHERE rx_id = v_pres.value->>'rx_id';
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'patient_id', v_patient_id,
    'abha_id', p_patient->>'abha_id',
    'ingested_count', v_ingested_count,
    'rx_ids', v_rx_ids
  );
END;
$$;

-- Ensure grants are in place
GRANT EXECUTE ON FUNCTION get_patient_timeline(TEXT, TEXT, INT, TIMESTAMPTZ) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_patient_resources_for_care_gaps(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ingest_patient_bundle(JSONB, JSONB, JSONB) TO service_role;
