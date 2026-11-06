import React, { useState } from 'react';
import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Stethoscope, User, Menu, X, Leaf, LogOut, ShieldCheck, Pill } from 'lucide-react';
import {
  Stethoscope,
  User,
  Menu,
  X,
  Leaf,
  LogOut,
  ShieldCheck,
  Pill,
  ChevronDown,
  Layers,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { usePatientData } from '@/context/usePatientData';
import { useAuth } from '@/context/AuthContext';
import { PatientCard } from './PatientCard';
import { ThemeToggle } from './ThemeToggle';

interface PortalOption {
  id: 'patient' | 'doctor' | 'physician' | 'admin';
  name: string;
  badge: string;
  desc: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgLightClass: string;
}

const PORTAL_OPTIONS: PortalOption[] = [
  {
    id: 'patient',
    name: 'Patient Health Wallet',
    badge: 'Citizen Portal',
    desc: 'ABDM Timeline, FHIR records & consent share',
    path: '/patient',
    icon: User,
    colorClass: 'text-moss-600 dark:text-moss-400',
    bgLightClass: 'bg-moss-500/10 border-moss-500/30',
  },
  {
    id: 'doctor',
    name: 'Doctor Clinical Suite',
    badge: 'NMC Verified',
    desc: 'Issue e-prescriptions & query longitudinal history',
    path: '/doctor',
    icon: Stethoscope,
    colorClass: 'text-sky-600 dark:text-sky-400',
    bgLightClass: 'bg-sky-500/10 border-sky-500/30',
  },
  {
    id: 'physician',
    name: 'Jan Aushadhi Dispensary',
    badge: 'PMBJP Officer',
    desc: 'Generic medicine substitution & INR savings calculator',
    path: '/physician',
    icon: Pill,
    colorClass: 'text-teal-600 dark:text-teal-400',
    bgLightClass: 'bg-teal-500/10 border-teal-500/30',
  },
  {
    id: 'admin',
    name: 'Admin Audit Console',
    badge: 'System Auditor',
    desc: 'ABDM telemetry, access logs & gateway security',
    path: '/admin',
    icon: ShieldCheck,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgLightClass: 'bg-amber-500/10 border-amber-500/30',
  },
];

export const Navbar: React.FC = () => {
  const { patient, statusState, statusText } = usePatientData();
  const { role, abhaId, userName, isAuthenticated, logout } = useAuth();
  const { patient } = usePatientData();
  const {
    role,
    abhaId,
    userName,
    isAuthenticated,
    logout,
    loginPatient,
    loginDoctor,
    loginPhysician,
    loginAdmin,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalsDropdownOpen, setPortalsDropdownOpen] = useState(false);
  const [copiedAbha, setCopiedAbha] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown on outside click or escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setPortalsDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPortalsDropdownOpen(false);
      }
    }

    if (portalsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [portalsDropdownOpen]);

  // Handle switching portals
  const handleSelectPortal = (target: PortalOption) => {
    setPortalsDropdownOpen(false);
    setMobileMenuOpen(false);

    if (isAuthenticated) {
      if (target.id === 'patient') {
        loginPatient('91-1234-5678-9012', 'Ramesh Kumar');
        navigate('/patient');
      } else if (target.id === 'doctor') {
        loginDoctor('Dr. Rajesh Rao, MD', {
          regNumber: 'MCI-2018-98421',
          council: 'National Medical Commission',
          hospital: 'Apollo Hospitals',
        });
        navigate('/doctor');
      } else if (target.id === 'physician') {
        loginPhysician('Dr. Dispensary Physician', {
          regNumber: 'PMBJP-KEN-0428',
          council: 'Pharmacy Council of India (PCI)',
          dispensary: 'Pradhan Mantri Jan Aushadhi Kendra #0428',
        });
        navigate('/physician');
      } else if (target.id === 'admin') {
        loginAdmin('System Auditor');
        navigate('/admin');
      }
    } else {
      // Guest: navigate to targeted login tab
      navigate(`/login?role=${target.id}`);
    }
  };

  const handleCopyAbha = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!abhaId) return;
    navigator.clipboard.writeText(abhaId);
    setCopiedAbha(true);
    setTimeout(() => setCopiedAbha(false), 2000);
  };

  return (
    <header className="sticky top-2 sm:top-4 z-40 mx-auto w-full max-w-[1640px] px-3 sm:px-8 lg:px-12">
      <header className="sticky top-2 sm:top-4 z-40 mx-auto w-full max-w-[1640px] px-3 sm:px-6 lg:px-10">
        <nav
          aria-label="Main Navigation"
          className="glass-card flex items-center justify-between rounded-full border border-hairline px-3 sm:px-4 py-2 sm:py-2.5 shadow-elevated transition-all"
          className="glass-nav flex items-center justify-between rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 transition-all"
        >
          {/* Left: Brand Logo & User Role Identity */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Brand Logo - links to role dashboard when logged in, or root when guest */}
            {/* Left: Brand Identity & Live Gateway Status */}
            <div className="flex items-center gap-2.5 sm:gap-4">
              <Link
                to={isAuthenticated ? dashboardRoute : '/'}
                className="flex items-center gap-1.5 sm:gap-2 font-serif text-lg sm:text-xl text-ink hover:opacity-95 transition-opacity shrink-0"
                className="flex items-center gap-2 font-serif text-lg sm:text-xl text-ink hover:opacity-90 transition-opacity shrink-0"
              >
                <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-moss-600 text-paper">
                  <Leaf className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-moss-600 text-paper shadow-xs">
                    <Leaf className="h-4 w-4" />
                  </span>
                  <span>HealthSafe</span>
                  <span className="tracking-tight font-bold">HealthSafe</span>
              </Link>

              {isAuthenticated && (
                <div className="hidden sm:flex items-center gap-2.5">
                  {/* Only Patient role sees PatientCard */}
                  {role === 'patient' && (
                    <NavLink to="/patient" className="hover:opacity-90 transition-opacity">
                      <PatientCard patient={patient} compact />
                    </NavLink>
                  )}
                  {/* ABDM Live Gateway Pulse */}
                  <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>ABDM Connected · M1/V3</span>
                  </div>

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
                  {/* User role preview on desktop if authenticated */}
                  {isAuthenticated && role === 'patient' && (
                    <div className="hidden xl:block">
                      <NavLink to="/patient" className="hover:opacity-90 transition-opacity">
                        <PatientCard patient={patient} compact />
                      </NavLink>
                    </div>
                  )}
                </div>

        {/* Centre: Strict Role-Scoped Tab Switcher */}
              <div className="hidden sm:flex items-center rounded-full bg-paper-2/90 p-1 border border-hairline">
                {/* Center: Enhanced Navigation & Portal Switcher */}
                <div className="hidden md:flex items-center gap-1 rounded-full bg-paper-2/90 dark:bg-card/90 p-1 border border-hairline/80 shadow-xs relative">
                  {isLanding ? (
                    <>
                      <a href="#patients" className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink">
                        <a
                          href="#how-it-works"
                          className="rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink hover:bg-card/70 transition-all"
                        >
                          How it works
                        </a>
                        <a
                          href="#features"
                          className="rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink hover:bg-card/70 transition-all"
                        >
                          Features
                        </a>
                        <a
                          href="#patients"
                          className="rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink hover:bg-card/70 transition-all"
                        >
                          For Patients
                        </a>
                        <a href="#doctors" className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink">
                          <a
                            href="#doctors"
                            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-soft hover:text-ink hover:bg-card/70 transition-all"
                          >
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
                          {/* Active Portal Pill */}
                          {role === 'patient' && (
                            <NavLink
                              to="/patient"
                              className={({ isActive }) =>
                                `relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${isActive ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                                }`
                              }
                              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold bg-card text-ink shadow-xs border border-hairline/60"
                            >
                              <User className="h-3.5 w-3.5 text-moss-600" />
                              <span>Patient Timeline</span>
                              <span>Patient Wallet</span>
                            </NavLink>
                          )}

                          {/* 2. Physician role sees ONLY Physician Portal */}
                          {(role === 'physician' || role === 'clinician') && (
                            <NavLink
                              to="/physician"
                              className={({ isActive }) =>
                                `relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${isActive ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                                }`
                              }
                              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold bg-card text-ink shadow-xs border border-hairline/60"
                            >
                              <Pill className="h-3.5 w-3.5 text-teal-600" />
                              <span>Physician Portal</span>
                              <span>Dispensary Suite</span>
                            </NavLink>
                          )}

                          {/* 3. Doctor role sees ONLY Doctor Portal */}
                          {role === 'doctor' && (
                            <NavLink
                              to="/doctor"
                              className={({ isActive }) =>
                                `relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${isActive ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                                }`
                              }
                              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold bg-card text-ink shadow-xs border border-hairline/60"
                            >
                              <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
                              <span>Doctor Portal</span>
                              <span>Doctor Suite</span>
                            </NavLink>
                          )}

                          {/* 4. Admin role sees ONLY Admin Console */}
                          {role === 'admin' && (
                            <NavLink
                              to="/admin"
                              className={({ isActive }) =>
                                `relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${isActive ? 'bg-card text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
                                }`
                              }
                              className="flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold bg-card text-ink shadow-xs border border-hairline/60"
                            >
                              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                              <span>Admin Console</span>
                            </NavLink>
                          )}
                        </>
          )}

                        {/* Portals Explorer Button & Dropdown */}
                        <div ref={dropdownRef} className="relative">
                          <button
                            type="button"
                            onClick={() => setPortalsDropdownOpen(!portalsDropdownOpen)}
                            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${portalsDropdownOpen
                                ? 'bg-moss-600 text-paper dark:text-[#141915]'
                                : 'text-ink-soft hover:text-ink hover:bg-card/70'
                              }`}
                            aria-expanded={portalsDropdownOpen}
                            aria-haspopup="true"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            <span>Portals</span>
                            <ChevronDown
                              className={`h-3 w-3 transition-transform ${portalsDropdownOpen ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {/* Floating Portals Switcher Menu */}
                          {portalsDropdownOpen && (
                            <div className="portal-dropdown-panel absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 rounded-24 p-3.5 shadow-elevated border border-hairline z-50 animate-fade-up">
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-hairline/60 px-2">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-ink-soft">
                                  {isAuthenticated ? 'Switch Healthcare Portal' : 'Explore Platform Portals'}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-moss-500/10 text-moss-700 dark:text-moss-400 font-semibold">
                                  ABDM M1/V3
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {PORTAL_OPTIONS.map((opt) => {
                                  const Icon = opt.icon;
                                  const isActive = role === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => handleSelectPortal(opt)}
                                      className={`w-full flex items-start gap-3 p-2.5 rounded-20 border transition-all text-left ${isActive
                                          ? 'border-moss-500/50 bg-moss-500/10 shadow-xs'
                                          : 'border-transparent hover:border-hairline hover:bg-card/80'
                                        }`}
                                    >
                                      <div
                                        className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border ${opt.bgLightClass}`}
                                      >
                                        <Icon className={`h-4 w-4 ${opt.colorClass}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-xs font-bold text-ink truncate">{opt.name}</span>
                                          {isActive ? (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-moss-600 text-paper dark:text-[#141915] font-semibold">
                                              Active
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-mono text-ink-soft">{opt.badge}</span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-ink-soft leading-tight mt-0.5 line-clamp-1">
                                          {opt.desc}
                                        </p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Theme Toggle, User ABHA, & Prominent Logout */}
                      <div className="flex items-center gap-2.5">
                        {/* Right: Theme Toggle, User ABHA Chip & CTAs */}
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <ThemeToggle />

                          {isAuthenticated && !isAuthPage ? (
                            <div className="flex items-center gap-2">
                              {/* Patient ABHA click-to-copy chip */}
                              {role === 'patient' && abhaId && (
                <span
                  title={`Active ABHA: ${abhaId}`}
                  className="hidden md:inline-flex items-center gap-1 rounded-full bg-moss-500/10 border border-moss-500/20 px-3 py-1 font-mono text-xs font-medium text-moss-700 dark:text-moss-400"
                <button
                  type="button"
                  onClick={handleCopyAbha}
                  title={`ABHA ID: ${abhaId} (Click to copy)`}
                  className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-paper-2 hover:bg-card border border-hairline px-3 py-1.5 font-mono text-xs font-semibold text-ink transition-colors shadow-xs"
                >
                  <User className="h-3 w-3" />
                  {abhaId.replace(/^(\d{2})-\d{4}-\d{4}-(\d{4})$/, '$1-••••-••••-$2')}
                </span>
                  {copiedAbha ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-600" />
                                  <span className="text-emerald-700 dark:text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 text-ink-soft" />
                                  <span>{abhaId.replace(/^(\d{2})-\d{4}-\d{4}-(\d{4})$/, '$1-••••-••••-$2')}</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Prominent Always-Visible Logout Button */}
                          {/* Role badge for professional users */}
                          {role !== 'patient' && (
                            <div className="hidden sm:flex items-center gap-2 rounded-full bg-paper-2 border border-hairline px-3 py-1 text-xs font-semibold text-ink shadow-xs">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className="truncate max-w-[140px]">{userName || role?.toUpperCase()}</span>
                            </div>
                          )}

                          {/* Prominent High-Contrast Logout Button */}
                          <button
                            type="button"
                            onClick={() => {
                              logout();
                              navigate('/login');
                            }}
                            className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold transition-colors shadow-sm"
                            className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 px-3 sm:px-4 py-1.5 text-xs font-semibold transition-all shadow-xs"
                            title="Logout from HealthSafe"
                            aria-label="Logout"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Logout</span>
                          </button>
                        </div>
                        ) : (
                        <div className="hidden sm:flex items-center gap-2">
                          {location.pathname !== '/login' && (
                            <Link
                              to="/login"
                              className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper-2"
                              className="rounded-full border border-hairline/80 bg-card/60 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-ink transition-all hover:bg-paper-2 shadow-xs"
                            >
                              Sign In
                            </Link>
                          )}
                          {location.pathname !== '/signup' && (
                            <Link
                              to="/signup"
                              className="rounded-full bg-moss-600 px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-moss-700"
                              className="rounded-full btn-primary-tech px-4 py-2 text-xs font-semibold shadow-sm flex items-center gap-1.5"
                            >
                              Doctor Sign Up
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Create ABHA ID</span>
                            </Link>
                          )}
                        </div>
          )}

                        {/* Mobile menu toggle */}
                        {/* Mobile hamburger menu toggle */}
                        <button
                          type="button"
                          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                          className="flex sm:hidden h-9 w-9 items-center justify-center rounded-full border border-hairline bg-paper-2 text-ink"
                          className="flex md:hidden h-9 w-9 items-center justify-center rounded-full border border-hairline bg-paper-2 text-ink shadow-xs"
                          aria-label="Toggle navigation menu"
                        >
                          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                        </button>
                      </div>
                    </nav>

                  {/* Mobile Drawer */}
                  {mobileMenuOpen && (
                    <div className="mt-2 flex flex-col gap-3 rounded-20 border border-hairline bg-card p-4 shadow-elevated sm:hidden animate-fade-up">
                      <div className="portal-dropdown-panel mt-2 flex flex-col gap-3 rounded-24 border border-hairline p-4 shadow-elevated md:hidden animate-fade-up">
                        {isAuthenticated && !isAuthPage ? (
                          <div className="flex flex-col gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                              Active Role: {role?.toUpperCase()}
                            </span>
                            <div className="flex flex-col gap-2.5">
                              <div className="flex items-center justify-between pb-2 border-b border-hairline">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                                  Active Portal: {role?.toUpperCase()}
                                </span>
                                {abhaId && (
                                  <button
                                    type="button"
                                    onClick={handleCopyAbha}
                                    className="flex items-center gap-1 font-mono text-[11px] text-moss-700 dark:text-moss-400 font-semibold"
                                  >
                                    {copiedAbha ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    <span>{copiedAbha ? 'Copied' : abhaId}</span>
                                  </button>
                                )}
                              </div>

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
                              {/* 4 Portal Quick-Launch Tiles */}
                              <div className="grid grid-cols-2 gap-2">
                                {PORTAL_OPTIONS.map((opt) => {
                                  const Icon = opt.icon;
                                  const isActive = role === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => handleSelectPortal(opt)}
                                      className={`flex flex-col items-center justify-center p-3 rounded-20 border text-center transition-all ${isActive
                                          ? 'border-moss-500 bg-moss-500/15 text-moss-800 dark:text-moss-300 font-bold shadow-xs'
                                          : 'border-hairline bg-card/60 text-ink-soft hover:text-ink'
                                        }`}
                                    >
                                      <Icon className="h-4 w-4 mb-1" />
                                      <span className="text-xs">{opt.name.split(' ')[0]}</span>
                                      <span className="text-[10px] text-ink-soft/70">{opt.badge}</span>
                                    </button>
                                  );
                                })}
                              </div>

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
                                className="mt-2 flex items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                              >
                                <LogOut className="h-3.5 w-3.5" />
                                <span>Logout</span>
                              </button>
                            </div>
                            ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-col gap-2.5">
                                {isLanding && (
                                  <div className="flex flex-col gap-1 pb-2 mb-2 border-b border-hairline">
                                    <a
                                      href="#patients"
                                      href="#how-it-works"
                                      onClick={() => setMobileMenuOpen(false)}
                                      className="px-3 py-2 text-xs font-medium text-ink-soft hover:text-ink"
                                    >
                                      For Patients
                                      How it works
                                    </a>
                                    <a
                                      href="#doctors"
                                      href="#features"
                                      onClick={() => setMobileMenuOpen(false)}
                                      className="px-3 py-2 text-xs font-medium text-ink-soft hover:text-ink"
                                    >
                                      For Doctors
                                      Features
                                    </a>
                                    <a
                                      href="#how-it-works"
                                      href="#patients"
                                      onClick={() => setMobileMenuOpen(false)}
                                      className="px-3 py-2 text-xs font-medium text-ink-soft hover:text-ink"
                                    >
                                      How it works
                                      For Patients
                                    </a>
                                    <a
                                      href="#features"
                                      href="#doctors"
                                      onClick={() => setMobileMenuOpen(false)}
                                      className="px-3 py-2 text-xs font-medium text-ink-soft hover:text-ink"
                                    >
                                      Features
                                      For Doctors
                                    </a>
                                  </div>
                                )}
                                <Link
                                  to="/login"
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="flex items-center justify-center rounded-full bg-ink py-2 text-xs font-semibold text-paper dark:text-[#141915]"
                                >
                                  Sign In
                                </Link>
                                <Link
                                  to="/signup"
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="flex items-center justify-center rounded-full bg-moss-600 py-2 text-xs font-semibold text-paper"
                                >
                                  Doctor Sign Up
                                </Link>

                                {/* Guest Portals Preview */}
                                <div className="space-y-1.5 pb-2 border-b border-hairline">
                                  <span className="text-[10px] uppercase font-bold tracking-wider text-ink-soft px-1 block mb-1">
                                    Healthcare Portals
                                  </span>
                                  <div className="grid grid-cols-2 gap-2">
                                    {PORTAL_OPTIONS.map((opt) => {
                                      const Icon = opt.icon;
                                      return (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => handleSelectPortal(opt)}
                                          className="flex flex-col items-center justify-center p-2.5 rounded-16 border border-hairline bg-card/60 text-xs font-medium text-ink hover:bg-paper-2"
                                        >
                                          <Icon className={`h-4 w-4 mb-1 ${opt.colorClass}`} />
                                          <span>{opt.name.split(' ')[0]}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 pt-1">
                                  <Link
                                    to="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center justify-center rounded-full border border-hairline bg-card py-2.5 text-xs font-semibold text-ink"
                                  >
                                    Sign In
                                  </Link>
                                  <Link
                                    to="/signup"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center justify-center rounded-full btn-primary-tech py-2.5 text-xs font-semibold"
                                  >
                                    Create ABHA ID
                                  </Link>
                                </div>
                              </div>
          )}
                            </div>
      )}
                          </header>
                        );
};
