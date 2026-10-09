# Phase 2 Documentation: Unified Health Wallet

## Overview & Architecture
Phase 2 extends the Phase 1 Personal Health Record (PHR) and Clinician Point-of-Care platform with three clinical decision-support and patient empowerment engines:
1. **Care-Gap Engine v2**: Multi-rule clinical surveillance extending beyond Type 2 Diabetes to include Blood Pressure control and longitudinal systolic trend evaluation.
2. **Generic Savings Engine**: Conservative, exact-matching medicine catalog comparing prescribed formulations against the Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) generic repository with exact `Decimal` arithmetic.
3. **Scan-to-FHIR**: In-memory, privacy-preserving lab report digitization supporting both zero-cloud Mock OCR and AWS Textract with a patient review/confirmation gateway.
4. **Mock Login Shell**: Simulated ABHA OTP tabbed authentication protecting patient longitudinal access and clinician point-of-care lookups.

---

## 1. Assumptions & Design Decisions
- **Synthetic Data Exclusivity**: No real patient PHI/PII, credentials, or actual lab reports are stored, tested, or processed. All personas are synthetic demo patients (`is_demo = true`).
- **Decision-Support Language**: All clinical guidance uses non-diagnostic, advisory terminology ("may indicate", "discuss with your doctor"). It never prescribes or instructs discontinuation of therapy.
- **ABDM/NRCeS Non-Affiliation**: The system adopts "NRCeS-style" and "ABDM-compatible" FHIR R4 data models without claiming official statutory accreditation or direct ABDM gateway affiliation.
- **Jan Aushadhi vs PMJAY**: Jan Aushadhi is strictly documented as the PMBJP pharmaceutical generic scheme. It is distinct from PMJAY (Ayushman Bharat health insurance scheme).
- **In-Memory Volatility**: Uploaded laboratory images are decoded in memory, processed into temporary scan drafts, and immediately discarded. No binary images or OCR text are persisted to disk or database.
- **Financial Precision**: All calculations use Python `Decimal` with rounding to 2 decimal places (or integer paise). Floating-point math is strictly forbidden.
- **Single Idempotent Write Path**: Both initial synthetic FHIR ingestions and patient-confirmed OCR scans route through the existing transactional database layer with `source = 'ocr_scan'`.

---

## 2. API Endpoints Reference

| Endpoint | Method | Auth / Access | Rate Limit / Caps | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/demo/patients` | `GET` | Demo only (`is_demo = true`) | 60 req/min | Returns synthetic demo patient list for login persona chips. |
| `/api/patient/{abha_id}/care-gaps` | `GET` | Demo only (`is_demo = true`) | 60 req/min | Evaluates pure Care-Gap Engine v2 rules; returns gaps sorted by severity. |
| `/api/prescription/{rx_id}/savings` | `GET` | Demo only | 60 req/min | Compares prescription to Jan Aushadhi catalog; returns monthly savings. |
| `/api/fhir/scan-report` | `POST` | Demo only; IP rate-limited | 5 req/min, 50/day cap | Multipart file upload; runs OCR in memory; returns `ScanDraft` (no DB write). |
| `/api/fhir/scan-report/confirm` | `POST` | Demo only; JSON payload | 30 req/min | Reconstructs preliminary FHIR Observations server-side and writes atomically. |

All error responses strictly adhere to the standardized schema:
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation"
  }
}
```

---

## 3. Care-Gap Engine v2: Rule Definitions & Thresholds

Care gaps are evaluated as pure functions `(facts, as_of) -> list[CareGap]`.

### Rule Catalog (All Labelled as Demo Rules)
1. **`HBA1C_OVERDUE` (Severity: High)**
   - *Prerequisite*: Diagnosed Type 2 Diabetes Mellitus (SNOMED CT `44054006` or text matching).
   - *Threshold*: Last recorded HbA1c test older than **180 days** relative to `as_of` date, or missing baseline.
   - *Clearance*: Confirmed OCR scan of a recent HbA1c observation clears this gap immediately.
