import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { PatientDataProvider } from '@/context/PatientDataContext';
import { PatientView } from '@/pages/PatientView';
import { PhysicianView } from '@/pages/PhysicianView';
import { DoctorView } from '@/pages/DoctorView';
import { AdminView } from '@/pages/AdminView';

describe('Clinical Views Rendering & Flow Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PatientView without error boundary crash', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/bundle')) {
        return new Response(JSON.stringify({
          resourceType: 'Bundle',
          type: 'collection',
          entry: [
            {
              resource: {
                resourceType: 'Patient',
                id: 'patient-1',
                name: [{ text: 'Ramesh Kumar' }],
                identifier: [{ system: 'https://healthid.ndhm.gov.in', value: '91-1234-5678-9012' }],
                gender: 'male',
                birthDate: '1972-04-10',
              },
            },
            {
              resource: {
                resourceType: 'Condition',
                id: 'cond-1',
                code: { text: 'Type 2 Diabetes Mellitus' },
                clinicalStatus: { coding: [{ code: 'active' }] },
                recordedDate: '2023-01-15',
              },
            },
          ],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes('/care-gaps')) {
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <PatientDataProvider>
            <PatientView />
          </PatientDataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Clinical history/i)).toBeTruthy();
    expect(screen.getByText(/Encounters/i)).toBeTruthy();
    expect(screen.getByText(/Active conditions/i)).toBeTruthy();
    expect(screen.getByText(/Medications/i)).toBeTruthy();
  });

  it('renders PhysicianView with backend savings response shape without throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/savings')) {
        return new Response(JSON.stringify({
          rx_id: 'APL-RR-1410-RAME',
          medications: [
            {
              prescribed_drug: 'Telmisartan 40 mg oral tablet',
              salt: 'Telmisartan',
              generic_alternative: 'Jan Aushadhi Telmisartan 40mg',
              monthly_savings_rupees: '384.00',
              savings_percentage: '87.3',
              monthly_cost_brand: '440.00',
              monthly_cost_generic: '56.00',
              doses_per_day: 1,
              assumed_frequency: false,
              caution: null,
              price_as_of: '2024-10-01',
              illustrative: true,
            },
            {
              prescribed_drug: 'Metformin 500 mg oral tablet',
              salt: 'Metformin',
              generic_alternative: 'Jan Aushadhi Metformin 500mg',
              monthly_savings_rupees: '165.00',
              savings_percentage: '78.6',
              monthly_cost_brand: '210.00',
              monthly_cost_generic: '45.00',
              doses_per_day: 2,
              assumed_frequency: false,
              caution: null,
              price_as_of: '2024-10-01',
              illustrative: true,
            },
          ],
          unmatched: [],
          total_monthly_savings: '549.00',
          disclaimer: 'Illustrative prices.',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (urlStr.includes('/care-gaps')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <PhysicianView />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Medicine Dispensing & Generic Substitution/i)).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/PMBJP Generic Equivalent/i)).toBeTruthy();
      expect(screen.getByText(/Jan Aushadhi Telmisartan 40mg/i)).toBeTruthy();
      expect(screen.getByText(/Jan Aushadhi Metformin 500mg/i)).toBeTruthy();
    });
  });

  it('renders DoctorView with tabs and patient details', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/demo/patients')) {
        return new Response(JSON.stringify([
          { abha_id: '91-1234-5678-9012', display_name: 'Ramesh Kumar' },
        ]), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <DoctorView />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Doctor Clinical Portal/i)).toBeTruthy();
    expect(screen.getByText(/Add Prescription/i)).toBeTruthy();
    expect(screen.getByText(/Find Patient Details/i)).toBeTruthy();
  });

  it('renders AdminView with telemetry and logs tabs', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/metrics')) {
        return new Response(JSON.stringify({
          database_connected: true,
          supabase_host: 'supabase.co',
          total_patients: 12,
          total_prescriptions: 20,
          total_fhir_resources: 136,
          total_access_logs: 45,
          resource_breakdown: { Condition: 30, Observation: 60, Encounter: 20 },
        }), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    });

    render(
      <MemoryRouter>
        <AuthProvider>
          <AdminView />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/System Administration & Telemetry/i)).toBeTruthy();
  });
});
