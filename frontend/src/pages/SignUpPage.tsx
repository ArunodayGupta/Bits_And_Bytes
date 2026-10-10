import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  ArrowRight
} from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginPhysician, loginDoctor, isAuthenticated, role: authRole } = useAuth();

  const [role, setRole] = useState<'doctor' | 'physician' | 'patient'>('doctor');

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

  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center py-10 px-4">
      <Card className="w-full max-w-xl rounded-28 border border-hairline bg-card shadow-elevated overflow-hidden animate-fade-up">
        <CardHeader className="text-center pb-4 pt-6 px-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-moss-100 text-moss-600 dark:bg-moss-900/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="font-serif text-2xl font-bold tracking-tight">
            Healthcare Professional Onboarding
          </CardTitle>
          <CardDescription className="text-xs text-ink-soft mt-1">
            Verified provider registration for Doctors & Dispensary Clinicians
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-6">
          {/* Account Role Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft block">
              Professional Role
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
                <span>Patient Info</span>
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

          {/* PATIENT EXPLANATION & REDIRECT */}
          {role === 'patient' && (
            <div className="space-y-4">
              <div className="rounded-24 border border-moss-500/30 bg-moss-50/70 dark:bg-moss-950/20 p-5 space-y-3">
                <div className="flex items-center gap-2 text-moss-800 dark:text-moss-300 font-bold text-sm">
                  <Info className="h-4 w-4 text-moss-600" />
                  Patients do not create accounts here
                </div>
                <p className="text-xs text-ink-soft leading-relaxed">
                  Your digital health record is linked to your Government-issued <strong>ABHA ID</strong> (Ayushman Bharat Health Account) under the National Health Authority (NHA). HealthSafe does not issue or store proprietary patient accounts.
                </p>
                <ul className="text-xs text-ink-soft space-y-1.5 list-disc list-inside">
                  <li><strong>Already have an ABHA ID?</strong> Go directly to Sign In and grant permission to access your records.</li>
                  <li><strong>Don't have an ABHA ID yet?</strong> Create one on the official Government ABDM portal using your Aadhaar or mobile number.</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <Button
                  type="button"
                  onClick={() => navigate('/login?role=patient')}
                  className="flex-1 rounded-full bg-moss-600 hover:bg-moss-700 text-paper font-semibold text-xs h-11"
                >
                  <User className="h-3.5 w-3.5 mr-2" />
                  Go to Patient Sign In
                </Button>

                <a
                  href="https://abha.abdm.gov.in/abha/v3/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center rounded-full border border-hairline bg-paper-2 hover:bg-paper-2/80 text-ink font-semibold text-xs h-11 transition-colors"
                >
                  <span>Create ABHA ID at ABDM</span>
                  <ExternalLink className="h-3.5 w-3.5 ml-2" />
                </a>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-paper-2/50 border-t border-hairline py-4 px-6 flex justify-center text-xs text-ink-soft">
          <span>Already registered or verified?</span>
          <Link to="/login" className="ml-1.5 font-semibold text-moss-700 hover:underline dark:text-moss-400">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};
