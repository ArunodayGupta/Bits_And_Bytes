import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Stethoscope, User, Loader2, ArrowRight, ExternalLink, Pill, Info } from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginPatient, loginPhysician, loginDoctor, isAuthenticated, role: authRole } = useAuth();

  const [role, setRole] = useState<'patient' | 'physician' | 'doctor'>('patient');
  const [fullName, setFullName] = useState<string>('');
  const [abhaInput, setAbhaInput] = useState<string>('91-1234-5678-9012');
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  const handleAbhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (role === 'doctor') {
        loginDoctor(fullName || 'Dr. Rajesh Rao, MD');
        navigate('/doctor');
      } else if (role === 'physician') {
        loginPhysician(fullName || 'Dr. Dispensary Physician');
        navigate('/physician');
      } else {
        loginPatient(abhaInput || '91-1234-5678-9012', fullName || 'New Patient');
        navigate('/patient');
      }
    }, 500);
  };

  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center py-10 px-4">
      <Card className="w-full max-w-lg rounded-28 border border-hairline bg-card shadow-elevated overflow-hidden animate-fade-up">
        <CardHeader className="text-center pb-4 pt-6 px-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-moss-100 text-moss-600 dark:bg-moss-900/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="font-serif text-2xl font-bold tracking-tight">
            Create your HealthSafe Account
          </CardTitle>
          <CardDescription className="text-xs text-ink-soft mt-1">
            Register with your ABHA Health ID to get started.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-6">
          {/* ABHA Info Banner */}
          <div className="rounded-xl border border-moss-500/20 bg-moss-500/5 p-3 flex items-start gap-2.5 text-xs text-moss-800 dark:text-moss-300">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-moss-600" />
            <span>
              An ABHA Health ID (Ayushman Bharat Health Account) is needed to register as a patient.{' '}
              <a
                href="https://abha.abdm.gov.in/abha/v3/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2 hover:text-moss-900 dark:hover:text-moss-200 inline-flex items-center gap-1"
              >
                Create your ABHA ID <ExternalLink className="h-3 w-3" />
              </a>
            </span>
          </div>

          {/* Account Role Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft block">
              Account Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('patient')}
                className={`flex flex-col items-center justify-center p-3 rounded-20 border text-xs font-medium transition-all ${
                  role === 'patient'
                    ? 'border-moss-600 bg-moss-50 text-moss-700 dark:bg-moss-900/30 dark:text-moss-300 ring-2 ring-moss-600/20'
                    : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
                }`}
              >
                <User className="h-4 w-4 mb-1" />
                <span>Patient</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('physician')}
                className={`flex flex-col items-center justify-center p-3 rounded-20 border text-xs font-medium transition-all ${
                  role === 'physician'
                    ? 'border-teal-600 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 ring-2 ring-teal-600/20'
                    : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
                }`}
              >
                <Pill className="h-4 w-4 mb-1" />
                <span>Physician</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('doctor')}
                className={`flex flex-col items-center justify-center p-3 rounded-20 border text-xs font-medium transition-all ${
                  role === 'doctor'
                    ? 'border-sky-600 bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 ring-2 ring-sky-600/20'
                    : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
                }`}
              >
                <Stethoscope className="h-4 w-4 mb-1" />
                <span>Doctor</span>
              </button>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-ink-soft block mb-1">
                Full Name
              </label>
              <Input
                type="text"
                placeholder={
                  role === 'doctor'
                    ? 'Dr. Rajesh Rao, MD'
                    : role === 'physician'
                    ? 'Dr. Dispensary Physician'
                    : 'Ramesh Kumar'
                }
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            {role === 'patient' && (
              <div>
                <label className="text-xs font-medium text-ink-soft block mb-1">
                  ABHA Health ID
                </label>
                <Input
                  type="text"
                  placeholder="91-XXXX-XXXX-XXXX"
                  value={abhaInput}
                  onChange={handleAbhaChange}
                  className="h-10 font-mono text-base text-center tracking-widest rounded-xl"
                  maxLength={17}
                />
                <p className="text-[10px] text-ink-soft mt-1">
                  Format: 91-XXXX-XXXX-XXXX · 14 digit ABDM Health Account ID
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || (role === 'patient' && abhaInput.replace(/\D/g, '').length !== 14)}
              className="w-full h-11 rounded-full bg-ink text-paper hover:bg-moss-600 font-semibold text-xs mt-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Create Account
            </Button>
          </form>
        </CardContent>

        <CardFooter className="bg-paper-2/50 border-t border-hairline py-4 px-6 flex justify-center text-xs text-ink-soft">
          <span>Already have an account?</span>
          <Link to="/login" className="ml-1.5 font-semibold text-moss-700 hover:underline dark:text-moss-400">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};
