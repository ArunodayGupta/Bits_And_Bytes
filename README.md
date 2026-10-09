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
