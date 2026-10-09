-- Demo-grade access control. Production requires Supabase Auth, patient-granted ABDM consent artefacts, short expiry and per-user audit.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    abha_id VARCHAR(30) NOT NULL UNIQUE CHECK (abha_id ~ '^[0-9]{2}-[0-9]{4}-[0-9]{4}-[0-9]{4}$'),
    fhir_id TEXT,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20),
    dob DATE,
    phone VARCHAR(20),
    is_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF IF EXISTS set_patients_updated_at ON patients;
CREATE TRIGGER set_patients_updated_at
BEFORE UPDATE ON patients
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS prescriptions (
    rx_id VARCHAR(50) PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    abha_id VARCHAR(30),
    encounter_resource_id UUID,
    hospital_name TEXT,
    doctor_name TEXT,
    issued_on DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fhir_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    abha_id VARCHAR(30) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    fhir_id TEXT NOT NULL,
    event_date TIMESTAMPTZ,
    encounter_id UUID,
    speakable_rx_id VARCHAR(50) REFERENCES prescriptions(rx_id),
    summary_title VARCHAR(255) NOT NULL,
    summary_value VARCHAR(255),
    raw_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (patient_id, resource_type, fhir_id)
);

DROP TRIGGER IF EXISTS set_fhir_resources_updated_at ON fhir_resources;
CREATE TRIGGER set_fhir_resources_updated_at
BEFORE UPDATE ON fhir_resources
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS offline_bundles (
    id VARCHAR(50) PRIMARY KEY,
    name TEXT,
    bundle_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    lookup_type TEXT CHECK (lookup_type IN ('rx_id', 'timeline', 'care_gaps')),
    lookup_key TEXT,
    found BOOLEAN
);

-- Indexes
-- Serves the longitudinal timeline by ABHA number
CREATE INDEX IF NOT EXISTS idx_fhir_timeline ON fhir_resources (abha_id, event_date DESC NULLS LAST, id DESC);
-- Serves the fast clinician lookup by Prescription ID
CREATE INDEX IF NOT EXISTS idx_fhir_rx_lookup ON fhir_resources (speakable_rx_id) WHERE speakable_rx_id IS NOT NULL;
-- Supports type-based filtering
CREATE INDEX IF NOT EXISTS idx_fhir_resource_type ON fhir_resources (resource_type);
-- Extra indexes
CREATE INDEX IF NOT EXISTS idx_fhir_patient_type_date ON fhir_resources (patient_id, resource_type, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_fhir_encounter_id ON fhir_resources (encounter_id);
CREATE INDEX IF NOT EXISTS idx_fhir_raw_json_gin ON fhir_resources USING GIN (raw_json jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON prescriptions(patient_id);

-- Security: RLS enabled with NO policies
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fhir_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Atomic ingest function
CREATE OR REPLACE FUNCTION ingest_patient_bundle(p_patient jsonb, p_resources jsonb, p_prescriptions jsonb)
RETURNS jsonb AS $$
DECLARE
    v_patient_id UUID;
    v_encounter UUID;
    v_enc_uuid UUID;
    v_res jsonb;
    v_rx jsonb;
    v_patient_counts int := 0;
    v_rx_counts int := 0;
    v_res_counts int := 0;
BEGIN
    -- 1. Upsert Patient
    INSERT INTO patients (abha_id, fhir_id, name, gender, dob, phone, is_demo)
    VALUES (
        p_patient->>'abha_id',
        p_patient->>'fhir_id',
        p_patient->>'name',
        p_patient->>'gender',
        (p_patient->>'dob')::date,
        p_patient->>'phone',
        (p_patient->>'is_demo')::boolean
    )
    ON CONFLICT (abha_id) DO UPDATE SET
        fhir_id = EXCLUDED.fhir_id,
        name = EXCLUDED.name,
        gender = EXCLUDED.gender,
        dob = EXCLUDED.dob,
        phone = EXCLUDED.phone,
        is_demo = EXCLUDED.is_demo
    RETURNING id INTO v_patient_id;
    v_patient_counts := 1;

    -- 2. Upsert Prescriptions
    IF p_prescriptions IS NOT NULL AND jsonb_array_length(p_prescriptions) > 0 THEN
        FOR v_rx IN SELECT * FROM jsonb_array_elements(p_prescriptions)
        LOOP
            IF v_rx->>'encounter_resource_id' IS NOT NULL THEN
                v_enc_uuid := (v_rx->>'encounter_resource_id')::UUID;
            ELSE
                v_enc_uuid := NULL;
            END IF;

            INSERT INTO prescriptions (rx_id, patient_id, abha_id, encounter_resource_id, hospital_name, doctor_name, issued_on)
            VALUES (
                v_rx->>'rx_id',
                v_patient_id,
                p_patient->>'abha_id',
                v_enc_uuid,
                v_rx->>'hospital_name',
                v_rx->>'doctor_name',
                (v_rx->>'issued_on')::date
            )
            ON CONFLICT (rx_id) DO UPDATE SET
                encounter_resource_id = EXCLUDED.encounter_resource_id,
                hospital_name = EXCLUDED.hospital_name,
                doctor_name = EXCLUDED.doctor_name,
                issued_on = EXCLUDED.issued_on;
            v_rx_counts := v_rx_counts + 1;
        END LOOP;
    END IF;

    -- 3. Upsert Resources
    IF p_resources IS NOT NULL AND jsonb_array_length(p_resources) > 0 THEN
        FOR v_res IN SELECT * FROM jsonb_array_elements(p_resources)
        LOOP
            IF v_res->>'encounter_id' IS NOT NULL THEN
                v_enc_uuid := (v_res->>'encounter_id')::UUID;
            ELSE
                v_enc_uuid := NULL;
            END IF;
            
            INSERT INTO fhir_resources (patient_id, abha_id, resource_type, fhir_id, event_date, encounter_id, speakable_rx_id, summary_title, summary_value, raw_json)
            VALUES (
                v_patient_id,
                p_patient->>'abha_id',
                v_res->>'resource_type',
                v_res->>'fhir_id',
                (v_res->>'event_date')::timestamptz,
                v_enc_uuid,
                v_res->>'speakable_rx_id',
                v_res->>'summary_title',
                v_res->>'summary_value',
                v_res->'raw_json'
            )
            ON CONFLICT (patient_id, resource_type, fhir_id) DO UPDATE SET
                event_date = EXCLUDED.event_date,
                encounter_id = EXCLUDED.encounter_id,
                speakable_rx_id = EXCLUDED.speakable_rx_id,
                summary_title = EXCLUDED.summary_title,
                summary_value = EXCLUDED.summary_value,
                raw_json = EXCLUDED.raw_json;
            v_res_counts := v_res_counts + 1;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'patient_id', v_patient_id,
        'patient_upserted', v_patient_counts,
        'prescriptions_upserted', v_rx_counts,
        'resources_upserted', v_res_counts
    );
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION ingest_patient_bundle FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION ingest_patient_bundle TO service_role;
