# Unified Health Wallet - Backend (Phase 1)

This is the FastAPI backend for the Unified Health Wallet, handling FHIR R4 (ABDM/NRCeS style) ingestion, longitudinal timeline retrieval, and care gap evaluation.

## Prerequisites

- Python 3.10+
- A Supabase project (hosted or local)

## Setup

1. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```

   *Alternatively, if you prefer using the Node.js scripts for seeding:*
   ```bash
   npm run db:seed
   ```
   Ingests 6 comprehensive synthetic consultation bundles into Supabase and primes `offline_bundles`:
   - **Ramesh Kumar** (`91-1234-5678-9012`): T2DM + Essential HTN, Apollo Hospitals, Dr. Rajesh Rao, Metformin + Telmisartan (`APL-RR-1410-RAME`), HbA1c 8.4% (Moderate Care Gap)
   - **Priya Sharma** (`91-2345-6789-0123`): T2DM + Hypothyroidism, Fortis Healthcare, Dr. Sunita Sharma, Levothyroxine + Metformin (`FRT-SS-1809-PRIY`), HbA1c 6.4% (Controlled)
   - **Arun Patel** (`91-3456-7890-1234`): CAD + Dyslipidemia + HTN, Manipal Hospital, Dr. Amit Sen, Atorvastatin + Amlodipine + Aspirin (`MNP-AS-0511-ARUN`), Total Cholesterol 242 mg/dL
   - **Sunita Verma** (`91-4567-8901-2345`): Bronchial Asthma + Allergic Rhinitis, MedCare Clinic, Dr. Priya Nair, Budesonide/Formoterol + Montelukast (`MDC-PN-1208-SUNI`), Peak flow 340 L/min
   - **Vikram Malhotra** (`91-5678-9012-3456`): T2DM + CKD Stage 2 + Nephropathy, AIIMS, Dr. Rajesh Rao, Empagliflozin + Linagliptin (`AMS-RR-2207-VIKR`), No HbA1c test (High Care Gap)
   - **Ananya Deshmukh** (`91-6789-0123-4567`): T2DM + HTN + Knee Osteoarthritis, Apollo Hospitals, Dr. Rajesh Rao, Glimepiride/Metformin + Paracetamol (`APL-RR-1410-ANAN`), HbA1c 9.2% (Severe Care Gap)

   **Run Backend Integration Tests**:
   ```bash
   npm run test:backend
   ```

2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. Configure Supabase:
   - Run the SQL in `backend/supabase/schema.sql` in your Supabase SQL editor.
   - Copy `.env.example` to `.env`:
     ```bash
     cp backend/.env.example backend/.env
     ```
   - Fill in your `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and set a random `API_INGEST_KEY`.

4. Run the server:
   ```bash
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

5. Seed sample data:
   ```bash
   python -m scripts.seed
   ```

## Smoke Test (curl)

**1. Ingest (replace YOUR_API_KEY):**
```bash
curl -X POST "http://localhost:8000/api/fhir/ingest?demo=true" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @fixtures/ramesh-kumar.bundle.json
```
*Expected: `{"abha_id": "91-1234-5678-9012", "patient_id": "...", "rx_ids": ["APL-RR-1410-RAME"], "counts": {...}, "skipped": {}, "warnings": []}`*

**2. Timeline:**
```bash
curl "http://localhost:8000/api/patient/91-1234-5678-9012/timeline"
```
*Expected: JSON with `items` array and `next_cursor`.*

**3. Prescription Lookup:**
```bash
curl "http://localhost:8000/api/prescription/APL-RR-1410-RAME"
```
*Expected: JSON with `rx_id`, medications, encounter, and patient (no phone number).*

**4. Care Gaps:**
```bash
curl "http://localhost:8000/api/patient/91-1234-5678-9012/care-gaps"
```
*Expected: `[{"code": "HBA1C_OVERDUE", "severity": "high", "days_since": ..., "last_value": "8.1 %", ...}]`*

**5. Demo Bundle:**
```bash
curl "http://localhost:8000/api/demo/bundle"
```

**6. Health:**
```bash
curl "http://localhost:8000/api/health"
```
*Expected: `{"status": "ok", "db": "ok", "version": "1.0.0"}`*
