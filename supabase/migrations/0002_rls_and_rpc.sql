-- ============================================================================
-- 0002_rls_and_rpc.sql
-- HealthSafe Security, Row-Level Security (RLS) & RPC Interface
-- ============================================================================

-- Prominent Security Notice:
-- Demo-grade access control. Production requires Supabase Auth,
-- patient-granted ABDM consent artefacts, short expiry and per-user audit.

-- ----------------------------------------------------------------------------
-- 1. ROW-LEVEL SECURITY (RLS)
-- Enable RLS on all tables. Define NO policies allowing anon or authenticated
-- direct table access. All client access is mediated strictly via RPC functions.
-- ----------------------------------------------------------------------------
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default in Supabase for trusted ingestion & scripts.
-- Anon and Authenticated have NO direct table SELECT/INSERT/UPDATE/DELETE policies.

-- ----------------------------------------------------------------------------
-- 2. RPC: get_prescription_by_rx_id
-- Clinician lookup: returns prescription, parent encounter, and minimal demographics.
-- Restricted to demo patients (is_demo = true).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_prescription_by_rx_id(p_rx_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm_query TEXT;
  v_rx RECORD;
  v_patient RECORD;
  v_encounter_json JSONB := NULL;
  v_meds JSONB := '[]'::JSONB;
  v_result JSONB;
BEGIN
  -- Normalize input: trim, uppercase, remove spaces and hyphens
  v_norm_query := UPPER(REPLACE(REPLACE(TRIM(COALESCE(p_rx_id, '')), ' ', ''), '-', ''));

  IF v_norm_query = '' THEN
    INSERT INTO access_logs (lookup_type, lookup_key, found)
    VALUES ('rx_id', p_rx_id, false);
    RETURN NULL;
  END IF;

  -- Match prescription tolerating hyphenated or non-hyphenated input
  SELECT pr.*, p.name AS pat_name, p.gender AS pat_gender, p.dob AS pat_dob, p.is_demo
  INTO v_rx
  FROM prescriptions pr
  JOIN patients p ON pr.patient_id = p.id
  WHERE UPPER(REPLACE(pr.rx_id, '-', '')) = v_norm_query
    AND p.is_demo = true
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO access_logs (lookup_type, lookup_key, found)
    VALUES ('rx_id', p_rx_id, false);
    RETURN NULL;
  END IF;

  -- Log successful access
  INSERT INTO access_logs (lookup_type, lookup_key, found)
  VALUES ('rx_id', v_rx.rx_id, true);

  -- Retrieve all MedicationRequests sharing this speakable_rx_id
  SELECT COALESCE(jsonb_agg(fr.raw_json ORDER BY fr.created_at), '[]'::JSONB)
  INTO v_meds
  FROM fhir_resources fr
  WHERE fr.speakable_rx_id = v_rx.rx_id;

  -- Retrieve parent Encounter raw_json if linked
  IF v_rx.encounter_resource_id IS NOT NULL THEN
    SELECT fr.raw_json INTO v_encounter_json
    FROM fhir_resources fr
    WHERE fr.id = v_rx.encounter_resource_id;
  END IF;

  -- Construct final payload with MINIMAL patient demographics (NEVER phone)
  v_result := jsonb_build_object(
    'prescription', jsonb_build_object(
      'rx_id', v_rx.rx_id,
      'hospital_name', v_rx.hospital_name,
      'doctor_name', v_rx.doctor_name,
      'issued_on', v_rx.issued_on,
      'medications', v_meds
    ),
    'encounter', v_encounter_json,
    'patient', jsonb_build_object(
      'name', v_rx.pat_name,
      'gender', v_rx.pat_gender,
      'dob', v_rx.pat_dob,
      'abha_id', v_rx.abha_id
    )
  );

  RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. RPC: get_patient_timeline
-- Returns longitudinal timeline for demo patients with keyset pagination.
-- ----------------------------------------------------------------------------
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
  v_count INT;
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
        'raw_json', sub.raw_json
      )
    ), '[]'::JSONB
  ),
  MIN(sub.event_date)
  INTO v_items, v_next_cursor
  FROM (
    SELECT fr.id, fr.resource_type, fr.event_date, fr.summary_title, fr.summary_value, fr.speakable_rx_id, fr.raw_json
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

-- ----------------------------------------------------------------------------
-- 4. RPC: get_patient_resources_for_care_gaps
-- Retrieves Condition and Observation records for care-gap analysis.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 5. RPC: ingest_patient_bundle
-- Atomic, idempotent bundle ingestion (Service Role only).
-- ----------------------------------------------------------------------------
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
      raw_json
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
      v_rec.value->'raw_json'
    )
    ON CONFLICT (patient_id, resource_type, fhir_id) DO UPDATE SET
      event_date = EXCLUDED.event_date,
      speakable_rx_id = EXCLUDED.speakable_rx_id,
      summary_title = EXCLUDED.summary_title,
      summary_value = EXCLUDED.summary_value,
      raw_json = EXCLUDED.raw_json,
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

-- ----------------------------------------------------------------------------
-- PERMISSIONS AND GRANTS
-- ----------------------------------------------------------------------------

-- Revoke default public execution
REVOKE ALL ON FUNCTION get_prescription_by_rx_id(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_patient_timeline(TEXT, TEXT, INT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_patient_resources_for_care_gaps(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION ingest_patient_bundle(JSONB, JSONB, JSONB) FROM PUBLIC;

-- Grant read RPCs to anon and authenticated clients
GRANT EXECUTE ON FUNCTION get_prescription_by_rx_id(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_patient_timeline(TEXT, TEXT, INT, TIMESTAMPTZ) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_patient_resources_for_care_gaps(TEXT) TO anon, authenticated, service_role;

-- Strictly restrict bundle ingestion to service_role only
REVOKE ALL ON FUNCTION ingest_patient_bundle(JSONB, JSONB, JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION ingest_patient_bundle(JSONB, JSONB, JSONB) TO service_role;
