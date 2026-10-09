# Backend Architecture and Assumptions

## Architecture
- **Framework**: FastAPI with Pydantic for validation.
- **Database**: Supabase (PostgreSQL) used via `supabase-py`.
- **Hybrid Model**: Essential searchable metadata (resource type, event date, encounter, Rx-ID) are extracted into columns. The full raw FHIR resource is stored intact as `jsonb`.
- **Atomic Ingest**: To ensure no partial bundle ingestion, a Pl/pgSQL function (`ingest_patient_bundle`) is used to upsert patients, prescriptions, and resources atomically in a single transaction.

## Assumptions
- **Authentication**: A single `X-API-Key` is used for the `/fhir/ingest` endpoint. Production would require proper ABDM consent artifacts, Gateway routing, and per-user JWTs.
- **RLS**: Row-Level Security is enabled but no policies are defined. The API server bypasses RLS using the `service_role` key. This prevents anonymous access directly to the DB.
- **FHIR Profiles**: Strict NRCeS validation is not performed, only basic structural checks.
- **Rx-ID Format**: Deterministic logic handles extraction from Practitioner and Organization. Where multiple Medications exist under one Encounter, a single Rx-ID is generated and assigned.
- **Pagination**: Keyset pagination via `cursor` is approximated using offset due to limitations of `supabase-py`'s query builder. 
- **Care Gaps**: Logic strictly checks SNOMED `44054006` and LOINC `4548-4` and computes gap against `as_of` (or current date if omitted).

## Not Implemented
- Real ABDM authentication/consent flows.
- OCR parsing.
- Drug-interaction checks.
