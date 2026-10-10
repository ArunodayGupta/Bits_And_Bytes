import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { usePatientData } from '@/context/usePatientData';
import { Stethoscope, Pill, ShieldCheck, User, ExternalLink, Leaf, Database } from 'lucide-react';

export const AppFooter: React.FC = () => {
  const location = useLocation();
  const { role, abhaId, userName, isAuthenticated } = useAuth();
  const { patient, bundle } = usePatientData();

  const path = location.pathname;
  const isPatientTab = path === '/patient';
  const isDoctorTab = path === '/doctor';
  const isPhysicianTab = path === '/physician';
  const isAdminTab = path === '/admin';

  const patientName = patient?.name?.[0]?.text || 'Ramesh Kumar';
  const totalRecords = bundle?.entry?.length || 4;

  return (
    <footer className="w-full border-t border-hairline bg-card/60 backdrop-blur-sm py-6 px-4 text-xs text-ink-soft transition-all">
      <div className="mx-auto max-w-[1640px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Tab-specific contextual data */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-center md:text-left">
            <Link
              to="/"
              className="flex items-center gap-1.5 font-serif italic text-sm text-ink font-semibold hover:opacity-80 transition-opacity"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-moss-600 text-paper">
                <Leaf className="h-3 w-3" />
              </span>
              HealthSafe
            </Link>

            <span className="text-hairline hidden md:inline">|</span>

            {/* Context for Patient Tab */}
            {isPatientTab && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-moss-500/10 text-moss-700 dark:text-moss-300 px-2.5 py-0.5 font-medium">
                  <User className="h-3 w-3" />
                  {patientName}
                </span>
                <span className="font-mono text-ink-soft">
                  ABHA: {abhaId ? abhaId.replace(/^(\d{2})-\d{4}-\d{4}-(\d{4})$/, '$1-••••-••••-$2') : '91-••••-••••-9012'}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Database className="h-3 w-3" />
                  {totalRecords} records synced
                </span>
              </div>
            )}

            {/* Context for Doctor Tab */}
            {isDoctorTab && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 px-2.5 py-0.5 font-medium">
                  <Stethoscope className="h-3 w-3" />
                  {userName || 'Dr. Rajesh Rao, MD'}
                </span>
                <span className="text-ink-soft">Apollo Hospitals</span>
                <span className="text-sky-600 dark:text-sky-400 font-medium">
                  Doctor Clinical Portal Active
                </span>
              </div>
            )}

            {/* Context for Physician Tab */}
            {isPhysicianTab && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 font-medium">
                  <Pill className="h-3 w-3" />
                  {userName || 'Dr. Dispensary Physician'}
                </span>
                <span className="text-teal-600 dark:text-teal-400 font-medium">
                  Jan Aushadhi PMBJP Generic Mapping Active
                </span>
              </div>
            )}

            {/* Context for Admin Tab */}
            {isAdminTab && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 font-medium">
                  <ShieldCheck className="h-3 w-3" />
                  System Administrator
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Security & Access Audit Console
                </span>
              </div>
            )}

            {/* Context for Landing / Public pages */}
            {!isPatientTab && !isDoctorTab && !isPhysicianTab && !isAdminTab && (
              <span className="text-[11px] text-ink-soft">
                Your medical history, in one secure place
              </span>
            )}
          </div>

          {/* Right: Quick Tab Links & ABDM Portal Redirect */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 text-[11px]">
            {isAuthenticated ? (
              <>
                <Link
                  to="/patient"
                  className={`hover:text-ink transition-colors ${isPatientTab ? 'text-moss-700 dark:text-moss-300 font-semibold underline underline-offset-4' : ''}`}
                >
                  Patient
                </Link>
                <Link
                  to="/doctor"
                  className={`hover:text-ink transition-colors ${isDoctorTab ? 'text-sky-700 dark:text-sky-300 font-semibold underline underline-offset-4' : ''}`}
                >
                  Doctor Portal
                </Link>
                <Link
                  to="/physician"
                  className={`hover:text-ink transition-colors ${isPhysicianTab ? 'text-teal-700 dark:text-teal-300 font-semibold underline underline-offset-4' : ''}`}
                >
                  Physician Portal
                </Link>
                <Link
                  to="/admin"
                  className={`hover:text-ink transition-colors ${isAdminTab ? 'text-amber-700 dark:text-amber-300 font-semibold underline underline-offset-4' : ''}`}
                >
                  Admin
                </Link>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-ink">Patient Sign In</Link>
                <Link to="/login?role=doctor" className="hover:text-ink">Doctor Login</Link>
                <Link to="/login?role=physician" className="hover:text-ink">Physician Login</Link>
                <Link to="/login?role=admin" className="hover:text-ink">Admin Console</Link>
              </>
            )}

            <span className="text-hairline">·</span>

            {/* Actual ABDM ABHA ID website redirect */}
            <a
              href="https://abha.abdm.gov.in/abha/v3/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-moss-700 dark:text-moss-400 hover:underline"
              title="Official National Health Authority ABHA ID creation portal"
            >
              <span>Create ABHA ID</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
