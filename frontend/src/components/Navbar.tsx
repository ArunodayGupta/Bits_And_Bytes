import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Stethoscope, User, Menu, X, Leaf, House, LogOut, ShieldCheck } from 'lucide-react';
import { usePatientData } from '@/context/usePatientData';
import { useAuth } from '@/context/AuthContext';
import { PatientCard } from './PatientCard';
import { DataSourceSelect } from './DataSourceSelect';
import { ThemeToggle } from './ThemeToggle';

export const Navbar: React.FC = () => {
  const { patient, statusState, statusText } = usePatientData();
  const { role, abhaId, userName, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLanding = location.pathname === '/';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  const dotColorClass =
    statusState === 'live'
      ? 'bg-emerald-500 ring-emerald-500/30'
      : statusState === 'fallback'
      ? 'bg-amber-500 ring-amber-500/30'
      : 'bg-stone-400 ring-stone-400/20';

  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-[1640px] px-5 sm:px-8 lg:px-12">
      <nav
        aria-label="Main Navigation"
        className="glass-card flex items-center justify-between rounded-full border border-hairline px-4 py-2.5 shadow-elevated transition-all"
      >
        {/* Left: Brand or Role-Scoped Identity */}
        <div className="flex items-center gap-3">
          {/* Always show clean brand logo if on landing or auth pages, or if unauthenticated */}
          {isLanding || isAuthPage || !isAuthenticated ? (
            <Link to="/" className="flex items-center gap-2 font-serif text-xl text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-moss-600 text-paper">
                <Leaf className="h-4 w-4" />
              </span>
              <span>HealthSafe</span>
            </Link>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-hairline bg-card px-3 text-xs font-semibold text-ink transition-colors hover:bg-paper-2"
                aria-label="Return to home page"
              >
                <House className="h-3.5 w-3.5 text-moss-600" />
                <span className="hidden xl:inline">Home</span>
              </Link>

              {/* Only Patient role sees PatientCard */}
              {role === 'patient' && (
                <NavLink to="/patient" className="hover:opacity-90 transition-opacity">
                  <PatientCard patient={patient} compact />
                </NavLink>
              )}

              {/* Clinician badge */}
              {role === 'clinician' && (
                <div className="flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                  <Stethoscope className="h-4 w-4 text-sky-600" />
                  <span>{userName || 'Dr. Medical Practitioner'}</span>
                </div>
              )}

              {/* Admin badge */}
              {role === 'admin' && (
                <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
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
              {/* Patient role sees ONLY Patient Timeline */}
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

              {/* Clinician role sees ONLY Clinician Lookup */}
              {role === 'clinician' && (
                <NavLink
                  to="/clinician"
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      isActive ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                    }`
                  }
                >
                  <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                  <span>Clinician Lookup</span>
                </NavLink>
              )}

              {/* Admin role sees ONLY Admin Console */}
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

        {/* Right: Theme Toggle, Auth Actions & Scoped Controls */}
        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              {role === 'patient' && abhaId && (
                <span
                  title={`Active ABHA: ${abhaId}`}
                  className="inline-flex items-center gap-1 rounded-full bg-moss-500/10 border border-moss-500/20 px-3 py-1 font-mono text-xs font-medium text-moss-700 dark:text-moss-400"
                >
                  <User className="h-3 w-3" />
                  {abhaId.replace(/^(\d{2})-\d{4}-\d{4}-(\d{4})$/, '$1-••••-••••-$2')}
                </span>
              )}

              {role === 'patient' && <DataSourceSelect />}

              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="flex items-center gap-1 rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <LogOut className="h-3 w-3" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
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
        </div>

        {/* Mobile menu toggle */}
        <div className="flex lg:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-paper-2 text-ink"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="mt-2 flex flex-col gap-3 rounded-20 border border-hairline bg-card p-4 shadow-elevated lg:hidden animate-fade-up">
          {isAuthenticated ? (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Active Role: {role?.toUpperCase()}
              </span>

              {/* Strictly Role-Scoped Mobile Links */}
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

              {role === 'clinician' && (
                <NavLink
                  to="/clinician"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-medium bg-sky-600 text-paper"
                >
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span>Clinician Lookup</span>
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

              {role === 'patient' && (
                <div className="border-t border-hairline pt-2">
                  <DataSourceSelect />
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className="mt-2 flex items-center justify-center gap-2 rounded-full border border-hairline py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full border border-hairline py-2 text-xs font-semibold text-ink"
              >
                <House className="h-3.5 w-3.5 text-moss-600" />
                Home
              </Link>
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
