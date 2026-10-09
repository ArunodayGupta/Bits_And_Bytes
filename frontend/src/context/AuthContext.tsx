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
  loginPatient: (abha: string, name?: string) => void;
  loginPhysician: (name?: string) => void;
  loginDoctor: (name?: string) => void;
  loginClinician: (name?: string) => void;
  loginAdmin: (name?: string) => void;
  loginWithGoogle: (email: string, name?: string, preferredRole?: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const STORAGE_KEY_ROLE = 'healthsafe_auth_role';
const STORAGE_KEY_ABHA = 'healthsafe_auth_abha';
const STORAGE_KEY_NAME = 'healthsafe_auth_name';
const STORAGE_KEY_EMAIL = 'healthsafe_auth_email';

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

  const loginPatient = useCallback((abha: string, name?: string) => {
    const norm = abha.trim();
    const finalName = name || 'Demo Patient';
    setRole('patient');
    setAbhaId(norm);
    setUserName(finalName);
    sessionStorage.setItem(STORAGE_KEY_ROLE, 'patient');
    sessionStorage.setItem(STORAGE_KEY_ABHA, norm);
    sessionStorage.setItem(STORAGE_KEY_NAME, finalName);
  }, []);

  const loginPhysician = useCallback((name?: string) => {
    const finalName = name || 'Dr. Dispensary Physician';
    setRole('physician');
    setAbhaId(null);
    setUserName(finalName);
    sessionStorage.setItem(STORAGE_KEY_ROLE, 'physician');
    sessionStorage.removeItem(STORAGE_KEY_ABHA);
    sessionStorage.setItem(STORAGE_KEY_NAME, finalName);
  }, []);

  const loginDoctor = useCallback((name?: string) => {
    const finalName = name || 'Dr. Rajesh Rao, MD';
    setRole('doctor');
    setAbhaId(null);
    setUserName(finalName);
    sessionStorage.setItem(STORAGE_KEY_ROLE, 'doctor');
    sessionStorage.removeItem(STORAGE_KEY_ABHA);
    sessionStorage.setItem(STORAGE_KEY_NAME, finalName);
  }, []);

  const loginClinician = useCallback((name?: string) => {
    loginPhysician(name);
  }, [loginPhysician]);

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
    sessionStorage.removeItem(STORAGE_KEY_ROLE);
    sessionStorage.removeItem(STORAGE_KEY_ABHA);
    sessionStorage.removeItem(STORAGE_KEY_NAME);
    sessionStorage.removeItem(STORAGE_KEY_EMAIL);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        role,
        abhaId,
        userName,
        userEmail,
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
