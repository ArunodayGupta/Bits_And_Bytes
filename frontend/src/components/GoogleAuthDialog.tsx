import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '@/context/AuthContext';
import { usePatientData } from '@/context/usePatientData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink, Check, Plus, User, ShieldCheck, Stethoscope, Pill } from 'lucide-react';

interface GoogleAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole?: UserRole;
}

interface DemoGoogleAccount {
  email: string;
  name: string;
  avatarColor: string;
  suggestedRole: UserRole;
  abhaId?: string;
}

const PRESET_ACCOUNTS: DemoGoogleAccount[] = [
  {
    email: 'piyushmishra0207@gmail.com',
    name: 'Piyush Mishra',
    avatarColor: 'bg-blue-600',
    suggestedRole: 'patient',
    abhaId: '91-1234-5678-9012',
  },
  {
    email: 'dr.rajesh.rao@gmail.com',
    name: 'Dr. Rajesh Rao, MD',
    avatarColor: 'bg-emerald-600',
    suggestedRole: 'doctor',
  },
  {
    email: 'dispensary.physician@gmail.com',
    name: 'Dr. Dispensary Physician',
    avatarColor: 'bg-teal-600',
    suggestedRole: 'physician',
  },
  {
    email: 'admin.healthsafe@gmail.com',
    name: 'System Administrator',
    avatarColor: 'bg-amber-600',
    suggestedRole: 'admin',
  },
];

export const GoogleAuthDialog: React.FC<GoogleAuthDialogProps> = ({
  open,
  onOpenChange,
  defaultRole = 'patient',
}) => {
  const navigate = useNavigate();
  const { loginWithGoogle, loginPatient } = useAuth();
  const { setPatientId, availablePatients } = usePatientData();

  const [selectedEmail, setSelectedEmail] = useState<string>(PRESET_ACCOUNTS[0].email);
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole || 'patient');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [customEmail, setCustomEmail] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Synchronize role if defaultRole changes
  React.useEffect(() => {
    if (defaultRole) {
      setSelectedRole(defaultRole);
    }
  }, [defaultRole]);

  const handleOpenGoogleSite = () => {
    // Launch Google's official Sign-In / Account Chooser auth site
    const width = 520;
    const height = 620;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      'https://accounts.google.com/AccountChooser?service=lso',
      'google_auth_window',
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no`
    );
  };

  const handleSelectAccount = (acc: DemoGoogleAccount) => {
    setIsCustom(false);
    setSelectedEmail(acc.email);
    if (!defaultRole) {
      setSelectedRole(acc.suggestedRole);
    }
  };

  const handleConfirmLogin = () => {
    setIsSubmitting(true);

    let finalEmail = selectedEmail;
    let finalName = 'Google User';

    if (isCustom) {
      finalEmail = customEmail.trim() || 'user@gmail.com';
      finalName = customName.trim() || finalEmail.split('@')[0];
    } else {
      const acc = PRESET_ACCOUNTS.find((a) => a.email === selectedEmail);
      if (acc) {
        finalName = acc.name;
      }
    }

    const roleToUse = selectedRole || 'patient';

    // If patient role, bind to first patient profile
    if (roleToUse === 'patient' && availablePatients.length > 0) {
      setPatientId(availablePatients[0].id);
    }

    loginWithGoogle(finalEmail, finalName, roleToUse);

    setIsSubmitting(false);
    onOpenChange(false);

    // Route directly to scoped dashboard
    if (roleToUse === 'doctor') {
      navigate('/doctor', { replace: true });
    } else if (roleToUse === 'physician' || roleToUse === 'clinician') {
      navigate('/physician', { replace: true });
    } else if (roleToUse === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/patient', { replace: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-28 border border-hairline bg-card shadow-elevated">
        <DialogHeader className="text-center sm:text-center pb-2">
          {/* Google G Brand Logo */}
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-paper-2 border border-hairline shadow-sm">
            <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
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
          </div>
          <DialogTitle className="font-serif text-xl font-bold">
            Sign in with Google
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-soft">
            Choose a Google account or open the Google authentication window to continue.
          </DialogDescription>
        </DialogHeader>

        {/* Real Google Auth Site Launcher Button */}
        <div className="pt-1 pb-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenGoogleSite}
            className="w-full h-10 rounded-full border border-blue-500/30 bg-blue-50/50 hover:bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-500/40 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <span>Open Google Sign-In Window (accounts.google.com)</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Account Selector List */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft block">
            Select Google Profile:
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {PRESET_ACCOUNTS.map((acc) => {
              const isSelected = !isCustom && selectedEmail === acc.email;
              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectAccount(acc)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-600/30'
                      : 'border-hairline bg-paper-2 hover:bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-8 w-8 rounded-full ${acc.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0`}
                    >
                      {acc.name[0]}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-semibold text-ink truncate">{acc.name}</div>
                      <div className="text-[11px] text-ink-soft truncate font-mono">{acc.email}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0 mr-1" />}
                </button>
              );
            })}

            {/* Custom Account Option */}
            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                isCustom
                  ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 ring-1 ring-blue-600/30'
                  : 'border-hairline bg-paper-2 hover:bg-card'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-paper-2 border border-hairline flex items-center justify-center text-ink-soft shrink-0">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="text-xs font-semibold text-ink">Use another Google account</div>
              </div>
              {isCustom && <Check className="h-4 w-4 text-blue-600 shrink-0 mr-1" />}
            </button>
          </div>
        </div>

        {/* If Custom Account is selected */}
        {isCustom && (
          <div className="space-y-2 rounded-xl border border-hairline bg-paper-2 p-3 animate-fade-up">
            <Input
              type="email"
              placeholder="Your Google email (e.g. name@gmail.com)"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              className="h-9 text-xs"
            />
            <Input
              type="text"
              placeholder="Your Full Name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        )}

        {/* Target Role Selector */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft block">
            Select Portal Access:
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedRole('patient')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-medium transition-all ${
                selectedRole === 'patient'
                  ? 'border-moss-600 bg-moss-50 text-moss-700 dark:bg-moss-900/40 dark:text-moss-300 font-semibold ring-1 ring-moss-600'
                  : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
              }`}
            >
              <User className="h-3.5 w-3.5 mb-0.5" />
              <span>Patient</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('physician')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-medium transition-all ${
                selectedRole === 'physician'
                  ? 'border-teal-600 bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 font-semibold ring-1 ring-teal-600'
                  : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
              }`}
            >
              <Pill className="h-3.5 w-3.5 mb-0.5" />
              <span>Physician</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('doctor')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-medium transition-all ${
                selectedRole === 'doctor'
                  ? 'border-sky-600 bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 font-semibold ring-1 ring-sky-600'
                  : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5 mb-0.5" />
              <span>Doctor</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('admin')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-[11px] font-medium transition-all ${
                selectedRole === 'admin'
                  ? 'border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-semibold ring-1 ring-amber-600'
                  : 'border-hairline bg-paper-2 text-ink-soft hover:text-ink'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 mb-0.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-full text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirmLogin}
            disabled={isSubmitting}
            className="flex-1 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            Continue with Google
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
