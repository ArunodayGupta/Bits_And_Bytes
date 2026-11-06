/**
 * frontend/src/test/abhaAuthSignup.test.tsx
 * Comprehensive Vitest suite for ABDM ABHA Signup and Login flows.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { PatientDataProvider } from '@/context/PatientDataContext';
import { SignUpPage } from '@/pages/SignUpPage';
import { LoginPage } from '@/pages/LoginPage';

function DummyPatientView() {
  const { abhaId, userName, role } = useAuth();
  return (
    <div data-testid="patient-dashboard">
      <span data-testid="dash-abha">{abhaId}</span>
      <span data-testid="dash-name">{userName}</span>
      <span data-testid="dash-role">{role}</span>
    </div>
  );
}

describe('ABDM ABHA Signup & Login Integration Flow', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('renders ABHA Patient Registration tab with Aadhaar and Mobile modes on SignUpPage', async () => {
    render(
      <MemoryRouter initialEntries={['/signup?role=patient']}>
        <AuthProvider>
          <PatientDataProvider>
            <SignUpPage />
          </PatientDataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('ABHA Health Account Registration')).toBeDefined();
    expect(screen.getByText(/Ayushman Bharat Digital Mission \(ABDM\) Integration/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Aadhaar \(12-Digit\)/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Mobile Number/i })).toBeDefined();
  });

  it('completes the full ABHA enrollment lifecycle (Aadhaar -> OTP -> ABHA Card -> Dashboard)', async () => {
    // Mock the backend ABDM enrollment endpoints
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const urlStr = String(url);

      if (urlStr.includes('/api/abha/enrollment/request-otp')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              txn_id: 'txn-test-enroll-9988',
              auth_mode: 'aadhaar',
              message: 'OTP sent successfully to Aadhaar-linked mobile (Demo OTP: 123456)',
              demo_otp: '123456',
            }),
        } as any);
      }

      if (urlStr.includes('/api/abha/enrollment/verify-otp')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: 'ABHA ID generated successfully',
              abha_id: '91-4829-1038-5921',
              abha_address: 'priya.sharma@abdm',
              profile: {
                name: 'Priya Sharma',
                gender: 'female',
                dob: '1994-06-18',
                mobile: '9876543210',
                abha_address: 'priya.sharma@abdm',
                pin_code: '110001',
              },
              abdm_token: 'abdm-token-test-jwt-token',
            }),
        } as any);
      }

      // Default fallback
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as any);
    });

    render(
      <MemoryRouter initialEntries={['/signup?role=patient']}>
        <AuthProvider>
          <PatientDataProvider>
            <Routes>
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/patient" element={<DummyPatientView />} />
            </Routes>
          </PatientDataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Step 1: Fill Aadhaar and Submit
    const aadhaarInput = screen.getByPlaceholderText(/e\.g\. 5432 9876 1234/i);
    fireEvent.change(aadhaarInput, { target: { value: '5432 9876 1234' } });

    const requestOtpBtn = screen.getByRole('button', { name: /Request ABDM Enrollment OTP/i });
    fireEvent.click(requestOtpBtn);

    // Step 2: Enters OTP verification and profile view
    await waitFor(() => {
      expect(screen.getByText(/Enter 6-Digit OTP/i)).toBeDefined();
    });

    const otpField = screen.getByPlaceholderText('123456');
    fireEvent.change(otpField, { target: { value: '123456' } });

    const nameField = screen.getByPlaceholderText(/e\.g\. Priya Sharma/i);
    fireEvent.change(nameField, { target: { value: 'Priya Sharma' } });

    const verifyOtpBtn = screen.getByRole('button', { name: /Verify OTP & Issue ABHA ID/i });
    fireEvent.click(verifyOtpBtn);

    // Step 3: Verified ABHA Card Displayed
    await waitFor(() => {
      expect(screen.getByText('91-4829-1038-5921')).toBeDefined();
      expect(screen.getByText('priya.sharma@abdm')).toBeDefined();
      expect(screen.getByText(/ABDM Active/i)).toBeDefined();
    });

    // Step 4: Click "Open Health Wallet Dashboard"
    const openDashBtn = screen.getByRole('button', { name: /Open Health Wallet Dashboard/i });
    fireEvent.click(openDashBtn);

    // Dashboard assertion
    await waitFor(() => {
      expect(screen.getByTestId('patient-dashboard')).toBeDefined();
      expect(screen.getByTestId('dash-abha').textContent).toBe('91-4829-1038-5921');
      expect(screen.getByTestId('dash-name').textContent).toBe('Priya Sharma');
      expect(screen.getByTestId('dash-role').textContent).toBe('patient');
    });

    // SessionStorage verified
    expect(sessionStorage.getItem('healthsafe_auth_abha')).toBe('91-4829-1038-5921');
    expect(sessionStorage.getItem('healthsafe_auth_name')).toBe('Priya Sharma');
    expect(sessionStorage.getItem('healthsafe_auth_role')).toBe('patient');
  });

  it('allows switching to Mobile Number enrollment on SignUpPage', async () => {
    render(
      <MemoryRouter initialEntries={['/signup?role=patient']}>
        <AuthProvider>
          <PatientDataProvider>
            <SignUpPage />
          </PatientDataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const mobileBtn = screen.getByRole('button', { name: /Mobile Number/i });
    fireEvent.click(mobileBtn);

    expect(screen.getByLabelText(/10-Digit Contact Mobile Number/i)).toBeDefined();
  });

  it('validates consent requirement before requesting enrollment OTP', async () => {
    render(
      <MemoryRouter initialEntries={['/signup?role=patient']}>
        <AuthProvider>
          <PatientDataProvider>
            <SignUpPage />
          </PatientDataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Uncheck consent
    const consentBox = screen.getByRole('checkbox');
    fireEvent.click(consentBox);

    const requestOtpBtn = screen.getByRole('button', { name: /Request ABDM Enrollment OTP/i });
    fireEvent.click(requestOtpBtn);

    expect(
      screen.getByText(/Please provide consent to generate your ABHA ID under ABDM guidelines/i)
    ).toBeDefined();
  });
});