2. **`UNCONTROLLED_BP` (Severity: High)**
   - *Prerequisite*: Diagnosed Essential Hypertension (SNOMED CT `59621000` or `38341003`).
   - *Threshold*: Both of the 2 most recent readings satisfy `Systolic >= 140 mmHg` OR `Diastolic >= 90 mmHg`.
   - *Data Prep*: Collapses multiple same-day readings to the latest; skips entered-in-error/cancelled observations; extracts values strictly from raw component LOINC `8480-6` and `8462-4`.
3. **`BP_ELEVATED_SINGLE_READING` (Severity: Medium)**
   - *Prerequisite*: Diagnosed Hypertension with exactly 1 blood pressure reading in record.
   - *Threshold*: Reading satisfies `Systolic >= 140 mmHg` OR `Diastolic >= 90 mmHg`. Message explicitly notes insufficient history to evaluate longitudinal trend.
4. **`BP_RISING_TREND` (Severity: Medium)**
   - *Prerequisite*: Diagnosed Hypertension with at least 3 distinct daily readings.
   - *Threshold*: Systolic blood pressure is strictly increasing across the latest 3 readings ($R_2 < R_1 < R_0$) AND total rise ($R_0 - R_2$) is $\ge 10\text{ mmHg}$.

---

## 4. Generic Savings Engine: Logic & Assumptions
- **Catalog Source**: `app/data/medicine_catalog.json` validated at server startup via Pydantic model `CatalogEntry`.
- **Illustrative Prices**: Official Jan Aushadhi product lists and brand MRPs fluctuate. All entries carry `illustrative: true` and a mandatory disclaimer. Maintainers must verify prices against the official PMBJP portal prior to production use.
- **Strict Matching Rules (No Fuzzy Edit-Distance)**:
  - Drug text is normalized (lowercased, salt stripped of dosage form).
  - Matches require identical active ingredients, exact strength value & unit, and release form (`IR`, `SR`, `ER`).
  - Combination formulations (e.g. `Telmisartan + Hydrochlorothiazide`), unknown strengths, or unmatched releases are rejected into `unmatched` with an explicit reason.
- **Dosage & Quantity Math**:
  - Dosing parsed from structured FHIR `dosageInstruction[0].timing.repeat` or frequency text (`OD`, `BD`, `TDS`, `1-0-1`, `once daily`). Unrecognized frequencies assume 1 dose/day with `assumed_frequency: true`.
  - 1 Month = Standardized to 30 days.
  - Strips needed: $\text{strips} = \lceil\text{total\_units} / \text{units\_per\_strip}\rceil$ (computed independently for brand and generic packages).
  - Monthly cost: $\text{strips} \times \text{price\_per\_strip}$.
  - Savings: $\max(0, \text{monthly\_brand\_cost} - \text{monthly\_generic\_cost})$.
- **Worked Benchmark**:
  - *Telmisartan 40 mg OD*: 30 tablets/month. Brand (15/strip @ ₹220) = 2 strips = ₹440. Generic (15/strip @ ₹28) = 2 strips = ₹56. Savings = **₹384 (87.3%)**.

---

## 5. Privacy, Security & Compliance Notes
- **In-Memory Processing**: Uploaded lab report images are decoded in memory using Pillow and immediately discarded upon response. No binary files or raw OCR text dumps are stored or logged.
- **Third-Party Data Flow**: When `OCR_PROVIDER=textract`, image bytes leave the application server and are transmitted to AWS Textract. In demonstration mode, only synthetic sample images must be uploaded.
- **DPDP Act 2023 Considerations**: A real clinical deployment in India requires:
  1. Unambiguous informed consent from the data principal prior to cloud document transmission.
  2. Data Processing Agreements (DPA) with cloud vendors ensuring data residency within Indian data centers (e.g., `ap-south-1` Mumbai).
  3. Clear retention schedules and deletion guarantees.
- **Patient Confirmation Gateway**: OCR is inherently probabilistic. Scanned observations are marked `status: "preliminary"` with `meta.tag: "ocr-scan"` and explicit note `Extracted from a patient-uploaded report by OCR and confirmed by the patient.`

---

## 6. Local Testing & Verification Guide

