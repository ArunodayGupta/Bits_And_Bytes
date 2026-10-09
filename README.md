# HealthSafe – Patient-Owned Medical Records (ABDM / NRCeS)

> A zero-trust, patient-owned longitudinal health record dashboard built on **FHIR R4** and India's **ABDM / NRCeS** standards, featuring deterministic speakable prescription tokens (**Rx-ID**), clinician point-of-care verification, and PostgreSQL / Supabase clinical data persistence.

---

## 📁 Repository Structure

The project is structured into clean **`frontend/`** and **`backend/`** workspaces, enabling independent development and immediate deployment to Vercel.

```
BitsAndBytes/
├── frontend/               # Standalone React 18 + Vite + Tailwind CSS frontend application
│   ├── src/                # Patient dashboard, Clinician lookup, and Landing page
│   ├── public/             # Static assets and offline consultation fixtures
│   ├── package.json        # Frontend scripts and dependencies
│   └── vite.config.ts      # Vite configuration
│
├── backend/                # PostgreSQL & Supabase data layer and testing suite
│   ├── supabase/           # SQL migrations (tables, RLS, SECURITY DEFINER RPCs)
│   ├── src/lib/            # Ingestion pipeline, Rx-ID generator, care gap engine
│   ├── scripts/            # Database seed script (`seed.ts`)
│   ├── fixtures/           # Synthetic Ramesh Kumar consultation bundle
│   ├── tests/              # Unit & live Supabase integration tests
│   ├── docs/DATA_LAYER.md  # Comprehensive schema and data layer documentation
│   └── package.json        # Backend scripts (`db:seed`, `test`, `typecheck`)
│
├── package.json            # Monorepo root with unified workspaces and convenience scripts
├── vercel.json             # Vercel deployment configuration
└── .gitignore              # Multi-workspace security and credentials ignore rules
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Frontend (Vite Dev Server)
```bash
npm run dev
# or: npm --prefix frontend run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to experience the landing page, patient timeline, and clinician lookup.

### 3. Run All Tests
```bash
npm test
```
Executes both test suites:
- **Frontend** (`frontend/src/test/`): Timeline date grouping, search normalisation, offline bundle fallback.
- **Backend** (`backend/tests/`): FHIR R4 parsing, blood pressure combining, clinical care-gap evaluation, speakable Rx-ID generation, and live Supabase RLS verification.

---

## 🗄️ Backend & Supabase Setup

The backend data layer is fully documented in [backend/docs/DATA_LAYER.md](file:///c:/Users/piyus/OneDrive/Desktop/BitsAndBytes/backend/docs/DATA_LAYER.md).

### Applying Migrations & Seeding
1. **Apply Migrations**: Copy and run the migrations in your Supabase SQL Editor:
   - `backend/supabase/migrations/0001_init.sql` (Tables, indexes, triggers)
   - `backend/supabase/migrations/0002_rls_and_rpc.sql` (RLS policies, SECURITY DEFINER RPCs)
2. **Seed Data**:
   ```bash
   npm run db:seed
   ```
   Ingests the synthetic consultation bundle for Ramesh Kumar (ABHA `91-1234-5678-9012`), generating `APL-RR-1410-RAME` and priming the `sample-diabetic-patient` cache.
3. **Run Backend Integration Tests**:
   ```bash
   npm run test:backend
   ```

---

## 🚀 Deployment to Vercel

This repository is pre-configured for instant zero-configuration deployment to **Vercel** via the root [vercel.json](file:///c:/Users/piyus/OneDrive/Desktop/BitsAndBytes/vercel.json):

1. **Import the repository** into Vercel.
2. The root `vercel.json` automatically configures:
   - **Framework**: Vite
   - **Install Command**: `npm --prefix frontend install`
   - **Build Command**: `npm --prefix frontend run build`
   - **Output Directory**: `frontend/dist`
3. Add the public Supabase environment variables in the Vercel Dashboard:
   - `VITE_SUPABASE_URL`: `https://<your-project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJ...`
4. Click **Deploy**!
