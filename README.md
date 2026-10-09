# HealthSafe – Unified Health Wallet (Phase 1 & Phase 2)

> A zero-trust, patient-owned longitudinal health record dashboard built on **HL7 FHIR R4** and India's **ABDM / NRCeS** standards, featuring deterministic speakable prescription tokens (**Rx-ID**), clinician point-of-care verification, Clinical Care-Gap Engine v2, Generic Medicine Savings Engine (PMBJP Jan Aushadhi), and in-memory Scan-to-FHIR lab digitization.

---

## 📁 Repository Structure

```
BitsAndBytes/
├── app/                    # FastAPI Phase 2 application
│   ├── data/               # PMBJP Jan Aushadhi generic catalog (`medicine_catalog.json`)
│   ├── routers/            # demo, patients, prescriptions, scan endpoints
│   ├── services/           # care_gaps, savings_service, ocr_service
│   └── utils/              # lab_catalog, db connector with fallback
│
├── frontend/               # React 18 + Vite + Tailwind CSS frontend application
│   ├── src/                # Patient dashboard, Clinician lookup, Mock login shell, Scan modal
│   ├── public/             # Static assets, synthetic lab reports, and offline fixtures
│   └── package.json        # Frontend scripts and dependencies
│
├── backend/                # PostgreSQL & Supabase data layer and testing suite
│   ├── supabase/           # SQL migrations (Phase 1 + Phase 2 idempotency)
│   ├── src/lib/            # Ingestion pipeline, Rx-ID generator, care gap engine
│   ├── scripts/            # Database seed script (`seed.ts`)
│   ├── fixtures/           # Synthetic consultation bundles
│   └── docs/DATA_LAYER.md  # Comprehensive schema documentation
│
├── docs/
│   ├── DATA_LAYER.md       # Phase 1 data layer specifications
│   └── PHASE2.md           # Phase 2 architecture, math, endpoints, and demo script
│
├── fixtures/               # Sample synthetic lab report PNG
├── scripts/                # Utility scripts: make_sample_report, export_demo_assets, reset_demo
├── shared/test-vectors/    # Shared parity test vectors for care-gap rules (Python & TypeScript)
└── tests/                  # Pytest test suite for Phase 2 services and endpoints
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
# Node dependencies (frontend & backend workspaces)
npm install

# Python backend dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 2. Run the FastAPI Backend
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Run the Frontend (Vite Dev Server)
```bash
npm run dev
# or: npm --prefix frontend run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to experience the Mock Login shell, Patient Longitudinal Timeline, and Clinician Point-of-Care Search.

---

## 🧪 Testing Suites

### Python Backend Test Suite (pytest)
```bash
python -m pytest tests
```
Runs 26 automated unit and endpoint tests covering:
- Care-gap engine v2: BP extraction, uncontrolled BP, elevated single reading, rising systolic trend, and HbA1c clearance.
- Generic savings engine: Exact drug matching, alias resolution, combination product rejection, and Decimal strip calculations.
- Scan-to-FHIR: Mock OCR provider, day-first date parsing, plausibility checks, and server-side FHIR Observation reconstruction.
- Secret prevention: Automated scanning ensuring no real AWS or Supabase credentials exist in configuration templates.

### Frontend Test Suite (vitest)
```bash
npm --prefix frontend test
```
Runs 41 automated tests in happy-dom covering:
- Mock login shell: ABHA auto-formatting, demo chips, simulated OTP, AuthContext sessionStorage persistence.
- Scan dialog: Sample report loading, review checklist, needs-review acknowledgment, and care-gap clearance.
- Generic savings card: Matched/unmatched drugs, caution callouts (Levothyroxine), and illustrative badges.
- TypeScript care gap engine parity against `shared/test-vectors/care-gaps.json`.

### Secret Scanner
```bash
npm run check:secrets
```
Verifies that `.env.example` templates and built frontend bundles in `dist/` contain no private keys, AWS access keys, or service-role tokens.

---

## 🗄️ Database & Offline Resilience

- **SQL Migrations**: `supabase/phase2.sql` contains idempotent DDL adding the `source` column to `fhir_resources` and updating `access_logs`.
- **Offline First**: Unified Health Wallet is designed for zero-downtime resilience. When the backend or database is unreachable, the frontend seamlessly functions using the bundled synthetic offline dataset and pre-computed demo assets.

See [docs/PHASE2.md](file:///c:/Users/piyus/OneDrive/Desktop/BitsAndBytes/docs/PHASE2.md) for full architectural assumptions, privacy safeguards, and a 90-second judge demo script.
