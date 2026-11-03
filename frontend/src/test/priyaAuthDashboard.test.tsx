import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PatientDataProvider } from '@/context/PatientDataContext';
import { LoginPage } from '@/pages/LoginPage';
import { PatientView } from '@/pages/PatientView';
import { GoogleAuthDialog } from '@/components/GoogleAuthDialog';
import { PatientCard } from '@/components/PatientCard';

describe('Priya Sharma Authentication & Dashboard Integrity', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('immediately initializes dashboard with Priya Sharma when session is authenticated as Priya', async () => {
    sessionStorage.setItem('healthsafe_auth_role', 'patient');
    sessionStorage.setItem('healthsafe_auth_abha', '91-2345-6789-0123');
    sessionStorage.setItem('healthsafe_auth_name', 'Priya Sharma');

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/bundle')) {
        return new Response(
          JSON.stringify({
            resourceType: 'Bundle',
            type: 'collection',
            entry: [
              {
                resource: {
                  resourceType: 'Patient',
                  id: 'patient-priya-sharma',
                  name: [{ text: 'Priya Sharma', given: ['Priya'] }],
                  identifier: [{ system: 'https://healthid.ndhm.gov.in', value: '91-2345-6789-0123' }],
                  gender: 'female',
                  birthDate: '1985-04-12',
                },
              },
              {
                resource: {
                  resourceType: 'Condition',
                  id: 'cond-priya-hypothyroidism',
                  code: { text: 'Hypothyroidism' },
                  clinicalStatus: { coding: [{ code: 'active' }] },
                  recordedDate: '2022-06-10',
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    render(
      <MemoryRouter initialEntries={['/patient']}>
        <AuthProvider>
          <PatientDataProvider>
            <PatientView />
          </PatientDataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should display Priya Sharma in hero eyebrow and greeting
    expect(await screen.findByText(/Priya Sharma/)).toBeDefined();
    expect(screen.getByText(/Clinical history,/i)).toBeDefined();

    // Should display Priya's ABHA ID
    expect(screen.getByText(/91-2345-6789-0123/)).toBeDefined();

    // Should NOT display Ramesh Kumar
    expect(screen.queryByText(/Ramesh Kumar/)).toBeNull();
    expect(screen.queryByText(/91-1234-5678-9012/)).toBeNull();
  });

  it('renders PatientCard with Priya Sharma details and feminine initials/gender', () => {
    const mockPriyaPatient: any = {
      resourceType: 'Patient',
      id: 'patient-priya-sharma',
      name: [{ text: 'Priya Sharma' }],
      identifier: [{ system: 'https://healthid.ndhm.gov.in', value: '91-2345-6789-0123' }],
      gender: 'female',
      birthDate: '1985-04-12',
    };

    render(
      <MemoryRouter>
        <AuthProvider>
          <PatientCard patient={mockPriyaPatient} />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Priya Sharma')).toBeDefined();
    expect(screen.getByText('PS')).toBeDefined();
    expect(screen.getByText('Female')).toBeDefined();
    expect(screen.getByText(/91-2345-6789-0123/)).toBeDefined();
    expect(screen.queryByText('Ramesh Kumar')).toBeNull();
  });

  it('authenticating as Priya Sharma via LoginPage stores Priya ABHA and name', async () => {
    vi.useFakeTimers();

    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve([
            { abha_id: '91-1234-5678-9012', display_name: 'Ramesh Kumar' },
            { abha_id: '91-2345-6789-0123', display_name: 'Priya Sharma' },
          ]),
      } as any)
    );

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <PatientDataProvider>
            <LoginPage />
          </PatientDataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Select Priya Sharma chip
    const priyaChip = screen.getByRole('button', { name: 'Priya Sharma' });
    fireEvent.click(priyaChip);

    // Send OTP
    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP/i });
    fireEvent.click(sendOtpBtn);

    await vi.advanceTimersByTimeAsync(1100);

    // Enter demo OTP
    const otpInput = screen.getByLabelText(/Enter 6-digit OTP/i);
    fireEvent.change(otpInput, { target: { value: '123456' } });

    // Verify & Sign In
    const verifyBtn = screen.getByRole('button', { name: /Verify & Sign In/i });
    fireEvent.click(verifyBtn);

    await vi.advanceTimersByTimeAsync(500);

    // Session storage must now have Priya Sharma's ABHA and name
    expect(sessionStorage.getItem('healthsafe_auth_abha')).toBe('91-2345-6789-0123');
    expect(sessionStorage.getItem('healthsafe_auth_name')).toBe('Priya Sharma');
    expect(sessionStorage.getItem('healthsafe_auth_role')).toBe('patient');

    vi.useRealTimers();
  });

  it('authenticating via GoogleAuthDialog with Priya Sharma binds to Priya profile and ABHA', async () => {
    function DummyGoogleTestComponent() {
      const { userName, abhaId, role } = useAuth();
      const [isOpen, setIsOpen] = React.useState(true);
      return (
        <div>
          <div data-testid="active-user">{userName || 'none'}</div>
          <div data-testid="active-abha">{abhaId || 'none'}</div>
          <div data-testid="active-role">{role || 'none'}</div>
          <GoogleAuthDialog open={isOpen} onOpenChange={setIsOpen} defaultRole="patient" />
        </div>
      );
    }

    render(
      <MemoryRouter>
        <AuthProvider>
          <PatientDataProvider>
            <DummyGoogleTestComponent />
          </PatientDataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // In GoogleAuthDialog, select Priya Sharma account
    const priyaButton = screen.getByRole('button', { name: /Priya Sharma/i });
    fireEvent.click(priyaButton);

    // Click Continue with Google
    const continueBtn = screen.getByRole('button', { name: /Continue with Google/i });
    fireEvent.click(continueBtn);

    // Verify Auth Context values
    expect(screen.getByTestId('active-user').textContent).toBe('Priya Sharma');
    expect(screen.getByTestId('active-abha').textContent).toBe('91-2345-6789-0123');
    expect(screen.getByTestId('active-role').textContent).toBe('patient');
    expect(sessionStorage.getItem('healthsafe_auth_abha')).toBe('91-2345-6789-0123');
  });
});
