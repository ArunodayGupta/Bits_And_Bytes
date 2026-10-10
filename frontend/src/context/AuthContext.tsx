/**
 * frontend/src/context/AuthContext.tsx
 * Authentication Context supporting simulated ABHA login, Clerk, Google login, and Admin.
 *
 * Enforces strict role isolation across:
 * - Patient: can only access patient timelines/dashboard
 * - Clinician: can only access clinician prescription lookup
 * - Admin: can only access the administrative console
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export type UserRole = 'patient' | 'physician' | 'doctor' | 'admin' | 'clinician' | null;

export interface AuthContextValue {
  role: UserRole;
  abhaId: string | null;
  userName: string | null;
  userEmail: string | null;
  medicalRegNumber: string | null;
  medicalCouncil: string | null;
  hospitalAffiliation: string | null;
  isVerifiedProfessional: boolean;
  loginPatient: (abha: string, name?: string) => void;
  loginPhysician: (name?: string, credentials?: { regNumber?: string; council?: string; dispensary?: string }) => void;
  loginDoctor: (name?: string, credentials?: { regNumber?: string; council?: string; hospital?: string }) => void;
  loginClinician: (name?: string, credentials?: { regNumber?: string; council?: string; dispensary?: string }) => void;
  loginAdmin: (name?: string) => void;
  loginWithGoogle: (email: string, name?: string, preferredRole?: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const STORAGE_KEY_ROLE = 'healthsafe_auth_role';
const STORAGE_KEY_ABHA = 'healthsafe_auth_abha';
const STORAGE_KEY_NAME = 'healthsafe_auth_name';
const STORAGE_KEY_EMAIL = 'healthsafe_auth_email';
const STORAGE_KEY_REG = 'healthsafe_auth_reg';
const STORAGE_KEY_COUNCIL = 'healthsafe_auth_council';
const STORAGE_KEY_HOSPITAL = 'healthsafe_auth_hospital';
const STORAGE_KEY_VERIFIED = 'healthsafe_auth_verified';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(() => {
    return (sessionStorage.getItem(STORAGE_KEY_ROLE) as UserRole) || null;
  });

  const [abhaId, setAbhaId] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_KEY_ABHA) || null;
  });

  const [userName, setUserName] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_KEY_NAME) || null;
  });

  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_KEY_EMAIL) || null;
  });

  const [medicalRegNumber, setMedicalRegNumber] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_KEY_REG) || null;
  });

  const [medicalCouncil, setMedicalCouncil] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_KEY_COUNCIL) || null;
  });

  const [hospitalAffiliation, setHospitalAffiliation] = useState<string | null>(() => {
    return sessionStorage.getItem(STORAGE_KEY_HOSPITAL) || null;
  });

  const [isVerifiedProfessional, setIsVerifiedProfessional] = useState<boolean>(() => {
    return sessionStorage.getItem(STORAGE_KEY_VERIFIED) === 'true';
  });

  const loginPatient = useCallback((abha: string, name?: string) => {
    const norm = abha.trim();
    const finalName = name || 'Demo Patient';
    setRole('patient');
    setAbhaId(norm);
    setUserName(finalName);
    setMedicalRegNumber(null);
    setMedicalCouncil(null);
    setHospitalAffiliation(null);
    setIsVerifiedProfessional(false);

    sessionStorage.setItem(STORAGE_KEY_ROLE, 'patient');
    sessionStorage.setItem(STORAGE_KEY_ABHA, norm);
    sessionStorage.setItem(STORAGE_KEY_NAME, finalName);
    sessionStorage.removeItem(STORAGE_KEY_REG);
    sessionStorage.removeItem(STORAGE_KEY_COUNCIL);
    sessionStorage.removeItem(STORAGE_KEY_HOSPITAL);
    sessionStorage.removeItem(STORAGE_KEY_VERIFIED);
  }, []);

  const loginPhysician = useCallback(
    (name?: string, credentials?: { regNumber?: string; council?: string; dispensary?: string }) => {
      const finalName = name || 'Dr. Dispensary Physician';
      const reg = credentials?.regNumber || 'PMBJP-KEN-0428';
      const council = credentials?.council || 'Pharmacy Council of India (PCI)';
      const hosp = credentials?.dispensary || 'Pradhan Mantri Jan Aushadhi Kendra #0428';

      setRole('physician');
      setAbhaId(null);
      setUserName(finalName);
      setMedicalRegNumber(reg);
      setMedicalCouncil(council);
      setHospitalAffiliation(hosp);
      setIsVerifiedProfessional(true);

      sessionStorage.setItem(STORAGE_KEY_ROLE, 'physician');
      sessionStorage.removeItem(STORAGE_KEY_ABHA);
      sessionStorage.setItem(STORAGE_KEY_NAME, finalName);
      sessionStorage.setItem(STORAGE_KEY_REG, reg);
      sessionStorage.setItem(STORAGE_KEY_COUNCIL, council);
      sessionStorage.setItem(STORAGE_KEY_HOSPITAL, hosp);
      sessionStorage.setItem(STORAGE_KEY_VERIFIED, 'true');
    },
    []
  );

  const loginDoctor = useCallback(
    (name?: string, credentials?: { regNumber?: string; council?: string; hospital?: string }) => {
      const finalName = name || 'Dr. Rajesh Rao, MD';
      const reg = credentials?.regNumber || 'MCI-2018-98421';
      const council = credentials?.council || 'National Medical Commission (NMC)';
      const hosp = credentials?.hospital || 'Apollo Hospitals';

      setRole('doctor');
      setAbhaId(null);
      setUserName(finalName);
      setMedicalRegNumber(reg);
      setMedicalCouncil(council);
      setHospitalAffiliation(hosp);
      setIsVerifiedProfessional(true);

      sessionStorage.setItem(STORAGE_KEY_ROLE, 'doctor');
      sessionStorage.removeItem(STORAGE_KEY_ABHA);
      sessionStorage.setItem(STORAGE_KEY_NAME, finalName);
      sessionStorage.setItem(STORAGE_KEY_REG, reg);
      sessionStorage.setItem(STORAGE_KEY_COUNCIL, council);
      sessionStorage.setItem(STORAGE_KEY_HOSPITAL, hosp);
      sessionStorage.setItem(STORAGE_KEY_VERIFIED, 'true');
    },
    []
  );

  const loginClinician = useCallback(
    (name?: string, credentials?: { regNumber?: string; council?: string; dispensary?: string }) => {
      loginPhysician(name, credentials);
    },
    [loginPhysician]
  );

  const loginAdmin = useCallback((name?: string) => {
    const finalName = name || 'System Administrator';
    setRole('admin');
    setAbhaId(null);
    setUserName(finalName);
    sessionStorage.setItem(STORAGE_KEY_ROLE, 'admin');
    sessionStorage.removeItem(STORAGE_KEY_ABHA);
    sessionStorage.setItem(STORAGE_KEY_NAME, finalName);
  }, []);

  const loginWithGoogle = useCallback((email: string, name?: string, preferredRole: UserRole = 'patient') => {
    const normEmail = email.trim();
    const finalRole = preferredRole || 'patient';
    const finalName = name || normEmail.split('@')[0];
    setRole(finalRole);
    setUserEmail(normEmail);
    setUserName(finalName);
    sessionStorage.setItem(STORAGE_KEY_ROLE, finalRole);
    sessionStorage.setItem(STORAGE_KEY_EMAIL, normEmail);
    sessionStorage.setItem(STORAGE_KEY_NAME, finalName);

    if (finalRole === 'patient') {
      const defaultAbha = '91-1234-5678-9012';
      setAbhaId(defaultAbha);
      sessionStorage.setItem(STORAGE_KEY_ABHA, defaultAbha);
    } else {
      setAbhaId(null);
      sessionStorage.removeItem(STORAGE_KEY_ABHA);
    }
  }, []);

  const logout = useCallback(() => {
    setRole(null);
    setAbhaId(null);
    setUserName(null);
    setUserEmail(null);
    setMedicalRegNumber(null);
    setMedicalCouncil(null);
    setHospitalAffiliation(null);
    setIsVerifiedProfessional(false);

    sessionStorage.removeItem(STORAGE_KEY_ROLE);
    sessionStorage.removeItem(STORAGE_KEY_ABHA);
    sessionStorage.removeItem(STORAGE_KEY_NAME);
    sessionStorage.removeItem(STORAGE_KEY_EMAIL);
    sessionStorage.removeItem(STORAGE_KEY_REG);
    sessionStorage.removeItem(STORAGE_KEY_COUNCIL);
    sessionStorage.removeItem(STORAGE_KEY_HOSPITAL);
    sessionStorage.removeItem(STORAGE_KEY_VERIFIED);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        role,
        abhaId,
        userName,
        userEmail,
        medicalRegNumber,
        medicalCouncil,
        hospitalAffiliation,
        isVerifiedProfessional,
        loginPatient,
        loginPhysician,
        loginDoctor,
        loginClinician,
        loginAdmin,
        loginWithGoogle,
        logout,
        isAuthenticated: role !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function RequireRole({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { role } = useAuth();
  const location = useLocation();

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
