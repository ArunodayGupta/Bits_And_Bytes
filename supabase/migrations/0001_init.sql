-- ============================================================================
-- 0001_init.sql
-- HealthSafe Personal Health Record (PHR) Core Schema
-- HL7 FHIR R4 / ABDM NRCeS Compatible Architecture
-- ============================================================================

-- Function: updated_at auto-timestamp trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. Table: patients
-- Holds demographic identity mapped to Indian ABDM ABHA identifiers.
-- ----------------------------------------------------------------------------
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abha_id VARCHAR(30) NOT NULL UNIQUE,
  fhir_id TEXT,
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(20),
  dob DATE,
  phone VARCHAR(20) NULL,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_abha_format CHECK (abha_id ~ '^[0-9]{2}-[0-9]{4}-[0-9]{4}-[0-9]{4}$')
);

CREATE TRIGGER trg_patients_updated_at
BEFORE UPDATE ON patients
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Table: prescriptions
-- One row per prescription; multiple MedicationRequests can belong to one Rx.
-- ----------------------------------------------------------------------------
CREATE TABLE prescriptions (
  rx_id VARCHAR(50) PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  abha_id VARCHAR(30) NOT NULL,
  encounter_resource_id UUID NULL,
  hospital_name TEXT,
  doctor_name TEXT,
  issued_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. Table: fhir_resources
-- Core engine: stores normalized metadata plus complete untouched FHIR R4 JSON.
-- ----------------------------------------------------------------------------
CREATE TABLE fhir_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  abha_id VARCHAR(30) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  fhir_id TEXT NOT NULL,
  event_date TIMESTAMPTZ NULL,
  encounter_id UUID NULL REFERENCES fhir_resources(id) ON DELETE SET NULL,
  speakable_rx_id VARCHAR(50) NULL REFERENCES prescriptions(rx_id) ON DELETE SET NULL,
  summary_title VARCHAR(255) NOT NULL,
  summary_value VARCHAR(255) NULL,
  raw_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_patient_resource_fhir UNIQUE (patient_id, resource_type, fhir_id)
);

CREATE TRIGGER trg_fhir_resources_updated_at
BEFORE UPDATE ON fhir_resources
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Add deferred foreign key from prescriptions to parent encounter fhir_resource
ALTER TABLE prescriptions
  ADD CONSTRAINT fk_prescriptions_encounter
  FOREIGN KEY (encounter_resource_id)
  REFERENCES fhir_resources(id)
  ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 4. Table: offline_bundles
-- Demo and offline cache for pre-bundled synthetic patient scenarios.
-- ----------------------------------------------------------------------------
CREATE TABLE offline_bundles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  bundle_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. Table: access_logs
-- Immutable audit log for clinician and patient lookups (consent audit story).
-- ----------------------------------------------------------------------------
CREATE TABLE access_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lookup_type TEXT CHECK (lookup_type IN ('rx_id', 'abha_timeline', 'care_gaps')),
  lookup_key TEXT,
  found BOOLEAN
);

-- ----------------------------------------------------------------------------
-- INDEXES & QUERY OPTIMIZATIONS
-- ----------------------------------------------------------------------------

-- Index 1: Serves keyset-paginated longitudinal timeline queries sorted descending by event_date
CREATE INDEX idx_fhir_timeline ON fhir_resources (abha_id, event_date DESC NULLS LAST);

-- Index 2: Serves fast filtered lookup of MedicationRequests matching a specific speakable Rx-ID
CREATE INDEX idx_fhir_rx_lookup ON fhir_resources (speakable_rx_id) WHERE speakable_rx_id IS NOT NULL;

-- Index 3: Serves category-filtered timeline views (Encounters, Conditions, Observations, Medications)
CREATE INDEX idx_fhir_resource_type ON fhir_resources (resource_type);

-- Extra 1: Serves care-gap rule analysis and chronological clinical evaluation for a specific patient
CREATE INDEX idx_fhir_patient_type_date ON fhir_resources (patient_id, resource_type, event_date DESC);

-- Extra 2: Serves fast joins from child observations/medications to their parent Encounter row
CREATE INDEX idx_fhir_encounter_id ON fhir_resources (encounter_id);

-- Extra 3: Accelerates path-based JSONB attribute search on raw FHIR payloads
CREATE INDEX idx_fhir_raw_json_gin ON fhir_resources USING GIN (raw_json jsonb_path_ops);

-- Extra 4: Speeds up patient-level prescription lookups and cascading deletion
CREATE INDEX idx_prescriptions_patient_id ON prescriptions (patient_id);
