import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientDataProvider } from '@/context/PatientDataContext';
import { Navbar } from '@/components/Navbar';
import { PatientView } from '@/pages/PatientView';
import { ClinicianView } from '@/pages/ClinicianView';
import { FallbackToast } from '@/components/FallbackToast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LandingPage } from '@/pages/LandingPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PatientDataProvider>
          <ErrorBoundary>
            {/* Subtle film grain texture overlay */}
            <div className="grain-overlay" aria-hidden="true" />

            <div className="min-h-screen bg-paper text-ink flex flex-col bg-topo app-shell">
              {/* Floating Top Navbar */}
              <Navbar />

              {/* Main Application Content */}
              <main className="flex-1 mx-auto w-full max-w-[1640px] px-5 pt-6 sm:px-8 lg:px-12">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/patient" element={<PatientView />} />
                  <Route path="/clinician" element={<ClinicianView />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>

              {/* Non-blocking live fallback toast */}
              <FallbackToast />

              {/* App Footer */}
              <footer className="w-full border-t border-hairline py-6 px-4 text-center text-xs text-ink-soft">
                <div className="mx-auto max-w-[1640px] flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-8 lg:px-12">
                  <div className="flex items-center gap-2">
                    <span className="font-serif italic text-sm text-ink font-semibold">
                      HealthSafe
                    </span>
                    <span>— Patient-Owned Medical Records</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-[11px]">
                    <Link to="/patient" className="hover:text-ink">Patient Dashboard</Link>
                    <Link to="/clinician" className="hover:text-ink">Clinician Lookup</Link>
                    <a href="https://github.com" className="hover:text-ink">GitHub</a>
                    <span>NRCeS / ABDM FHIR R4 Architecture</span>
                    <span>•</span>
                    <span>Demo only. Uses synthetic data. Not for clinical use.</span>
                  </div>
                </div>
              </footer>
            </div>
          </ErrorBoundary>
        </PatientDataProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
