import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, type UserRole } from '@/context/AuthContext';
import { GoogleAuthDialog } from '@/components/GoogleAuthDialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShieldCheck, Stethoscope, User, Loader2, ArrowRight, CheckCircle2, Lock, Pill } from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, loginPatient, loginPhysician, loginDoctor, loginAdmin, isAuthenticated, role: authRole } = useAuth();

  const [role, setRole] = useState<'patient' | 'physician' | 'doctor' | 'admin'>('patient');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [abhaInput, setAbhaInput] = useState<string>('91-1234-5678-9012');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [googleDialogOpen, setGoogleDialogOpen] = useState<boolean>(false);

  // If already logged in, redirect to scoped dashboard immediately
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

  const handleGoogleSignUp = () => {
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
    setGoogleDialogOpen(true);
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
      } else if (role === 'admin') {
        loginAdmin(fullName || 'System Administrator');
        navigate('/admin');
      } else {
        loginPatient(abhaInput || '91-1234-5678-9012', fullName || 'New Patient');
        navigate('/patient');
      }
    }, 500);
  };

  return (
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center py-10 px-4">
      <Card className="w-full max-w-lg rounded-28 border border-hairline bg-card shadow-elevated overflow-hidden animate-fade-up">
        {/* Account Access Banner */}
        <div className="bg-moss-500/10 border-b border-moss-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-moss-700 dark:text-moss-400">
          <span className="flex items-center gap-1.5 font-medium">
            <Lock className="h-3.5 w-3.5" />
            Secure Account Registration
          </span>
          <span className="font-mono text-[11px] font-semibold">
            Ready
          </span>
        </div>

        <CardHeader className="text-center pb-4 pt-6 px-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-moss-100 text-moss-600 dark:bg-moss-900/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="font-serif text-2xl font-bold tracking-tight">
            Create your HealthSafe Account
          </CardTitle>
          <CardDescription className="text-xs text-ink-soft mt-1">
            Sign up with Google or register your Health ID for immediate access.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 px-6">
          {/* Quick Google Sign Up Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignUp}
            className="w-full h-11 rounded-full border border-hairline bg-paper-2 hover:bg-card flex items-center justify-center gap-3 text-sm font-semibold transition-all shadow-sm"
          >
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
            <span>Sign up with Google</span>
          </Button>

          <div className="relative flex items-center justify-center text-xs">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-hairline" />
            </div>
            <span className="relative bg-card px-3 text-[11px] uppercase tracking-wider text-ink-soft">
              Or configure account details
            </span>
          </div>

          {/* Account Role Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-soft block">
              Choose your Account Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex flex-col items-center justify-center p-3 rounded-20 border text-xs font-medium transition-all ${
                  role === 'admin'
                    ? 'border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 ring-2 ring-amber-600/20'
                    : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
                }`}
              >
                <ShieldCheck className="h-4 w-4 mb-1" />
                <span>Admin</span>
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
                    : role === 'admin'
                    ? 'Admin Officer'
                    : 'Ramesh Kumar'
                }
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-ink-soft block mb-1">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            {role === 'patient' && (
              <div>
                <label className="text-xs font-medium text-ink-soft block mb-1">
                  ABHA Health ID (14 digits)
                </label>
                <Input
                  type="text"
                  placeholder="91-1234-5678-9012"
                  value={abhaInput}
                  onChange={(e) => setAbhaInput(e.target.value)}
                  className="h-10 font-mono text-xs rounded-xl"
                />
                <p className="text-[10px] text-ink-soft mt-1">
                  Default: 91-1234-5678-9012 (Pre-loaded with sample health records)
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-full bg-ink text-paper hover:bg-moss-600 font-semibold text-xs mt-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              Complete Sign Up ({role.toUpperCase()})
            </Button>
          </form>
        </CardContent>

        <CardFooter className="bg-paper-2/50 border-t border-hairline py-4 px-6 flex justify-center text-xs text-ink-soft">
          <span>Already have an account?</span>
          <Link to="/login" className="ml-1.5 font-semibold text-moss-700 hover:underline dark:text-moss-400">
            Sign In with existing profile
          </Link>
        </CardFooter>
      </Card>

      {/* Google Authentication Dialog */}
      <GoogleAuthDialog
        open={googleDialogOpen}
        onOpenChange={setGoogleDialogOpen}
        defaultRole={role}
      />
    </div>
  );
};
