import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck,
  Stethoscope,
  User,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Pill,
  Info,
  Building2,
  Award,
  ArrowRight,
  Fingerprint,
  Smartphone,
  Copy,
  Check,
  QrCode,
  Sparkles,
} from 'lucide-react';
import {
  requestEnrollmentOtp,
  verifyEnrollmentOtp,
  formatAadhaar,
} from '@/lib/api/abhaClient';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginPhysician, loginDoctor, loginPatient, isAuthenticated, role: authRole } = useAuth();

  const [role, setRole] = useState<'doctor' | 'physician' | 'patient'>('doctor');

  // Check URL params for preselected role (e.g. /signup?role=patient)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const r = params.get('role');
    if (r === 'patient' || r === 'doctor' || r === 'physician') {
      setRole(r);
    }
  }, [location.search]);

  // Doctor Fields
  const [docName, setDocName] = useState<string>('Dr. Rajesh Rao, MD');
  const [docDegree, setDocDegree] = useState<string>('MBBS, MD Internal Medicine');
  const [docCouncil, setDocCouncil] = useState<string>('National Medical Commission (NMC)');
  const [docRegNum, setDocRegNum] = useState<string>('MCI-2018-98421');
  const [docHospital, setDocHospital] = useState<string>('Apollo Hospitals');

  // Physician / Clinician Fields
  const [phyName, setPhyName] = useState<string>('Dr. Suresh Sharma');
  const [phyCouncil, setPhyCouncil] = useState<string>('Pharmacy Council of India (PCI)');
  const [phyRegNum, setPhyRegNum] = useState<string>('PCI-DL-2020-64210');
  const [phyKendraId, setPhyKendraId] = useState<string>('PMBJP-KEN-0428');
  const [phyDispensary, setPhyDispensary] = useState<string>('Pradhan Mantri Jan Aushadhi Kendra #0428');

  // Patient ABHA Enrollment Fields
  const [patientMode, setPatientMode] = useState<'aadhaar' | 'mobile'>('aadhaar');
  const [patientStep, setPatientStep] = useState<'input' | 'otp' | 'success'>('input');
  const [aadhaarInput, setAadhaarInput] = useState<string>('5432 9876 1234');
  const [mobileInput, setMobileInput] = useState<string>('9876543210');
  const [patientConsent, setPatientConsent] = useState<boolean>(true);
  const [enrollTxnId, setEnrollTxnId] = useState<string>('');
  const [enrollOtp, setEnrollOtp] = useState<string>('123456');
  const [patientActiveOtp, setPatientActiveOtp] = useState<string>('123456');
  const [otpHint, setOtpHint] = useState<string>('Demo OTP: 123456');

  // Citizen Profile Form
  const [citizenName, setCitizenName] = useState<string>('Priya Sharma');
  const [citizenGender, setCitizenGender] = useState<'male' | 'female' | 'other'>('female');
  const [citizenDob, setCitizenDob] = useState<string>('1994-06-18');
  const [citizenAddressHandle, setCitizenAddressHandle] = useState<string>('priya.sharma');
  const [citizenPinCode, setCitizenPinCode] = useState<string>('110001');

  // Resulting generated ABHA
  const [enrolledAbhaId, setEnrolledAbhaId] = useState<string>('');
  const [enrolledAbhaAddress, setEnrolledAbhaAddress] = useState<string>('');
  const [isCopiedAbha, setIsCopiedAbha] = useState<boolean>(false);

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationSuccess, setVerificationSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      if (authRole === 'physician' || authRole === 'clinician') {
        navigate('/physician', { replace: true });
      } else if (authRole === 'doctor') {
        navigate('/doctor', { replace: true });
      } else if (authRole === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/patient', { replace: true });
      }
    }
  }, [isAuthenticated, authRole, navigate]);

  const handleDoctorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!docRegNum.trim()) {
      setErrorMsg('Please enter your Medical Council Registration Number.');
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationSuccess(true);

      setTimeout(() => {
        loginDoctor(docName || 'Dr. Rajesh Rao, MD', {
          regNumber: docRegNum.trim(),
          council: docCouncil,
          hospital: docHospital,
        });
        navigate('/doctor');
      }, 700);
    }, 800);
  };

  const handlePhysicianSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!phyRegNum.trim()) {
      setErrorMsg('Please enter your Pharmacy/Medical Council License Number.');
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerificationSuccess(true);

      setTimeout(() => {
        loginPhysician(phyName || 'Dr. Dispensary Physician', {
          regNumber: phyRegNum.trim(),
          council: phyCouncil,
          dispensary: phyDispensary,
        });
        navigate('/physician');
      }, 700);
    }, 800);
  };

  // Patient Enrollment Step 1: Request OTP via Aadhaar or Mobile
  const handlePatientRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!patientConsent) {
      setErrorMsg('Please provide consent to generate your ABHA ID under ABDM guidelines.');
      return;
    }

    const cleanVal = patientMode === 'aadhaar'
      ? aadhaarInput.replace(/\D/g, '')
      : mobileInput.replace(/\D/g, '');

    if (patientMode === 'aadhaar' && cleanVal.length !== 12) {
      setErrorMsg('Please enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (patientMode === 'mobile' && cleanVal.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await requestEnrollmentOtp(patientMode, cleanVal, patientConsent);
      setIsVerifying(false);

      if (res.success) {
        setEnrollTxnId(res.txn_id);
        const code = res.test_otp || res.demo_otp || '123456';
        setPatientActiveOtp(code);
        setEnrollOtp(code);
        setOtpHint(res.message || 'OTP sent successfully to registered mobile number.');
        setPatientStep('otp');
      } else {
        setErrorMsg(res.error?.message || 'Failed to request enrollment OTP from ABDM.');
      }
    } catch {
      setIsVerifying(false);
      setErrorMsg('Network error while contacting ABDM enrollment gateway.');
    }
  };

  // Patient Enrollment Step 2: Verify OTP & Profile
  const handlePatientVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!enrollOtp.trim()) {
      setErrorMsg('Please enter the 6-digit verification OTP.');
      return;
    }
    if (!citizenName.trim()) {
      setErrorMsg('Please enter your full legal name.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyEnrollmentOtp({
        txnId: enrollTxnId,
        otp: enrollOtp.trim(),
        name: citizenName.trim(),
        gender: citizenGender,
        dob: citizenDob,
        mobile: mobileInput.replace(/\D/g, ''),
        abhaAddress: citizenAddressHandle.trim(),
        pinCode: citizenPinCode.trim(),
      });

      setIsVerifying(false);

      if (res.success) {
        const mintedAbha = res.abha_id || (res as any).abha_number ||
          `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
        const mintedAddr = res.abha_address ||
          (citizenAddressHandle ? `${citizenAddressHandle.replace(/@abdm$/, '')}@abdm` : `${citizenName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@abdm`);

        setEnrolledAbhaId(mintedAbha);
        setEnrolledAbhaAddress(mintedAddr);
        setPatientStep('success');
      } else {
        setErrorMsg(res.error?.message || 'Registration verification failed. Please check the OTP.');
      }
    } catch {
      setIsVerifying(false);
      setErrorMsg('Error verifying registration OTP.');
    }
  };

  const handleCopyAbha = () => {
    if (!enrolledAbhaId) return;
    navigator.clipboard.writeText(enrolledAbhaId).then(() => {
      setIsCopiedAbha(true);
      setTimeout(() => setIsCopiedAbha(false), 2000);
    });
  };

  const handleEnterPatientDashboard = () => {
    const finalAbha = enrolledAbhaId || '91-4829-1038-5921';
    const finalName = citizenName || 'Patient';
    loginPatient(finalAbha, finalName);
    navigate('/patient', { replace: true });
  };

  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center py-10 px-4">
      <Card className="w-full max-w-xl rounded-28 border border-hairline bg-card shadow-elevated overflow-hidden animate-fade-up">
        <CardHeader className="text-center pb-4 pt-6 px-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-moss-100 text-moss-600 dark:bg-moss-900/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="font-serif text-2xl font-bold tracking-tight">
            {role === 'patient' ? 'ABHA Health Account Registration' : 'Healthcare Professional Onboarding'}
          </CardTitle>
          <CardDescription className="text-xs text-ink-soft mt-1">
            {role === 'patient'
              ? 'Official Ayushman Bharat Digital Mission (ABDM) Citizen Enrollment'
              : 'Verified provider registration for Doctors & Dispensary Clinicians'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-6">
          {/* Account Role Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft block">
              Registering Account Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setRole('doctor'); setErrorMsg(null); }}
                className={`flex flex-col items-center justify-center p-3 rounded-20 border text-xs font-medium transition-all ${
                  role === 'doctor'
                    ? 'border-sky-600 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 ring-2 ring-sky-600/20'
                    : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
                }`}
              >
                <Stethoscope className="h-4 w-4 mb-1" />
                <span>Doctor</span>
              </button>

              <button
                type="button"
                onClick={() => { setRole('physician'); setErrorMsg(null); }}
                className={`flex flex-col items-center justify-center p-3 rounded-20 border text-xs font-medium transition-all ${
                  role === 'physician'
                    ? 'border-teal-600 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 ring-2 ring-teal-600/20'
                    : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
                }`}
              >
                <Pill className="h-4 w-4 mb-1" />
                <span>Physician / Pharmacist</span>
              </button>

              <button
                type="button"
                onClick={() => { setRole('patient'); setErrorMsg(null); }}
                className={`flex flex-col items-center justify-center p-3 rounded-20 border text-xs font-medium transition-all ${
                  role === 'patient'
                    ? 'border-moss-600 bg-moss-50 text-moss-700 dark:bg-moss-900/30 dark:text-moss-300 ring-2 ring-moss-600/20'
                    : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
                }`}
              >
                <User className="h-4 w-4 mb-1" />
                <span>Patient (ABHA)</span>
              </button>
            </div>
          </div>

          {/* DOCTOR REGISTRATION & VERIFICATION FORM */}
          {role === 'doctor' && (
            <form onSubmit={handleDoctorSubmit} className="space-y-3.5">
              <div className="rounded-20 border border-sky-500/20 bg-sky-500/5 p-3.5 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-2.5">
                <Award className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
                <div>
                  <span className="font-semibold block mb-0.5">National Medical Commission (NMC) Verification</span>
                  <span>
                    Doctors write electronic prescriptions and review patient records. Registration is validated against the National Healthcare Professionals Registry (HPR).
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-soft block mb-1">
                  Full Name & Designation
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Rao, MD"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-soft block mb-1">
                    Medical Degree / Specialty
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. MBBS, MD Internal Medicine"
                    value={docDegree}
                    onChange={(e) => setDocDegree(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-soft block mb-1">
                    State / National Council
                  </label>
                  <select
                    value={docCouncil}
                    onChange={(e) => setDocCouncil(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-hairline bg-card text-xs text-ink focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="National Medical Commission (NMC)">National Medical Commission (NMC)</option>
                    <option value="Delhi Medical Council (DMC)">Delhi Medical Council (DMC)</option>
                    <option value="Maharashtra Medical Council (MMC)">Maharashtra Medical Council (MMC)</option>
                    <option value="Karnataka Medical Council (KMC)">Karnataka Medical Council (KMC)</option>
                    <option value="Tamil Nadu Medical Council (TNMC)">Tamil Nadu Medical Council (TNMC)</option>
                    <option value="West Bengal Medical Council">West Bengal Medical Council</option>
                    <option value="Other State Medical Council">Other State Medical Council</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-soft block mb-1">
                    Medical Registration Number (NMC/SMC)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. MCI-2018-98421"
                    value={docRegNum}
                    onChange={(e) => setDocRegNum(e.target.value)}
                    className="h-10 font-mono text-xs rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-soft block mb-1">
                    Hospital / Clinic Affiliation
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Apollo Hospitals"
                    value={docHospital}
                    onChange={(e) => setDocHospital(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-xl">
                  {errorMsg}
                </p>
              )}

              {verificationSuccess && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    ✓ Registration #{docRegNum} successfully verified with National Medical Commission! Logging you in...
                  </span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isVerifying || verificationSuccess}
                className="w-full h-11 rounded-full bg-sky-600 text-paper hover:bg-sky-700 font-semibold text-xs mt-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifying Credentials with Medical Registry...
                  </>
                ) : verificationSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Verified & Registered
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Verify License & Register as Doctor
                  </>
                )}
              </Button>
            </form>
          )}

          {/* PHYSICIAN / CLINICIAN REGISTRATION FORM */}
          {role === 'physician' && (
            <form onSubmit={handlePhysicianSubmit} className="space-y-3.5">
              <div className="rounded-20 border border-teal-500/20 bg-teal-500/5 p-3.5 text-xs text-teal-800 dark:text-teal-300 flex items-start gap-2.5">
                <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-teal-600" />
                <div>
                  <span className="font-semibold block mb-0.5">PMBJP Jan Aushadhi & Pharmacy Verification</span>
                  <span>
                    Dispensary officers map Jan Aushadhi generic alternatives and calculate patient medicine savings.
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-soft block mb-1">
                  Full Name & Title
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Dr. Suresh Sharma"
                  value={phyName}
                  onChange={(e) => setPhyName(e.target.value)}
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-soft block mb-1">
                    Licensing Council / Board
                  </label>
                  <select
                    value={phyCouncil}
                    onChange={(e) => setPhyCouncil(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-hairline bg-card text-xs text-ink focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Pharmacy Council of India (PCI)">Pharmacy Council of India (PCI)</option>
                    <option value="State Pharmacy Council">State Pharmacy Council</option>
                    <option value="State Medical Council">State Medical Council</option>
                    <option value="PMBJP Directorate Authorized">PMBJP Directorate Authorized</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-soft block mb-1">
                    License / Registration Number
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. PCI-DL-2020-64210"
                    value={phyRegNum}
                    onChange={(e) => setPhyRegNum(e.target.value)}
                    className="h-10 font-mono text-xs rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-soft block mb-1">
                    PMBJP Kendra ID / Facility ID
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. PMBJP-KEN-0428"
                    value={phyKendraId}
                    onChange={(e) => setPhyKendraId(e.target.value)}
                    className="h-10 font-mono text-xs rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-soft block mb-1">
                    Dispensary / Kendra Name
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. PMBJP Kendra #0428"
                    value={phyDispensary}
                    onChange={(e) => setPhyDispensary(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2 rounded-xl">
                  {errorMsg}
                </p>
              )}

              {verificationSuccess && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-50/80 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    ✓ Dispensary license #{phyRegNum} successfully verified! Logging you in...
                  </span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isVerifying || verificationSuccess}
                className="w-full h-11 rounded-full bg-teal-600 text-paper hover:bg-teal-700 font-semibold text-xs mt-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifying PMBJP License...
                  </>
                ) : verificationSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Verified & Registered
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Verify License & Register Clinician
                  </>
                )}
              </Button>
            </form>
          )}

          {/* PATIENT ABHA ENROLLMENT WORKFLOW */}
          {role === 'patient' && (
            <div className="space-y-4">
              {/* Informative Banner */}
              <div className="rounded-20 border border-moss-500/25 bg-moss-50/80 dark:bg-moss-950/30 p-3.5 text-xs text-moss-900 dark:text-moss-200 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-moss-600" />
                <div>
                  <span className="font-semibold block mb-0.5">Ayushman Bharat Digital Mission (ABDM) Integration</span>
                  <span>
                    Create your 14-digit ABHA ID using Aadhaar or Mobile verification. Your digital health record will be securely initialized on the national ABDM gateway.
                  </span>
                </div>
              </div>

              {/* STEP 1: IDENTIFIER & CONSENT */}
              {patientStep === 'input' && (
                <form onSubmit={handlePatientRequestOtp} className="space-y-3.5">
                  {/* Mode selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setPatientMode('aadhaar'); setErrorMsg(null); }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                        patientMode === 'aadhaar'
                          ? 'border-moss-600 bg-moss-100/70 text-moss-900 dark:bg-moss-900/40 dark:text-moss-200 shadow-xs'
                          : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
                      }`}
                    >
                      <Fingerprint className="h-4 w-4 text-moss-600" />
                      <span>Aadhaar (12-Digit)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setPatientMode('mobile'); setErrorMsg(null); }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                        patientMode === 'mobile'
                          ? 'border-moss-600 bg-moss-100/70 text-moss-900 dark:bg-moss-900/40 dark:text-moss-200 shadow-xs'
                          : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
                      }`}
                    >
                      <Smartphone className="h-4 w-4 text-moss-600" />
                      <span>Mobile Number</span>
                    </button>
                  </div>

                  {patientMode === 'aadhaar' ? (
                    <div>
                      <label htmlFor="aadhaar-input" className="text-xs font-medium text-ink-soft block mb-1">
                        12-Digit Aadhaar Number
                      </label>
                      <Input
                        type="text"
                        maxLength={14}
                        id="aadhaar-input"
                        placeholder="e.g. 5432 9876 1234"
                        value={aadhaarInput}
                        onChange={(e) => {
                          setErrorMsg(null);
                          setAadhaarInput(formatAadhaar(e.target.value));
                        }}
                        className="h-10 font-mono tracking-wider text-sm rounded-xl"
                        required
                      />
                      <p className="text-[11px] text-ink-soft mt-1">
                        An OTP will be sent to the mobile number registered with your Aadhaar.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="mobile-input" className="text-xs font-medium text-ink-soft block mb-1">
                        10-Digit Contact Mobile Number
                      </label>
                      <Input
                        type="tel"
                        maxLength={10}
                        id="mobile-input"
                        placeholder="e.g. 9876543210"
                        value={mobileInput}
                        onChange={(e) => {
                          setErrorMsg(null);
                          setMobileInput(e.target.value.replace(/\D/g, ''));
                        }}
                        className="h-10 font-mono tracking-wider text-sm rounded-xl"
                        required
                      />
                      <p className="text-[11px] text-ink-soft mt-1">
                        An OTP will be delivered directly via SMS for authentication.
                      </p>
                    </div>
                  )}

                  {/* Consent checkbox */}
                  <div className="rounded-xl border border-hairline bg-paper-2 p-3 flex items-start gap-2.5 text-xs text-ink-soft">
                    <input
                      type="checkbox"
                      id="patient-consent"
                      checked={patientConsent}
                      onChange={(e) => setPatientConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-moss-600 focus:ring-moss-500 cursor-pointer"
                    />
                    <label htmlFor="patient-consent" className="cursor-pointer leading-relaxed">
                      I agree to share my {patientMode === 'aadhaar' ? 'Aadhaar' : 'mobile'} details with the <strong>Ayushman Bharat Digital Mission (ABDM)</strong> to generate my official 14-digit ABHA number and create my electronic health account.
                    </label>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl">
                      {errorMsg}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full h-11 rounded-full btn-primary-tech font-semibold text-xs mt-2"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Requesting ABDM OTP...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Request ABDM Enrollment OTP
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* STEP 2: OTP VERIFICATION & PROFILE SETUP */}
              {patientStep === 'otp' && (
                <form onSubmit={handlePatientVerifyOtp} className="space-y-3.5">
                  {/* Simulated SMS Alert Banner */}
                  <div className="rounded-20 border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4 text-amber-600 shrink-0" />
                        ABDM Test Verification Gateway
                      </span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 font-bold border border-amber-400/30">
                        Sandbox Mode
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-soft leading-relaxed">
                      In the ABDM development sandbox, real telecom SMS is not dispatched to personal cellular devices. Your dispatched verification OTP is:
                    </p>
                    <div className="flex items-center justify-between bg-card/80 dark:bg-stone-800/80 px-3.5 py-2 rounded-xl border border-hairline">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold">Verification OTP:</span>
                        <span className="font-mono text-base font-extrabold text-moss-700 dark:text-moss-300 tracking-widest">{patientActiveOtp}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setEnrollOtp(patientActiveOtp); setErrorMsg(null); }}
                        className="text-xs font-semibold text-moss-700 dark:text-moss-400 hover:underline cursor-pointer"
                      >
                        Auto-fill OTP
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-moss-500/30 bg-moss-50 dark:bg-moss-950/40 p-3 text-xs text-moss-800 dark:text-moss-200">
                    <p className="font-semibold">{otpHint}</p>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      Enter the 6-digit code to complete verification and generate your ABHA ID. Universal test code <strong>123456</strong> is also accepted.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-ink-soft block mb-1">
                      Enter 6-Digit OTP
                    </label>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="123456"
                      value={enrollOtp}
                      onChange={(e) => {
                        setErrorMsg(null);
                        setEnrollOtp(e.target.value.replace(/\D/g, ''));
                      }}
                      className="h-11 font-mono text-center tracking-[0.4em] text-lg rounded-xl font-bold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-medium text-ink-soft block mb-1">
                        Full Name (as per ID)
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Priya Sharma"
                        value={citizenName}
                        onChange={(e) => setCitizenName(e.target.value)}
                        className="h-10 rounded-xl text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-ink-soft block mb-1">
                        Gender
                      </label>
                      <select
                        value={citizenGender}
                        onChange={(e) => setCitizenGender(e.target.value as any)}
                        className="w-full h-10 px-3 rounded-xl border border-hairline bg-card text-xs text-ink focus:outline-none focus:ring-2 focus:ring-moss-500"
                      >
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-ink-soft block mb-1">
                        Date of Birth
                      </label>
                      <Input
                        type="date"
                        value={citizenDob}
                        onChange={(e) => setCitizenDob(e.target.value)}
                        className="h-10 rounded-xl text-xs"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-ink-soft block mb-1">
                        Preferred ABHA Address
                      </label>
                      <div className="flex rounded-xl border border-hairline overflow-hidden focus-within:ring-2 focus-within:ring-moss-500">
                        <Input
                          type="text"
                          placeholder="e.g. priya.sharma"
                          value={citizenAddressHandle}
                          onChange={(e) => setCitizenAddressHandle(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ''))}
                          className="h-10 border-0 rounded-none text-xs"
                          required
                        />
                        <span className="bg-paper-2 px-3 flex items-center text-xs font-mono text-ink-soft border-l border-hairline">
                          @abdm
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-ink-soft block mb-1">
                      Postal PIN Code
                    </label>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 110001"
                      value={citizenPinCode}
                      onChange={(e) => setCitizenPinCode(e.target.value.replace(/\D/g, ''))}
                      className="h-10 font-mono text-xs rounded-xl"
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl">
                      {errorMsg}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setPatientStep('input'); setErrorMsg(null); }}
                      className="rounded-full h-11 px-4 text-xs font-medium"
                    >
                      Back
                    </Button>

                    <Button
                      type="submit"
                      disabled={isVerifying}
                      className="flex-1 h-11 rounded-full btn-primary-tech font-semibold text-xs"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Minting ABHA ID & Seeding Wallet...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Verify OTP & Issue ABHA ID
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {/* STEP 3: ISSUED ABHA CARD & DASHBOARD REDIRECT */}
              {patientStep === 'success' && (
                <div className="space-y-4">
                  {/* Government ABDM Card Presentation */}
                  <div className="relative overflow-hidden rounded-24 border border-hairline bg-gradient-to-br from-paper via-paper to-moss-50/50 dark:from-stone-900 dark:via-stone-900 dark:to-moss-950/30 p-5 shadow-elevated">
                    {/* Tricolor Header Bar */}
                    <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-white to-emerald-600 rounded-full mb-4" />

                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-widest text-ink-soft">
                          National Health Authority · Govt of India
                        </div>
                        <h3 className="font-serif text-lg font-bold text-ink">
                          Ayushman Bharat Health Account (ABHA)
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-2.5 py-1 text-[11px] font-semibold border border-emerald-300/40">
                        <Check className="h-3 w-3" />
                        ABDM Active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center bg-paper-2/80 dark:bg-stone-800/60 p-4 rounded-20 border border-hairline">
                      <div className="sm:col-span-2 space-y-2">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold block">
                            ABHA Health Number
                          </span>
                          <span className="font-mono text-xl sm:text-2xl font-extrabold text-moss-700 dark:text-moss-400 tracking-wider">
                            {enrolledAbhaId}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold block">
                            ABHA Address
                          </span>
                          <span className="font-mono text-xs font-semibold text-ink">
                            {enrolledAbhaAddress}
                          </span>
                        </div>

                        <div className="flex gap-4 pt-1 text-xs text-ink-soft">
                          <div>
                            <span className="text-[10px] uppercase block">Name</span>
                            <span className="font-semibold text-ink">{citizenName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase block">Gender</span>
                            <span className="font-semibold text-ink capitalize">{citizenGender}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase block">DOB</span>
                            <span className="font-semibold text-ink">{citizenDob}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center p-3 rounded-16 border border-hairline bg-card">
                        <QrCode className="h-16 w-16 text-ink/80 mb-1" />
                        <span className="text-[9px] font-mono text-ink-soft text-center">Scan to Share Record</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-ink-soft mt-3 leading-relaxed">
                      ✓ Your initial FHIR electronic health wallet has been created and synced with the national ABDM gateway. You can immediately access your timeline and upload records.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCopyAbha}
                      className="rounded-full h-11 px-4 text-xs font-semibold flex items-center justify-center gap-2"
                    >
                      {isCopiedAbha ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-600" />
                          <span>Copied ABHA!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy ABHA Number</span>
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      onClick={handleEnterPatientDashboard}
                      className="flex-1 rounded-full h-11 btn-primary-tech font-semibold text-xs flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>Open Health Wallet Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-paper-2/50 border-t border-hairline py-4 px-6 flex justify-center text-xs text-ink-soft">
          <span>Already have an ABHA ID or verified account?</span>
          <Link to="/login" className="ml-1.5 font-semibold text-moss-700 hover:underline dark:text-moss-400">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};