### Path A: Default Mock Provider (Zero AWS Account Needed)
1. Ensure `.env` has `OCR_PROVIDER=mock`.
2. Start the FastAPI backend:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
3. Test Scan Extraction endpoint:
   ```bash
   curl -s -X POST http://localhost:8000/api/fhir/scan-report \
     -F "file=@fixtures/sample-lab-report.png" \
     -F "abha_id=91-1234-5678-9012" | jq .
   ```
   *Expected Output (Abbreviated)*:
   ```json
   {
     "provider": "mock",
     "report_date": "2024-10-20",
     "items": [
       { "test_key": "hba1c", "display": "HbA1c (Glycated Hemoglobin)", "value": 7.2, "unit": "%", "needs_review": false },
       { "test_key": "fasting_glucose", "value": 118.0, "unit": "mg/dL", "needs_review": false },
       { "test_key": "tsh", "value": 2.9, "unit": "u[IU]/mL", "needs_review": false }
     ]
   }
   ```
4. Confirm extraction to create FHIR Observations:
   ```bash
   curl -s -X POST http://localhost:8000/api/fhir/scan-report/confirm \
     -H "Content-Type: application/json" \
     -d '{
       "abha_id": "91-1234-5678-9012",
       "effective_date": "2024-10-20",
       "items": [
         {"test_key": "hba1c", "value": 7.2, "unit": "%"}
       ],
       "acknowledged": true
     }' | jq .
   ```
5. Check that `HBA1C_OVERDUE` has cleared:
   ```bash
   curl -s http://localhost:8000/api/patient/91-1234-5678-9012/care-gaps | jq '.[].code'
   ```
   *Expected Output*: `"UNCONTROLLED_BP"`, `"BP_RISING_TREND"` (Notice `HBA1C_OVERDUE` is gone).

### Path B: Real AWS Textract Configuration
1. Create an AWS IAM user/role with only `textract:AnalyzeDocument` permissions.
2. In `.env`, set:
   ```bash
   OCR_PROVIDER=textract
   AWS_REGION=ap-south-1
   # Use AWS CLI credentials or specify:
   AWS_ACCESS_KEY_ID=<YOUR_KEY>
   AWS_SECRET_ACCESS_KEY=<YOUR_SECRET>
   ```
3. Run the curl command in Path A with `fixtures/sample-lab-report.png`. AWS Textract will analyze tables and forms dynamically.

---

## 7. 90-Second Demonstration Script

1. **Simulated Login**:
   - Open browser to `http://localhost:5173/`. User lands on the Mock Login shell.
   - Click the **Ramesh Kumar** demo chip (`91-1234-5678-9012`).
   - Click **Send OTP**. After a 1-second simulated delay, enter demo OTP `123456` and click **Verify**.
2. **Care-Gap Surveillance**:
   - Landing on the Patient Dashboard, observe three care-gap alerts:
     - `Overdue HbA1c Monitoring` (High)
     - `Uncontrolled Blood Pressure` (High - readings 148/92 and 142/90)
     - `Rising Blood Pressure Trend` (Medium - systolic rose 134 -> 142 -> 148 mmHg)
3. **Scan-to-FHIR Demonstration**:
   - Click **Scan lab report** in the header.
   - Click **Use Sample Report** to load the synthetic lab report (dated 20/10/2024 with HbA1c 7.2%).
   - Review extracted items, review confidence badges, check the confirmation box, and click **Confirm & Save to FHIR**.
   - Notice the toast confirmation and observe that `HBA1C_OVERDUE` immediately disappears from the dashboard, leaving only the blood pressure alerts!
4. **Generic Savings Engine**:
   - Scroll down to the latest consultation encounter.
   - Expand the **Jan Aushadhi Generic Savings Card** to view:
     - Telmisartan 40 mg: Brand ₹440 vs Generic ₹56 (₹384 / 87.3% savings).
     - Metformin 500 mg: Brand ₹210 vs Generic ₹45 (₹165 / 78.6% savings).
     - Total monthly savings: ₹549.00.
5. **Clinician Point-of-Care**:
   - Switch to Clinician view and search speakable Rx-ID `APL-RR-1410-RAME`.
   - Prescription details, encounter context, and generic savings breakdown load instantly.
6. **Offline Resilience**:
   - In the top navigation bar, toggle the Data Source dropdown from **Live** to **Offline NRCeS Bundle**.
   - Stop the backend server (`Ctrl+C`).
   - The frontend remains 100% interactive using pre-computed offline demo fixtures.
