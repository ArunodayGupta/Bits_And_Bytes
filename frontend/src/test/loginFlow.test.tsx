import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth, RequireRole } from '@/context/AuthContext';
import { PatientDataProvider } from '@/context/PatientDataContext';
import { LoginPage } from '@/pages/LoginPage';

function TestAuthConsumer() {
  const { role, abhaId, isAuthenticated, logout } = useAuth();
  return (
    <div>
      <div data-testid="auth-role">{role || 'none'}</div>
      <div data-testid="auth-abha">{abhaId || 'none'}</div>
      <div data-testid="auth-status">{isAuthenticated ? 'logged-in' : 'logged-out'}</div>
      <button onClick={logout}>Do Logout</button>
    </div>
  );
}

describe('Mock Login Flow & AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
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
  });

  it('renders login card with title, subtitle, and demo notice', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <PatientDataProvider>
            <LoginPage />
          </PatientDataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Unified Health Wallet')).toBeDefined();
    expect(screen.getByText('Demo login (simulated ABHA OTP)')).toBeDefined();
    expect(screen.getByText(/Demo only: no real authentication and no real ABDM connection/i)).toBeDefined();
  });

  it('shows error for unknown ABHA numbers not in demo registry', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <PatientDataProvider>
            <LoginPage />
          </PatientDataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const input = screen.getByLabelText(/ABHA Number/i);
    fireEvent.change(input, { target: { value: '91-9999-9999-9999' } });

    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP/i });
    fireEvent.click(sendOtpBtn);

    expect(await screen.findByText('No demo record found.')).toBeDefined();
  });

  it('progresses to OTP step on clicking demo chip and sending OTP', async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <PatientDataProvider>
            <LoginPage />
          </PatientDataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    // Click Ramesh Kumar chip
    const chip = screen.getByRole('button', { name: 'Ramesh Kumar' });
    fireEvent.click(chip);

    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP/i });
    fireEvent.click(sendOtpBtn);

    // Fast-forward 1s OTP spinner
    await vi.advanceTimersByTimeAsync(1100);

    expect(screen.getByText(/Enter 6-digit OTP/i)).toBeDefined();
    expect(screen.getByText(/Demo OTP: 123456/i)).toBeDefined();

    vi.useRealTimers();
  });

  it('rejects incorrect OTP and displays error message', async () => {
    vi.useFakeTimers();

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <PatientDataProvider>
            <LoginPage />
          </PatientDataProvider>
        </AuthProvider>
      </MemoryRouter>
    );

    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP/i });
    fireEvent.click(sendOtpBtn);
    await vi.advanceTimersByTimeAsync(1100);

    const otpInput = screen.getByLabelText(/Enter 6-digit OTP/i);
    fireEvent.change(otpInput, { target: { value: '999999' } });

    const verifyBtn = screen.getByRole('button', { name: /Verify & Sign In/i });
    fireEvent.click(verifyBtn);

    expect(screen.getByText(/Invalid OTP. Please enter demo OTP: 123456/i)).toBeDefined();

    vi.useRealTimers();
  });

  it('persists role and abhaId in sessionStorage and clears on logout', () => {
    sessionStorage.setItem('healthsafe_auth_role', 'patient');
    sessionStorage.setItem('healthsafe_auth_abha', '91-1234-5678-9012');

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestAuthConsumer />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('auth-role').textContent).toBe('patient');
    expect(screen.getByTestId('auth-abha').textContent).toBe('91-1234-5678-9012');
    expect(screen.getByTestId('auth-status').textContent).toBe('logged-in');

    const logoutBtn = screen.getByText('Do Logout');
    fireEvent.click(logoutBtn);

    expect(screen.getByTestId('auth-role').textContent).toBe('none');
    expect(screen.getByTestId('auth-abha').textContent).toBe('none');
    expect(screen.getByTestId('auth-status').textContent).toBe('logged-out');
    expect(sessionStorage.getItem('healthsafe_auth_role')).toBeNull();
  });

  it('RequireRole guard redirects unauthenticated access to /login', () => {
    render(
      <MemoryRouter initialEntries={['/patient']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div data-testid="login-screen">Login Screen</div>} />
            <Route
              path="/patient"
              element={
                <RequireRole allowedRoles={['patient']}>
                  <div data-testid="patient-screen">Patient Protected</div>
                </RequireRole>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('login-screen')).toBeDefined();
    expect(screen.queryByTestId('patient-screen')).toBeNull();
  });
});
