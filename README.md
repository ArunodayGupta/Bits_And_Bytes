# 🛡️ HealthSafe – Unified Health Wallet & Clinical Consultation Suite

> **Zero-Trust, Patient-Owned Longitudinal Health Record Platform built on HL7 FHIR R4 & India's ABDM / NRCeS Standards.**  
> Featuring deterministic speakable prescription tokens (**Rx-ID**), Point-of-Care Clinician Lookup, Clinical Care-Gap Engine v2, Pradhan Mantri Jan Aushadhi (PMBJP) Generic Savings Engine, AI Scan-to-FHIR Lab Digitization, and Native Android App with automated GitHub Release APKs.

[![GitHub Release](https://img.shields.io/github/v/release/ArunodayGupta/Bits_And_Bytes?include_prereleases&color=059669&label=Release%20APK)](https://github.com/ArunodayGupta/Bits_And_Bytes/releases)
[![Android](https://img.shields.io/badge/Platform-Android%207.0%2B%20(API%2024%2B)-3DDC84?logo=android&logoColor=white)](https://github.com/ArunodayGupta/Bits_And_Bytes/releases)
[![Jetpack Compose](https://img.shields.io/badge/UI-Jetpack%20Compose%20%7C%20Material%203-4285F4?logo=jetpackcompose&logoColor=white)](https://developer.android.com/jetpack/compose)
[![HL7 FHIR R4](https://img.shields.io/badge/Standard-HL7%20FHIR%20R4%20%7C%20NRCeS-E11D48)](https://nrces.in/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Web-React%2018%20%7C%20TypeScript%20%7C%20Tailwind-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Live Deployment](https://img.shields.io/badge/Live%20App-Vercel-black?logo=vercel&logoColor=white)](https://bits-and-bytes-ldox.vercel.app/)

---

## 🌐 Live Web App, Video Demo & Release APK

- 🌐 **Live Web Application**:  
  👉 **[https://bits-and-bytes-ldox.vercel.app/](https://bits-and-bytes-ldox.vercel.app/)**
- 🎬 **Watch App Video Demo**:  
  👉 **[Submit / View Video Demo (Google Form Link)](https://docs.google.com/forms/d/e/1FAIpQLSdGGcpgudhHGk-Etcpt1cgaMe7NkxtUMQIFjuO4kq5v4suKGQ/viewform)**
- 📱 **Download Android Release APK**:  
  👉 **[Download Latest APK from GitHub Releases](https://github.com/ArunodayGupta/Bits_And_Bytes/releases)**  
  *(Ready-to-install `HealthSafe-v1.0.0.apk` signed and compatible with Android 7.0+ / API 24+)*

---

## 🚨 Problem Statement: "Lost in Transit"
### Fragmented Medical Records & Repeated Care Across Healthcare Providers

Patients with chronic and long-term conditions (such as diabetes, hypertension, asthma, and thyroid disorders) frequently consult multiple specialists across private clinics, diagnostic centres, hospitals, and retail pharmacies.

### Core Challenges
1. **Scattered Records**: Diagnostic lab reports, handwritten prescriptions, scans, and discharge summaries sit in disparate folders, messaging chats, or physical paper bags.
2. **Unreliable Recall**: During hurried 5-minute consultations, patients struggle to recall specific dosages, past adverse reactions, and prior diagnoses.
3. **Redundant Tests & Conflicting Treatment**: Without instant prior results, clinicians repeat costly blood panels and inadvertently prescribe duplicate or conflicting medications.
4. **Insecure Record Sharing**: Forwarding photo reports over unsecured chat channels compromises sensitive patient confidentiality.
5. **Broken Continuity of Care**: When patients relocate or present at an emergency room, doctors are forced to diagnose blind without prior longitudinal context.

### The HealthSafe Solution
HealthSafe provides a **single, tamper-proof, chronological health record** linked to the patient's Ayushman Bharat Health Account (**ABHA ID**). Patients retain 100% cryptographic data ownership and share read-only consultation access through temporary, speakable tokens (e.g., `RX-7F3A-9K2M`) that automatically expire.

---

## ✨ Key Capabilities & System Features

### 1. 📑 Patient Longitudinal Timeline (HL7 FHIR R4)
- **Zero Physical Files**: Consolidates hospital visits, blood glucose HbA1c tests, lipid panels, and clinic notes into an interactive chronological stream.
- **Biomarker Trends**: Color-coded alert ranges (normal / out-of-range) mapped directly to LOINC and SNOMED-CT clinical ontologies.
- **Official ABHA ID Onboarding**: One-tap deep-link to create official Ayushman Bharat IDs at the [National Health Authority Portal](https://abha.abdm.gov.in/abha/v3/).

### 2. 🔐 Unguessable Speakable Prescription Tokens (Rx-ID)
- **Zero Credential Sharing**: Patients never hand over unlocked phones or account credentials.
- **Deterministic 8-Character Tokens**: High-entropy speakable codes (`RX-XXXX-XXXX`) generated using CSPRNG pools (excluding visually ambiguous glyphs like `0/O` and `1/I`).
- **Granular Consultation Access**: Confers temporary, read-only EHR access strictly for the duration of the clinical consultation.

### 3. 🩺 Doctor Consultation Suite & E-Prescription Writer
- **Instant EHR Lookup**: Clinicians verify patient history by entering the patient's Rx Code or 14-digit ABHA ID.
- **Tamper-Proof E-Prescriptions**: Doctors prescribe medications with multi-line clinical assessments, dosage, frequency, and instructions, instantly issuing verifiable digital prescriptions.
- **Verified Clinical Credentials**: Verification badges matching National Medical Commission (NMC) registration numbers.

### 4. 💊 Generic Medicine Savings Engine (PMBJP Jan Aushadhi)
- **Up to 85% Cost Reduction**: Automatically matches expensive branded medications with government-certified Pradhan Mantri Bhartiya Janaushadhi Pariyojana (**PMBJP**) chemical bioequivalents.
- **Instant Monthly Savings Calculator**: Real-time breakdown of recurring drug expenses, strip prices, and nearest Jan Aushadhi Kendra dispensary mapping.

### 5. 📷 Smart Lab Report Digitization (Scan-to-FHIR OCR)
- **High-Precision Medical OCR**: Ingests test papers and camera snapshots, extracts biomarker values (e.g., LDL, Fasting Blood Sugar, HbA1c), and reconstructs standard FHIR `Observation` bundles on-device.

### 6. 📱 Native Android Experience (Jetpack Compose)
- **Smooth 60 FPS UI**: Zero-lag reactive architecture with Material 3 styling and seamless dark/light mode switching.
- **Direct Hardware Integration**: Camera intake, clipboard sharing, and edge-to-edge system navigation.
- **Automated CI/CD**: Signed APK generation via GitHub Actions on every release.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Mobile App (Android)** | Kotlin 2.0, Jetpack Compose, Material 3, Coroutines, StateFlow, Navigation Compose, LocalUriHandler |
| **Web Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Vitest, Happy-DOM |
| **Backend API** | FastAPI, Python 3.10+, Uvicorn, Pydantic v2, Pytest |
| **Healthcare Standards** | HL7 FHIR R4, ABDM (NHA), LOINC, SNOMED-CT, PMBJP Jan Aushadhi Drug Catalog |
| **Data & Storage** | PostgreSQL, Supabase, Encrypted In-Memory Fallback, Offline-First Dataset |
| **DevOps & CI/CD** | GitHub Actions, Gradle 8.9 Wrapper, OpenJDK 21, Render (API), Vercel (Web) |

---

## 📁 Repository Structure

```
BitsAndBytes/
├── .github/
│   └── workflows/
│       └── android-release.yml   # Automated GitHub Release & APK build pipeline
│
├── android/                      # Native Android Mobile Application
│   ├── app/
│   │   ├── src/main/java/com/healthsafe/app/
│   │   │   ├── MainActivity.kt               # Entrypoint & edge-to-edge Compose host
│   │   │   ├── ui/components/                # TopBar, Badges, Logo, CareGapBanner, RxCard
│   │   │   ├── ui/model/                     # Domain models, SampleData, PatientProfile
│   │   │   ├── ui/navigation/                # Type-safe Compose NavGraph & destinations
│   │   │   ├── ui/screens/                   # Landing, Login, Patient, Doctor, Physician, Admin
│   │   │   └── ui/theme/                     # Colors (Moss palette), Typography, Shapes
│   │   └── build.gradle.kts                  # Android application dependencies & signing
│   ├── build.gradle.kts                      # Root Gradle build script
│   └── gradlew / gradlew.bat                 # Gradle wrapper executables
│
├── frontend/                     # React 18 + Vite Web Application
│   ├── src/
│   │   ├── pages/                            # PatientView, DoctorView, PhysicianView, AdminView, LoginPage, LandingPage
│   │   ├── components/                       # Timeline, ResourceSheet, ScanDialog, SavingsCard
│   │   ├── context/                          # AuthContext, PatientDataContext
│   │   └── lib/fhir/                         # FHIR R4 timeline builder, PDF exporter
│   └── package.json                          # Web dependencies and test runners
│
├── backend/ & app/               # FastAPI Backend & Data Layer
│   ├── app/routers/                          # Patients, Prescriptions, Scan, Demo endpoints
│   ├── app/services/                         # Care-gap engine v2, Savings service, OCR pipeline
│   ├── app/data/                             # PMBJP medicine catalog & fixtures
│   └── supabase/                             # Idempotent database migrations
│
└── tests/                        # Automated Pytest and Vitest test suites
```

---

## ⚡ Quick Start Guide

### 1. 📱 Install Android App (Direct APK Download)
1. Navigate to **[GitHub Releases](https://github.com/ArunodayGupta/Bits_And_Bytes/releases)**.
2. Download **`HealthSafe-v1.0.0.apk`**.
3. Open the file on any Android device running **Android 7.0 (Nougat) or newer** and tap Install.

#### Build Android App from Source:
```bash
# Set Java 21 environment
cd android

# Build Debug APK
./gradlew assembleDebug

# Build Signed Release APK
./gradlew assembleRelease

# Install directly to connected USB device:
./gradlew installDebug
```
*Output APK location*: `android/app/build/outputs/apk/release/app-release.apk`

---

### 2. 💻 Run the Web Application
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
# or: npm --prefix frontend run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

### 3. 🐍 Run the Python FastAPI Backend
```bash
# Setup Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger API documentation: **[http://localhost:8000/docs](http://localhost:8000/docs)**.

---

## 🧪 Automated Testing & Verification

```bash
# Run Backend Pytest Suite (26 tests)
python -m pytest tests

# Run Frontend Vitest Suite (41 tests)
npm --prefix frontend test

# Run Secret Scanner (Ensures zero leaked credentials in bundles)
npm run check:secrets
```

---

## 🔒 Security, Consent & Privacy Architecture

- **Zero Unencrypted Forwarding**: Health data is decrypted on-demand via authenticated tokens and never exported through unencrypted third-party chats.
- **Ephemeral Doctor Tokens**: Prescription tokens expire automatically after clinical consultation, ensuring patients never leave open backdoors into their EHR.
- **ABDM Compliance**: Strictly aligns with the National Health Authority's consent artifact specifications and FHIR R4 profile definitions.
- **Offline Resilience**: When server connectivity is unavailable, the application gracefully functions in zero-connectivity mode using synthetic on-device patient fixtures.

---

## 👥 Authors & Acknowledgments

Developed with ❤️ for the Hackathon.  
- **Team**: Bits & Bytes  
- **Live Deployment**: [https://bits-and-bytes-ldox.vercel.app/](https://bits-and-bytes-ldox.vercel.app/)  
- **Submission Demo**: [Google Form Video Submission](https://docs.google.com/forms/d/e/1FAIpQLSdGGcpgudhHGk-Etcpt1cgaMe7NkxtUMQIFjuO4kq5v4suKGQ/viewform)  
- **Releases**: [HealthSafe Android APK Releases](https://github.com/ArunodayGupta/Bits_And_Bytes/releases)
