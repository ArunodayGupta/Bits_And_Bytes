import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PatientDataProvider } from '@/context/PatientDataContext';
import { Navbar } from '@/components/Navbar';
import { PatientView } from '@/pages/PatientView';
import { ClinicianView } from '@/pages/ClinicianView';
import { FallbackToast } from '@/components/FallbackToast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function App() {
  return (
    <BrowserRouter>
      <PatientDataProvider>
        <ErrorBoundary>
          {/* Subtle film grain texture overlay */}
          <div className="grain-overlay" aria-hidden="true" />

          <div className="min-h-screen bg-paper text-ink flex flex-col bg-topo">
            {/* Floating Top Navbar */}
            <Navbar />

            {/* Main Application Content */}
            <main className="flex-1 mx-auto w-full max-w-[1200px] px-4 pt-6">
              <Routes>
                <Route path="/" element={<Navigate to="/patient" replace />} />
                <Route path="/patient" element={<PatientView />} />
                <Route path="/clinician" element={<ClinicianView />} />
                <Route path="*" element={<Navigate to="/patient" replace />} />
              </Routes>
            </main>

            {/* Non-blocking live fallback toast */}
            <FallbackToast />

            {/* App Footer */}
            <footer className="w-full border-t border-hairline py-6 px-4 text-center text-xs text-ink-soft">
              <div className="mx-auto max-w-[1200px] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-serif italic text-sm text-ink font-semibold">
                    HealthSafe
                  </span>
                  <span>— Patient-Owned Medical Records</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span>NRCeS / ABDM FHIR R4 Architecture</span>
                  <span>•</span>
                  <span>Zero-Cloud Browser State</span>
                </div>
              </div>
            </footer>
          </div>
        </ErrorBoundary>
      </PatientDataProvider>
    </BrowserRouter>
  );
}
