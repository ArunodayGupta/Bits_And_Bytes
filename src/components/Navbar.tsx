import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Stethoscope, User, Menu, X } from 'lucide-react';
import { usePatientData } from '@/context/usePatientData';
import { PatientCard } from './PatientCard';
import { DataSourceSelect } from './DataSourceSelect';

export const Navbar: React.FC = () => {
  const { patient, statusState, statusText } = usePatientData();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isClinician = location.pathname.startsWith('/clinician');

  const dotColorClass =
    statusState === 'live'
      ? 'bg-emerald-500 ring-emerald-500/30'
      : statusState === 'fallback'
      ? 'bg-amber-500 ring-amber-500/30'
      : 'bg-stone-400 ring-stone-400/20';

  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-[1200px] px-4">
      <nav
        aria-label="Main Navigation"
        className="glass-card flex items-center justify-between rounded-full border border-hairline px-4 py-2.5 shadow-elevated transition-all"
      >
        {/* Left: Patient Profile summary */}
        <div className="flex items-center">
          <NavLink to="/patient" className="hover:opacity-90 transition-opacity">
            <PatientCard patient={patient} compact />
          </NavLink>
        </div>

        {/* Centre: Segmented View Switcher */}
        <div className="hidden sm:flex items-center rounded-full bg-paper-2/90 p-1 border border-hairline">
          <NavLink
            to="/patient"
            className={({ isActive }) =>
              `relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                isActive || !isClinician
                  ? 'bg-card text-ink shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`
            }
          >
            <User className="h-3.5 w-3.5" />
            <span>Patient Timeline</span>
          </NavLink>

          <NavLink
            to="/clinician"
            className={({ isActive }) =>
              `relative flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-card text-ink shadow-sm'
                  : 'text-ink-soft hover:text-ink'
              }`
            }
          >
            <Stethoscope className="h-3.5 w-3.5" />
            <span>Clinician Lookup</span>
          </NavLink>
        </div>

        {/* Right: Data Source Selector & Actions */}
        <div className="hidden lg:flex items-center gap-3">
          <DataSourceSelect />
        </div>

        {/* Mobile menu toggle */}
        <div className="flex lg:hidden items-center gap-2">
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
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              Select View
            </span>
            <div className="grid grid-cols-2 gap-2">
              <NavLink
                to="/patient"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-center gap-2 rounded-full py-2 text-xs font-medium border ${
                    isActive
                      ? 'bg-moss-600 text-paper border-transparent'
                      : 'border-hairline bg-paper-2 text-ink'
                  }`
                }
              >
                <User className="h-3.5 w-3.5" />
                <span>Patient</span>
              </NavLink>
              <NavLink
                to="/clinician"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-center gap-2 rounded-full py-2 text-xs font-medium border ${
                    isActive
                      ? 'bg-moss-600 text-paper border-transparent'
                      : 'border-hairline bg-paper-2 text-ink'
                  }`
                }
              >
                <Stethoscope className="h-3.5 w-3.5" />
                <span>Clinician</span>
              </NavLink>
            </div>
          </div>

          <div className="border-t border-hairline pt-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft block mb-1.5">
              Data Source ({statusText})
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ring-2 ${dotColorClass}`} />
                <span className="text-xs text-ink-soft">{statusState}</span>
              </div>
              <DataSourceSelect />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
