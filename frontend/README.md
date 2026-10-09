# HealthSafe – Patient-Owned Medical Records (ABDM / NRCeS)

> A zero-trust, patient-owned longitudinal health record dashboard built on **FHIR R4** and India's **ABDM / NRCeS** standards, featuring deterministic speakable prescription tokens (**Rx-ID**) and a clinician point-of-care verification portal.

Built with the **"Verdant Clinical"** aesthetic: botanical editorial warmth, Instrument Serif typography, frosted glass surfaces, and warm dark-glass developer tools.

---

## ⚡ Tech Stack

- **Framework**: Vite + React 18 + TypeScript (strict mode)
- **Styling**: Tailwind CSS + Custom Verdant Clinical design tokens
- **Components**: Accessible Radix UI primitives (Dialog/Sheet, Select, Tooltip, Tabs, Slot)
- **Typography**: Google Fonts (*Instrument Serif*, *Hanken Grotesk*, *IBM Plex Mono*)
- **Icons**: `lucide-react`
- **Charts**: `recharts` for longitudinal biomarker trend sparklines
- **Testing**: `vitest` unit test suite (33 passing unit tests + 9 integration tests)
- **Database & Data Layer**: Supabase (PostgreSQL 15), atomic FHIR R4 ingestion RPC, Row-Level Security (RLS) enforcement, speakable Rx-ID registry, and clinical care gap signals. See [DATA_LAYER.md](file:///c:/Users/piyus/OneDrive/Desktop/BitsAndBytes/docs/DATA_LAYER.md) for full technical documentation.
- **Architecture**: Dual-mode — supports zero-trust 100% offline demo mode as well as full Supabase PostgreSQL cloud/local database backing.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Unit Tests
```bash
npm test
```
Executes all 21 unit tests covering timeline grouping, Rx-ID generation, clinician search normalisation, and HAPI FHIR offline fallback.

### 4. Code Quality & Production Build
```bash
npm run lint    # oxlint: 0 errors, 0 warnings
npm run build   # TypeScript strict compilation & Vite bundle
```

---

## 🎬 3-Minute Hackathon Demo Script

### **Minute 1: The Patient Longitudinal Timeline (`/patient`)**
1. **Header & Profile**: Notice patient Ramesh Kumar (54, Male) with his verified ABHA number `91-1234-5678-9012`.
2. **Dynamic Metrics**: The header displays live counts of Encounters (6), Active Conditions (3), Prescriptions (4), and Lab Biomarkers (10) extracted across 2021–2026.
3. **Timeline & Grouping**:
   - Scroll down the vertical moss spine. Notice that events on **14 Oct 2024** (Apollo consultation, diagnostic lab, HbA1c test, and 3 prescriptions) are automatically grouped under a single date node.
   - Observe the multi-facility attribution pills (e.g. *Apollo Hospitals Chennai*, *MedCare Family Clinic*, *Aarthi Diagnostics Lab*).
4. **Biomarker Trends**: Notice the mini sparkline charts tracking **HbA1c** (improving from 8.2% to 6.7%) and **Systolic Blood Pressure** with UCUM units and delta indicators.
5. **Interactive Filtering**: Click filter chips (**Medications**, **Labs**, **Conditions**, **Encounters**) or type into the search bar (e.g. "Metformin" or "Hypertension").

---

### **Minute 2: Standards & Resource Inspector (FHIR R4 Deep-Dive)**
1. **Open Inspector**: Click any timeline event card (e.g. *Metformin 500 mg oral tablet* or *HbA1c*).
2. **Right-Hand Sheet**: A 560px dark-glass panel slides in smoothly from the right.
3. **Standards Panel**:
   - **Declared Profiles**: Displays verified NRCeS StructureDefinitions (e.g., `https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationRequest`).
   - **Basic structural check**: Confirms valid FHIR R4 schema compliance.
   - **Terminology Badges**: Maps raw URIs to readable labels (**SNOMED CT**, **LOINC**, **UCUM**, **ABDM**).
4. **Custom Dark JSON Viewer**:
   - Colorized syntax (sage keys, cream strings, gold numbers).
   - Gold border highlight on lines containing `meta.profile`, `code`, and `system`.
   - Click **"Copy JSON"** to copy the exact payload. Press `Esc` or click `✕` to dismiss.

---

### **Minute 3: Speakable Rx-ID & Clinician Lookup (`/clinician`)**
1. **Speakable Rx-ID**:
   - On the *Metformin* card, highlight the dashed badge: `APL-RR-1410-RAME`.
   - Explain format: Hospital abbreviation (`APL` = Apollo Hospitals) + Doctor initials (`RR` = Dr. Rajesh Rao) + Day/Month (`1410` = 14 Oct) + Patient name (`RAME` = Ramesh).
   - Click **"Speak it"** to reveal the phonetic readout: *"A P L, R R, one four one zero, R A M E"*.
   - Click the badge to copy the token.
2. **Switch to Clinician View**: Click **"Clinician Lookup"** in the floating top navbar.
3. **Instant Lookup**:
   - Paste `APL-RR-1410-RAME` (or try without hyphens: `APLRR1410RAME`, or lowercase) into the 64px search input and hit `Enter`. Or click the **"Try sample"** chip.
4. **Digital Prescription Card**:
   - Displays a paper prescription card with perforated edges and an authentic `℞` serif watermark.
   - Shows medication, dosage instructions, prescriber, date, and facility.
   - Beside it, displays patient demographic card and parent encounter card.
5. **Privacy Containment & Consent Gate**:
   - Notice the outlined button: **"View full longitudinal history (Requires patient consent)"** (disabled).
   - Explain that Rx-IDs provide strictly scoped, single-encounter read access to prevent over-sharing.
   - Review the footer disclaimer: *"Demo only: Rx-ID lookup is not access control. Production sharing would use ABDM consent artefacts, short expiry and audit logs."*
6. **Data Source Toggle**:
   - Click the Data Source dropdown in the navbar and select **"Live HAPI FHIR"**.
   - If the public server is offline or times out (8s limit), the system automatically falls back to the offline bundle with a non-blocking amber status chip and toast banner. The screen never crashes or turns blank.

---

## 💡 Assumptions & Design Decisions

1. **Zero-Cloud & Browser Isolation**: All state is held in React Context in memory. No persistent storage or cookies are used for patient data, preventing leakage on shared demo machines.
2. **Offline-First Resilience**: Defaulting to the offline NRCeS bundle ensures the demo functions smoothly in environments with spotty or disabled Wi-Fi.
3. **Consonant-Preferring Hospital Abbreviation**: To avoid uninformative abbreviations (e.g. `APO` for Apollo or `MED` for MedCare), we extract the first letter and the next two consonants (e.g. `APL`, `MDC`), falling back to remaining characters.
4. **Collision Handling**: If two prescriptions from the same doctor/hospital/date for the same patient occur, deterministic suffixes (`A`, `B`, ...) are appended to ensure unambiguous routing.
5. **Defensive Parsing**: Unknown dates default to an `'Undated'` bucket placed at the timeline's end. Missing codings fall back to `.text` or concept fallbacks.

---

## 🔮 Phase 2 Roadmap & Ideas

1. **OCR Prescription & Lab Ingestion**: Browser-based WebAssembly OCR (or Gemini Multimodal API) to ingest photographed paper prescriptions directly into NRCeS FHIR bundles.
2. **Duplicate-Drug & Interaction Alerts**: Leverage the intentional seed data in `/public/op-consultation.json` (where Metformin 500mg from Apollo overlaps with Metformin SR 500mg from MedCare Clinic) to highlight duplicate therapeutic class warnings.
3. **ABDM Consent Artefact Integration**: Implement cryptographic 24-hour time-limited consent tokens signed via ABDM Gateway APIs, with paramedic break-glass override.
4. **Emergency Medical Lockscreen Card**: Downloadable PDF/Apple Wallet pass summarizing blood group, drug allergies, and active medications.
