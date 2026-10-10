import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, RequireRole, useAuth } from '@/context/AuthContext';
import { PatientDataProvider } from '@/context/PatientDataContext';
import { Navbar } from '@/components/Navbar';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { PatientView } from '@/pages/PatientView';
import { PhysicianView } from '@/pages/PhysicianView';
import { DoctorView } from '@/pages/DoctorView';
import { ClinicianView } from '@/pages/ClinicianView';
import { AdminView } from '@/pages/AdminView';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const FallbackRoute = () => {
  const { isAuthenticated, role } = useAuth();
  if (isAuthenticated) {
    if (role === 'doctor') return <Navigate to="/doctor" replace />;
    if (role === 'physician' || role === 'clinician') return <Navigate to="/physician" replace />;
    if (role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/patient" replace />;
  }
  return <Navigate to="/" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
                  {/* Landing page at root / (redirects if authenticated) */}
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignUpPage />} />

                  {/* 1. Patient view guarded strictly by patient role */}
                  <Route
                    path="/patient"
                    element={
                      <RequireRole allowedRoles={['patient']}>
                        <PatientView />
                      </RequireRole>
                    }
                  />

                  {/* 2. Physician view guarded strictly by physician role */}
                  <Route
                    path="/physician"
                    element={
                      <RequireRole allowedRoles={['physician', 'clinician']}>
                        <PhysicianView />
                      </RequireRole>
                    }
                  />

                  {/* 3. Doctor view guarded strictly by doctor role */}
                  <Route
                    path="/doctor"
                    element={
                      <RequireRole allowedRoles={['doctor']}>
                        <DoctorView />
                      </RequireRole>
                    }
                  />

                  {/* Backwards compatibility for /clinician */}
                  <Route
                    path="/clinician"
                    element={
                      <RequireRole allowedRoles={['physician', 'clinician', 'doctor']}>
                        <PhysicianView />
                      </RequireRole>
                    }
                  />

                  {/* 4. Admin view guarded strictly by admin role */}
                  <Route
                    path="/admin"
                    element={
                      <RequireRole allowedRoles={['admin']}>
                        <AdminView />
                      </RequireRole>
                    }
                  />

                  {/* Catch-all redirects safely */}
                  <Route path="*" element={<FallbackRoute />} />
                </Routes>
              </main>

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
                    <Link to="/admin" className="hover:text-ink font-semibold text-amber-700 dark:text-amber-400">Admin Console</Link>
                    <a href="https://github.com" className="hover:text-ink">GitHub</a>
                    <span>•</span>
                    <span>Secure Health Record Architecture</span>
                    <span>•</span>
                    <span>Demo mode with verified medical data.</span>
                  </div>
                </div>
              </footer>
            </div>
          </ErrorBoundary>
        </PatientDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
