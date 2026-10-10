/**
 * frontend/src/pages/LoginPage.tsx
 * Login page for Unified Health Wallet.
 *
 * Patient: ABHA Health ID + OTP (simulated)
 * Physician: One-click portal entry
 * Doctor: One-click portal entry
 * Admin: One-click console entry (no sign-up allowed)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePatientData } from '@/context/usePatientData';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShieldCheck, Stethoscope, User, Loader2, KeyRound, AlertCircle, ExternalLink, Lock, Pill, Info } from 'lucide-react';

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
  const location = useLocation();
  const { loginPatient, loginPhysician, loginDoctor, loginAdmin, isAuthenticated, role } = useAuth();
  const { setPatientId, availablePatients } = usePatientData();

  const [activeTab, setActiveTab] = useState<'patient' | 'physician' | 'doctor' | 'admin'>('patient');
  const [abhaInput, setAbhaInput] = useState<string>('91-1234-5678-9012');
  const [step, setStep] = useState<'abha' | 'otp'>('abha');
  const [otpInput, setOtpInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demoPatients, setDemoPatients] = useState<DemoPatientChip[]>(DEFAULT_DEMO_PATIENTS);

  const [hasConsented, setHasConsented] = useState<boolean>(true);
  const [doctorRegInput, setDoctorRegInput] = useState<string>('MCI-2018-98421');
  const [doctorNameInput, setDoctorNameInput] = useState<string>('Dr. Rajesh Rao, MD');
  const [doctorHospitalInput, setDoctorHospitalInput] = useState<string>('Apollo Hospitals');
  const [isVerifyingDoctor, setIsVerifyingDoctor] = useState<boolean>(false);

  const [physicianRegInput, setPhysicianRegInput] = useState<string>('PMBJP-KEN-0428');
  const [physicianNameInput, setPhysicianNameInput] = useState<string>('Dr. Dispensary Physician');
  const [physicianDispensaryInput, setPhysicianDispensaryInput] = useState<string>('Pradhan Mantri Jan Aushadhi Kendra #0428');
  const [isVerifyingPhysician, setIsVerifyingPhysician] = useState<boolean>(false);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Switch tab if role/tab specified in URL (e.g. /login?role=doctor)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role') || params.get('tab');
    if (roleParam && ['patient', 'physician', 'doctor', 'admin'].includes(roleParam)) {
      setActiveTab(roleParam as any);
    }
  }, [location.search]);

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

  // Fetch demo patients from backend
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
    return () => { isMounted = false; };
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

    if (!hasConsented) {
      setErrorMsg('Please grant permission to access your records using your ABHA ID.');
      return;
    }

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

    if (!hasConsented) {
      setErrorMsg('Please grant permission to access your records using your ABHA ID.');
      return;
    }

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

  const handlePhysicianVerifyAndContinue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsVerifyingPhysician(true);
    setTimeout(() => {
      setIsVerifyingPhysician(false);
      loginPhysician(physicianNameInput || 'Dr. Dispensary Physician', {
        regNumber: physicianRegInput || 'PMBJP-KEN-0428',
        council: 'Pharmacy Council of India (PCI)',
        dispensary: physicianDispensaryInput || 'Pradhan Mantri Jan Aushadhi Kendra #0428',
      });
      navigate('/physician', { replace: true });
    }, 450);
  };

  const handleDoctorVerifyAndContinue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsVerifyingDoctor(true);
    setTimeout(() => {
      setIsVerifyingDoctor(false);
      loginDoctor(doctorNameInput || 'Dr. Rajesh Rao, MD', {
        regNumber: doctorRegInput || 'MCI-2018-98421',
        council: 'National Medical Commission (NMC)',
        hospital: doctorHospitalInput || 'Apollo Hospitals',
      });
      navigate('/doctor', { replace: true });
    }, 450);
  };

  const handleAdminContinue = () => {
    loginAdmin('System Administrator');
    navigate('/admin', { replace: true });
  };

  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center py-10 px-4">
      <Card className="w-full max-w-lg rounded-28 border border-hairline bg-card shadow-elevated overflow-hidden animate-fade-up">
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
              {/* ABHA creation link */}
              <div className="rounded-xl border border-moss-500/20 bg-moss-500/5 p-3 flex items-start gap-2.5 text-xs text-moss-800 dark:text-moss-300">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-moss-600" />
                <span>
                  Don't have an ABHA ID?{' '}
                  <a
                    href="https://abha.abdm.gov.in/abha/v3/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2 inline-flex items-center gap-1 hover:text-moss-900"
                  >
                    Create one here <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
              </div>

              {step === 'abha' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="abha-input" className="text-xs font-medium text-ink-soft">
                      ABHA Number / Health ID
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
                      Demo profiles:
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

                  {/* ABDM Data Permission / Consent Checkbox */}
                  <div className="rounded-20 border border-moss-500/30 bg-moss-50/70 dark:bg-moss-950/20 p-3.5 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        id="abdm-consent-checkbox"
                        checked={hasConsented}
                        onChange={(e) => {
                          setHasConsented(e.target.checked);
                          setErrorMsg(null);
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-hairline text-moss-600 focus:ring-moss-500 cursor-pointer shrink-0 accent-moss-600"
                      />
                      <div className="text-xs text-ink leading-relaxed">
                        <span className="font-semibold text-moss-800 dark:text-moss-300">
                          Data Access Permission:
                        </span>{' '}
                        I grant permission to HealthSafe to access and retrieve my medical records (prescriptions, encounters, lab tests) using my Government ABHA ID under the Ayushman Bharat Digital Mission (ABDM) framework and DPDP Act.
                      </div>
                    </label>
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
                    disabled={isLoading || abhaInput.replace(/\D/g, '').length !== 14 || !hasConsented}
                    className="w-full rounded-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      'Send OTP to Registered Phone'
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="rounded-xl border border-hairline bg-paper-2 p-3 text-center">
                    <p className="text-xs text-ink-soft">OTP sent for</p>
                    <p className="font-mono text-sm font-bold text-ink mt-0.5">{abhaInput}</p>
                    <button
                      type="button"
                      onClick={() => { setStep('abha'); setErrorMsg(null); }}
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
                        Verifying...
                      </>
                    ) : (
                      'Verify & Sign In'
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>

            {/* PHYSICIAN / CLINICIAN TAB WITH PROFESSIONAL VERIFICATION */}
            <TabsContent value="physician" className="space-y-4 pt-1">
              <div className="rounded-20 border border-teal-500/20 bg-teal-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-300">
                    <Pill className="h-4 w-4 text-teal-600" />
                    Physician & Dispensary Portal
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-300">
                    <ShieldCheck className="h-3 w-3 text-teal-600" />
                    PCI / PMBJP Verified
                  </span>
                </div>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Review prescriptions, map approved Jan Aushadhi generic equivalents, and calculate patient savings with verified dispensary credentials.
                </p>
              </div>

              {/* Verified Demo Clinician Profile */}
              <div className="rounded-20 border border-hairline bg-paper-2 p-3.5 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft block">
                  Active Licensed Profile:
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">{physicianNameInput}</p>
                    <p className="text-[11px] text-ink-soft font-mono">
                      License #{physicianRegInput} · {physicianDispensaryInput}
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    ✓ Verified
                  </span>
                </div>
              </div>

              {/* Professional Credential Inputs */}
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-medium text-ink-soft block mb-1">
                    Pharmacy Council License / PMBJP Kendra ID
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. PMBJP-KEN-0428 or PCI-DL-2020"
                    value={physicianRegInput}
                    onChange={(e) => setPhysicianRegInput(e.target.value)}
                    className="h-9 font-mono text-xs rounded-xl"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handlePhysicianVerifyAndContinue}
                disabled={isVerifyingPhysician}
                className="w-full rounded-full bg-teal-600 hover:bg-teal-700 text-paper font-semibold h-11 text-xs"
              >
                {isVerifyingPhysician ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying PMBJP / Pharmacy Registry...
                  </>
                ) : (
                  'Verify License & Enter Physician Portal'
                )}
              </Button>
            </TabsContent>

            {/* DOCTOR TAB WITH PROFESSIONAL VERIFICATION */}
            <TabsContent value="doctor" className="space-y-4 pt-1">
              <div className="rounded-20 border border-sky-500/20 bg-sky-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-sky-800 dark:text-sky-300">
                    <Stethoscope className="h-4 w-4 text-sky-600" />
                    Doctor Clinical Portal
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                    <ShieldCheck className="h-3 w-3 text-sky-600" />
                    NMC / SMC Verified
                  </span>
                </div>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Medical practitioners write verified electronic prescriptions and look up patient longitudinal histories.
                </p>
              </div>

              {/* Verified Demo Doctor Profile */}
              <div className="rounded-20 border border-hairline bg-paper-2 p-3.5 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft block">
                  Active Licensed Practitioner:
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-ink">{doctorNameInput}</p>
                    <p className="text-[11px] text-ink-soft font-mono">
                      NMC Reg #{doctorRegInput} · {doctorHospitalInput}
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    ✓ Verified
                  </span>
                </div>
              </div>

              {/* Professional Credential Inputs */}
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-medium text-ink-soft block mb-1">
                    Medical Council Registration Number (NMC / State SMC)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. MCI-2018-98421 or DMC-52810"
                    value={doctorRegInput}
                    onChange={(e) => setDoctorRegInput(e.target.value)}
                    className="h-9 font-mono text-xs rounded-xl"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={handleDoctorVerifyAndContinue}
                disabled={isVerifyingDoctor}
                className="w-full rounded-full bg-sky-600 hover:bg-sky-700 text-paper font-semibold h-11 text-xs"
              >
                {isVerifyingDoctor ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying with National Medical Commission (NMC)...
                  </>
                ) : (
                  'Verify Credentials & Enter Doctor Portal'
                )}
              </Button>
            </TabsContent>

            {/* ADMIN TAB: No sign-up - access only */}
            <TabsContent value="admin" className="space-y-4 pt-2 text-center">
              <div className="rounded-20 border border-amber-500/20 bg-amber-500/5 p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <Lock className="h-4 w-4 text-amber-600" />
                  Admin Console
                </div>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Manage patients, doctors, prescriptions, and system audit logs. Admin accounts cannot be self-registered.
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
        </CardContent>

        <CardFooter className="bg-paper-2/50 border-t border-hairline py-4 px-6 flex flex-col items-center justify-center gap-2 text-xs text-ink-soft">
          <div className="text-center">
            <span>Are you a Doctor or Clinician?</span>
            <Link to="/signup" className="ml-1.5 font-semibold text-moss-700 hover:underline dark:text-moss-400">
              Register & verify medical license
            </Link>
          </div>
          <p className="text-[11px] text-ink-soft text-center leading-tight">
            Patients do not sign up here — log in with your Government ABHA ID.
          </p>
          <p className="text-[10px] text-ink-soft text-center opacity-80">
            Demo only: no real authentication and no real ABDM connection
          </p>
        </CardFooter>

      </Card>
    </div>
  );
};
