/**
 * frontend/src/pages/LoginPage.tsx
 * Mock Login Shell for Unified Health Wallet.
 *
 * Supports Patient ABHA + OTP, Clinician Portal, System Admin Console,
 * and Clerk / Google Single Sign-On.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePatientData } from '@/context/usePatientData';
import { GoogleAuthDialog } from '@/components/GoogleAuthDialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShieldCheck, Stethoscope, User, Loader2, KeyRound, AlertCircle, Info, Lock, Pill } from 'lucide-react';

interface DemoPatientChip {
  abha_id: string;
  display_name: string;
}

const DEFAULT_DEMO_PATIENTS: DemoPatientChip[] = [
  { abha_id: '91-1234-5678-9012', display_name: 'Ramesh Kumar' },
  { abha_id: '91-2345-6789-0123', display_name: 'Priya Sharma' },
  { abha_id: '91-3456-7890-1234', display_name: 'Arun Patel' },
  { abha_id: '91-4567-8901-2345', display_name: 'Sunita Verma' },
  { abha_id: '91-5678-9012-3456', display_name: 'Vikram Malhotra' },
  { abha_id: '91-6789-0123-4567', display_name: 'Ananya Deshmukh' },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginPatient, loginPhysician, loginDoctor, loginAdmin, loginWithGoogle, isAuthenticated, role } = useAuth();
  const { setPatientId, availablePatients } = usePatientData();

  const [activeTab, setActiveTab] = useState<'patient' | 'physician' | 'doctor' | 'admin'>('patient');
  const [abhaInput, setAbhaInput] = useState<string>('91-1234-5678-9012');
  const [step, setStep] = useState<'abha' | 'otp'>('abha');
  const [otpInput, setOtpInput] = useState<string>('');
  const [adminPass, setAdminPass] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [googleDialogOpen, setGoogleDialogOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demoPatients, setDemoPatients] = useState<DemoPatientChip[]>(DEFAULT_DEMO_PATIENTS);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // If already logged in, redirect to the user's scoped dashboard
  useEffect(() => {
    if (isAuthenticated) {
      if (role === 'physician' || role === 'clinician') {
        navigate('/physician', { replace: true });
      } else if (role === 'doctor') {
        navigate('/doctor', { replace: true });
      } else if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/patient', { replace: true });
      }
    }
  }, [isAuthenticated, role, navigate]);

  // Fetch demo patients list from backend or fall back to offline fixture
  useEffect(() => {
    let isMounted = true;
    async function fetchPatients() {
      try {
        const res = await fetch('/api/demo/patients');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setDemoPatients(data);
          }
        }
      } catch {
        // Fallback to static list
      }
    }
    fetchPatients();
    return () => {
      isMounted = false;
    };
  }, []);

  // Format ABHA as user types: 91-XXXX-XXXX-XXXX
  const handleAbhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const raw = e.target.value.replace(/\D/g, '');
    let formatted = '';
    if (raw.length > 0) {
      formatted = raw.substring(0, 2);
      if (raw.length > 2) formatted += '-' + raw.substring(2, 6);
      if (raw.length > 6) formatted += '-' + raw.substring(6, 10);
      if (raw.length > 10) formatted += '-' + raw.substring(10, 14);
    }
    setAbhaInput(formatted);
  };

  const handleChipClick = (abha: string) => {
    setErrorMsg(null);
    setAbhaInput(abha);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate against known demo patients
    const found = demoPatients.some(
      (p) => p.abha_id.replace(/\D/g, '') === abhaInput.replace(/\D/g, '')
    );
    if (!found) {
      setErrorMsg('No demo record found.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep('otp');
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }, 400);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (otpInput !== '123456') {
      setErrorMsg('Invalid OTP. Please enter demo OTP: 123456');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const matched = demoPatients.find(
        (p) => p.abha_id.replace(/\D/g, '') === abhaInput.replace(/\D/g, '')
      );
      const targetAbha = matched ? matched.abha_id : abhaInput;

      // Sync active patient profile in context
      const profile = availablePatients.find(
        (p) => p.abha.replace(/\D/g, '') === targetAbha.replace(/\D/g, '')
      );
      if (profile) {
        setPatientId(profile.id);
      }

      loginPatient(targetAbha, matched?.display_name);
      navigate('/patient', { replace: true });
    }, 400);
  };

  const handlePhysicianContinue = () => {
    loginPhysician('Dr. Dispensary Physician');
    navigate('/physician', { replace: true });
  };

  const handleDoctorContinue = () => {
    loginDoctor('Dr. Rajesh Rao, MD');
    navigate('/doctor', { replace: true });
  };

  const handleAdminContinue = () => {
    loginAdmin('System Administrator');
    navigate('/admin', { replace: true });
  };

  const handleGoogleSignIn = () => {
    // Open Google's official sign-in page in a popup window
    const width = 520;
    const height = 620;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    try {
      window.open(
        'https://accounts.google.com/AccountChooser?service=lso',
        'google_auth_window',
        `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no`
      );
    } catch {
      // Popups may be blocked
    }
    // Open interactive Google account selector dialog
    setGoogleDialogOpen(true);
  };

  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center py-10 px-4">
      <Card className="w-full max-w-lg rounded-28 border border-hairline bg-card shadow-elevated overflow-hidden animate-fade-up">
        {/* Synthetic Demo Notice */}
        <div className="bg-moss-500/10 border-b border-moss-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-moss-700 dark:text-moss-400">
          <span className="flex items-center gap-1.5 font-medium">
            <Info className="h-3.5 w-3.5" />
            Demo only: no real authentication and no real ABDM connection
          </span>
          <span className="font-mono text-[11px] font-semibold">Ready</span>
        </div>

        <CardHeader className="text-center pb-4 pt-6 px-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-moss-100 text-moss-600 dark:bg-moss-900/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="font-serif text-2xl font-bold tracking-tight">
            Unified Health Wallet
          </CardTitle>
          <CardDescription className="text-xs text-ink-soft mt-1">
            Demo login (simulated ABHA OTP)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 px-6">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as any);
              setErrorMsg(null);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 rounded-full bg-paper-2 p-1 border border-hairline mb-4">
              <TabsTrigger value="patient" className="rounded-full text-xs font-semibold">
                Patient
              </TabsTrigger>
              <TabsTrigger value="physician" className="rounded-full text-xs font-semibold">
                Physician
              </TabsTrigger>
              <TabsTrigger value="doctor" className="rounded-full text-xs font-semibold">
                Doctor
              </TabsTrigger>
              <TabsTrigger value="admin" className="rounded-full text-xs font-semibold">
                Admin
              </TabsTrigger>
            </TabsList>

            {/* PATIENT TAB: ABHA + OTP */}
            <TabsContent value="patient" className="space-y-4">
              {step === 'abha' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="abha-input" className="text-xs font-medium text-ink-soft">
                      ABHA Number (14-digit ABDM Health ID)
                    </label>
                    <Input
                      id="abha-input"
                      type="text"
                      placeholder="91-XXXX-XXXX-XXXX"
                      value={abhaInput}
                      onChange={handleAbhaChange}
                      className="font-mono text-center tracking-widest text-base font-semibold"
                      maxLength={17}
                    />
                  </div>

                  {/* Demo Patient Quick-Select Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft block">
                      Quick Select Demo Profile:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {demoPatients.map((chip) => {
                        const isSelected =
                          chip.abha_id.replace(/\D/g, '') === abhaInput.replace(/\D/g, '');
                        return (
                          <button
                            key={chip.abha_id}
                            type="button"
                            onClick={() => handleChipClick(chip.abha_id)}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-moss-600 text-paper shadow-sm'
                                : 'bg-paper-2 text-ink-soft hover:bg-paper-2/80 hover:text-ink border border-hairline'
                            }`}
                          >
                            {chip.display_name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {errorMsg && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="flex items-center gap-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading || abhaInput.replace(/\D/g, '').length !== 14}
                    className="w-full rounded-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating OTP...
                      </>
                    ) : (
                      'Send OTP to Registered Phone'
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="rounded-xl border border-hairline bg-paper-2 p-3 text-center">
                    <p className="text-xs text-ink-soft">Simulated OTP sent to registered number for</p>
                    <p className="font-mono text-sm font-bold text-ink mt-0.5">{abhaInput}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('abha');
                        setErrorMsg(null);
                      }}
                      className="mt-1 text-[11px] font-semibold text-moss-700 hover:underline dark:text-moss-400"
                    >
                      Change ABHA ID
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="otp-input" className="text-xs font-medium text-ink-soft">
                      Enter 6-digit OTP
                    </label>
                    <Input
                      id="otp-input"
                      ref={otpInputRef}
                      type="text"
                      placeholder="• • • • • •"
                      value={otpInput}
                      onChange={(e) => {
                        setErrorMsg(null);
                        setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6));
                      }}
                      className="font-mono text-center tracking-[0.5em] text-lg font-bold"
                      maxLength={6}
                    />
                    <div className="flex items-center justify-between text-[11px] text-ink-soft px-1">
                      <span>Demo OTP: 123456</span>
                      <button
                        type="button"
                        onClick={() => setOtpInput('123456')}
                        className="text-moss-700 hover:underline font-semibold dark:text-moss-400"
                      >
                        Auto-fill
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="flex items-center gap-2 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading || otpInput.length !== 6}
                    className="w-full rounded-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying simulated OTP...
                      </>
                    ) : (
                      'Verify & Sign In'
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>

            {/* PHYSICIAN TAB: Generic Alternatives & Savings */}
            <TabsContent value="physician" className="space-y-4 pt-2 text-center">
              <div className="rounded-20 border border-teal-500/20 bg-teal-500/5 p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-300">
                  <Pill className="h-4 w-4 text-teal-600" />
                  Dispensary Physician Portal
                </div>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Enter the Prescription ID (e.g. <code className="font-mono bg-paper-2 px-1 rounded">APL-RR-1410-RAME</code>) or Patient ID to review prescribed medicines, find affordable generic alternatives, and calculate monthly savings.
                </p>
              </div>
              <Button
                type="button"
                onClick={handlePhysicianContinue}
                className="w-full rounded-full bg-teal-600 hover:bg-teal-700 text-paper font-semibold"
              >
                Continue as Physician
              </Button>
            </TabsContent>

            {/* DOCTOR TAB: Patient EHR Search & Create Prescriptions */}
            <TabsContent value="doctor" className="space-y-4 pt-2 text-center">
              <div className="rounded-20 border border-sky-500/20 bg-sky-500/5 p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-800 dark:text-sky-300">
                  <Stethoscope className="h-4 w-4 text-sky-600" />
                  Clinical Doctor Portal
                </div>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Look up patient medical records, lab reports, and write verified digital prescriptions.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleDoctorContinue}
                className="w-full rounded-full bg-sky-600 hover:bg-sky-700 text-paper font-semibold"
              >
                Continue as Doctor
              </Button>
            </TabsContent>

            {/* ADMIN TAB: Multi-Entity Governance */}
            <TabsContent value="admin" className="space-y-4 pt-2 text-center">
              <div className="rounded-20 border border-amber-500/20 bg-amber-500/5 p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  System Administrator Portal
                </div>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Manage patients, doctors, prescriptions, and inspect system audit logs.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAdminContinue}
                className="w-full rounded-full bg-amber-600 hover:bg-amber-700 text-paper font-semibold"
              >
                Access Admin Console
              </Button>
            </TabsContent>
          </Tabs>

          {/* Social Sign In (Clerk / Google) */}
          <div className="pt-2">
            <div className="relative flex items-center justify-center text-xs mb-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-hairline" />
              </div>
              <span className="relative bg-card px-3 text-[11px] uppercase tracking-wider text-ink-soft">
                Or Sign In with Google
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full h-11 rounded-full border border-hairline bg-paper-2 hover:bg-card flex items-center justify-center gap-2.5 text-xs font-semibold shadow-sm"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>Sign In with Google</span>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="bg-paper-2/50 border-t border-hairline py-4 px-6 flex justify-center text-xs text-ink-soft">
          <span>Need a new account?</span>
          <Link to="/signup" className="ml-1.5 font-semibold text-moss-700 hover:underline dark:text-moss-400">
            Sign Up
          </Link>
        </CardFooter>
      </Card>

      {/* Google Authentication Dialog */}
      <GoogleAuthDialog
        open={googleDialogOpen}
        onOpenChange={setGoogleDialogOpen}
        defaultRole={activeTab}
      />
    </div>
  );
};
