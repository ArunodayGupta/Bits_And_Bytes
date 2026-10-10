import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Stethoscope, User, Menu, X, Leaf, LogOut, ShieldCheck, Pill } from 'lucide-react';
import { usePatientData } from '@/context/usePatientData';
import { useAuth } from '@/context/AuthContext';
import { PatientCard } from './PatientCard';
import { ThemeToggle } from './ThemeToggle';

export const Navbar: React.FC = () => {
  const { patient, statusState, statusText } = usePatientData();
  const { role, abhaId, userName, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLanding = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  const dashboardRoute =
    role === 'doctor'
      ? '/doctor'
      : role === 'physician' || role === 'clinician'
      ? '/physician'
      : role === 'admin'
      ? '/admin'
      : '/patient';

  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-[1640px] px-5 sm:px-8 lg:px-12">
      <nav
        aria-label="Main Navigation"
        className="glass-card flex items-center justify-between rounded-full border border-hairline px-4 py-2.5 shadow-elevated transition-all"
      >
        {/* Left: Brand Logo & User Role Identity */}
        <div className="flex items-center gap-3">
          {/* Brand Logo - links to role dashboard when logged in, or root when guest */}
          <Link
            to={isAuthenticated ? dashboardRoute : '/'}
            className="flex items-center gap-2 font-serif text-xl text-ink hover:opacity-95 transition-opacity"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-moss-600 text-paper">
              <Leaf className="h-4 w-4" />
            </span>
            <span>HealthSafe</span>
          </Link>

          {isAuthenticated && (
            <div className="flex items-center gap-2.5">
              {/* Only Patient role sees PatientCard */}
              {role === 'patient' && (
                <NavLink to="/patient" className="hover:opacity-90 transition-opacity">
                  <PatientCard patient={patient} compact />
                </NavLink>
              )}

              {/* Physician badge */}
              {(role === 'physician' || role === 'clinician') && (
                <div className="flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                  <Pill className="h-3.5 w-3.5 text-teal-600" />
                  <span>{userName || 'Dr. Dispensary Physician'}</span>
                </div>
              )}

              {/* Doctor badge */}
              {role === 'doctor' && (
                <div className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                  <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                  <span>{userName || 'Dr. Rajesh Rao, MD'}</span>
                </div>
              )}

              {/* Admin badge */}
              {role === 'admin' && (
                <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                  <span>Admin Console</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Centre: Strict Role-Scoped Tab Switcher */}
        <div className="hidden sm:flex items-center rounded-full bg-paper-2/90 p-1 border border-hairline">
          {isLanding ? (
            <>
              <a href="#patients" className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink">
                For Patients
              </a>
              <a href="#doctors" className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink">
                For Doctors
              </a>
              <a href="#how-it-works" className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink">
                How it works
              </a>
              <a href="#features" className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink">
                Features
              </a>
            </>
          ) : isAuthPage || !isAuthenticated ? null : (
            <>
              {/* 1. Patient role sees ONLY Patient Timeline */}
              {role === 'patient' && (
                <NavLink
                  to="/patient"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      isActive ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                    }`
                  }
                >
                  <User className="h-3.5 w-3.5 text-moss-600" />
                  <span>Patient Timeline</span>
                </NavLink>
              )}

              {/* 2. Physician role sees ONLY Physician Portal */}
              {(role === 'physician' || role === 'clinician') && (
                <NavLink
                  to="/physician"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      isActive ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                    }`
                  }
                >
                  <Pill className="h-3.5 w-3.5 text-teal-600" />
                  <span>Physician Portal</span>
                </NavLink>
              )}

              {/* 3. Doctor role sees ONLY Doctor Portal */}
              {role === 'doctor' && (
                <NavLink
                  to="/doctor"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      isActive ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                    }`
                  }
                >
                  <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                  <span>Doctor Portal</span>
                </NavLink>
              )}

              {/* 4. Admin role sees ONLY Admin Console */}
              {role === 'admin' && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      isActive ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                    }`
                  }
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                  <span>Admin Console</span>
                </NavLink>
              )}
            </>
          )}
        </div>

        {/* Right: Theme Toggle, User ABHA, & Prominent Logout */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          {isAuthenticated && !isAuthPage ? (
            <div className="flex items-center gap-2">
              {role === 'patient' && abhaId && (
                <span
                  title={`Active ABHA: ${abhaId}`}
                  className="hidden md:inline-flex items-center gap-1 rounded-full bg-moss-500/10 border border-moss-500/20 px-3 py-1 font-mono text-xs font-medium text-moss-700 dark:text-moss-400"
                >
                  <User className="h-3 w-3" />
                  {abhaId.replace(/^(\d{2})-\d{4}-\d{4}-(\d{4})$/, '$1-••••-••••-$2')}
                </span>
              )}

              {/* Prominent Always-Visible Logout Button */}
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 px-3.5 py-1.5 text-xs font-semibold transition-colors shadow-sm"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              {location.pathname !== '/login' && (
                <Link
                  to="/login"
                  className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper-2"
                >
                  Sign In
                </Link>
              )}
              {location.pathname !== '/signup' && (
                <Link
                  to="/signup"
                  className="rounded-full bg-moss-600 px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-moss-700"
                >
                  Sign Up
                </Link>
              )}
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex sm:hidden h-9 w-9 items-center justify-center rounded-full border border-hairline bg-paper-2 text-ink"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mt-2 flex flex-col gap-3 rounded-20 border border-hairline bg-card p-4 shadow-elevated sm:hidden animate-fade-up">
          {isAuthenticated && !isAuthPage ? (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Active Role: {role?.toUpperCase()}
              </span>

              {/* Role-Scoped Mobile Link */}
              {role === 'patient' && (
                <NavLink
                  to="/patient"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-medium bg-moss-600 text-paper"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Patient Timeline</span>
                </NavLink>
              )}

              {(role === 'physician' || role === 'clinician') && (
                <NavLink
                  to="/physician"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-medium bg-teal-600 text-paper"
                >
                  <Pill className="h-3.5 w-3.5" />
                  <span>Physician Portal</span>
                </NavLink>
              )}

              {role === 'doctor' && (
                <NavLink
                  to="/doctor"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-medium bg-sky-600 text-paper"
                >
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span>Doctor Portal</span>
                </NavLink>
              )}

              {role === 'admin' && (
                <NavLink
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-medium bg-amber-600 text-paper"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Admin Console</span>
                </NavLink>
              )}

              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="mt-2 flex items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center rounded-full bg-ink py-2 text-xs font-semibold text-paper"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center rounded-full bg-moss-600 py-2 text-xs font-semibold text-paper"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
