import type { ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  HeartPulse,
  Pill,
  ScanLine,
  Stethoscope,
  UserRound,
  Share2,
  FileText,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

    const ButtonLink = ({
      to,
      children,
      secondary = false,
}: {
      to: string;
    children: ReactNode;
    secondary?: boolean;
}) => (
    <Link
      to={to}
      className={`group inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98] ${secondary
          ? 'border border-hairline/80 bg-card/80 backdrop-blur-sm text-ink hover:bg-paper-2 shadow-xs'
          : 'btn-primary-tech shadow-elevated'
        }`}
    >
      <span>{children}</span>
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </Link>
    );

const MockTimeline = () => (
    <div className="mock-timeline relative overflow-hidden rounded-28 border border-white/25 bg-[#f8f3e8]/90 p-4 text-ink shadow-glass sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-ink-soft">Ramesh Kumar</p>
          <h3 className="font-serif text-2xl font-bold">Your health records</h3>
        </div>
        <div className="rounded-full bg-moss-100 px-3 py-1 text-[10px] font-semibold text-moss-600">4 records</div>
      </div>
      <div className="relative space-y-3 before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-moss-500/40">
        {[
          ['Lab result', 'HbA1c · 6.8%', 'bg-event-lab-bg text-event-lab-text'],
          ['Prescription', 'Metformin · 500mg', 'bg-event-med-bg text-event-med-text'],
          ['Doctor visit', 'Apollo Hospitals', 'bg-event-enc-bg text-event-enc-text'],
        ].map(([kind, label, color]) => (
          <div key={kind} className="relative flex items-center gap-3">
            <span className="z-10 h-7 w-7 rounded-full border-4 border-[#f8f3e8] bg-moss-600" />
            <div className="flex flex-1 items-center justify-between rounded-2xl border border-hairline bg-card px-3 py-2.5 shadow-xs">
              <div>
                <p className="text-[10px] text-ink-soft">{kind}</p>
                <p className="text-sm font-medium">{label}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${color}`}>NEW</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 h-12 rounded-xl bg-moss-100/50 p-2">
        <svg viewBox="0 0 240 32" className="h-full w-full" aria-label="Blood sugar trend">
          <path d="M0 26 C35 24,45 9,75 16 S110 27,135 12 S180 5,240 9" fill="none" stroke="#4F6B3A" strokeWidth="2.5" />
          <path d="M0 26 C35 24,45 9,75 16 S110 27,135 12 S180 5,240 9 L240 32 L0 32Z" fill="#6F8F4E" opacity=".15" />
        </svg>
      </div>
      <div className="absolute right-5 top-16 z-20 max-w-[185px] animate-float rounded-2xl border border-white/60 bg-white/85 p-3 shadow-glass backdrop-blur-md">
        <p className="font-mono text-xs font-semibold tracking-wide">APL-RR-1410-RAME</p>
        <p className="mt-1 text-[10px] text-ink-soft">Share this code with your doctor</p>
      </div>
    </div>
    );

export const LandingPage = () => {
  const {isAuthenticated, role} = useAuth();

    if (isAuthenticated) {
    if (role === 'doctor') return <Navigate to="/doctor" replace />;
    if (role === 'physician' || role === 'clinician') return <Navigate to="/physician" replace />;
    if (role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/patient" replace />;
  }

    return (
    <div className="landing-page pb-16">
      {/* HERO SECTION */}
      <section className="grid items-center gap-10 pt-8 md:grid-cols-[.95fr_1.05fr] md:pt-16">
        <div className="animate-fade-up" style={{ animationDelay: '70ms' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-moss-500/10 border border-moss-500/25 text-xs font-semibold text-moss-800 dark:text-moss-300 mb-4 shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-moss-600" />
              <span>Ayushman Bharat Digital Mission (ABDM) Compliant</span>
            </div>

            <h1 className="mt-1 font-serif text-[42px] leading-[1.05] text-ink sm:text-[56px] font-normal">
              Your health records, <em>in one place.</em>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
              All your hospital visits, lab reports, and prescriptions in a single organized view — linked to your official Government ABHA Health ID.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/login">Sign In with ABHA ID</ButtonLink>
              <ButtonLink to="/signup" secondary>Doctor Registration</ButtonLink>
              <ButtonLink to="/login?role=doctor" secondary>Doctor Portal</ButtonLink>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-ink-soft">
              {['Linked to your ABHA Health ID', 'Private & secure', 'Share with your doctor'].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-moss-600" />
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-4">
              <a
                href="https://abha.abdm.gov.in/abha/v3/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-moss-700 hover:underline dark:text-moss-400"
              >
                Don't have an ABHA ID? Create one at ABDM <ExternalLink className="h-3 w-3" />
              </a>
            </div>
        </div>

        <div className="hero-atmosphere animate-fade-up p-4 sm:p-7 overflow-hidden" style={{ animationDelay: '140ms' }}>
          <MockTimeline />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="section-reveal py-12 sm:py-14">
        <h2 className="font-serif text-3xl sm:text-4xl text-ink mb-2">How it works</h2>
        <p className="text-ink-soft mb-8 max-w-xl text-sm sm:text-base">Three simple steps to manage your longitudinal health records.</p>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ['01', 'Sign in', 'Use your 14-digit ABHA Health ID to access all your records securely.'],
            ['02', 'See everything', 'View your lab results, prescriptions, and doctor visits in one timeline.'],
            ['03', 'Share with your doctor', 'Give your doctor a secure code so they can see your records instantly.']
          ].map(([number, title, text]) => (
              <article key={number} className="rounded-28 border border-hairline bg-card p-6 shadow-soft hover:shadow-elevated transition-shadow">
                <p className="font-serif text-5xl text-moss-600/70">{number}</p>
                <h3 className="mt-4 font-serif text-2xl font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
              </article>
          ))}
            </div>
      </section>

      {/* EXPLORE THE 4 HEALTHCARE PORTALS */}
      <section className="section-reveal py-12 sm:py-14 border-t border-hairline/60">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <span className="eyebrow-pill mb-2">
            <span className="eyebrow-dot" />
            Unified Health Ecosystem
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-ink">Explore Our 4 Dedicated Portals</h2>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            Tailored experiences for citizens, medical specialists, Jan Aushadhi pharmacists, and compliance auditors.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Patient Health Wallet',
              role: 'Citizen & ABHA',
              desc: 'Unified FHIR longitudinal timeline, lab report scanner, and instant doctor share codes.',
              link: '/login?role=patient',
              icon: UserRound,
              tag: 'Patient Portal',
              badgeColor: 'bg-moss-500/10 text-moss-700 dark:text-moss-400 border-moss-500/20',
            },
            {
              title: 'Doctor Clinical Suite',
              role: 'NMC Registered Doctors',
              desc: 'Issue electronic prescriptions and retrieve patient medical history using speakable Rx-tokens.',
              link: '/login?role=doctor',
              icon: Stethoscope,
              tag: 'Clinician Portal',
              badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
            },
            {
              title: 'Jan Aushadhi Dispensary',
              role: 'PMBJP Kendra Pharmacists',
              desc: 'Automated generic medicine substitution and worked price comparison calculator.',
              link: '/login?role=physician',
              icon: Pill,
              tag: 'Dispensary Portal',
              badgeColor: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20',
            },
            {
              title: 'Admin Audit Console',
              role: 'Security & Compliance',
              desc: 'ABDM telemetry, FHIR resource logs, and DPDP-compliant consent audit trail.',
              link: '/login?role=admin',
              icon: ShieldCheck,
              tag: 'Auditor Console',
              badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
            },
          ].map((portal) => {
            const Icon = portal.icon;
            return (
              <div
                key={portal.title}
                className="rounded-24 border border-hairline bg-card p-5 sm:p-6 shadow-soft flex flex-col justify-between hover:shadow-elevated transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-2xl flex items-center justify-center bg-paper-2 border border-hairline text-ink">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border ${portal.badgeColor}`}>
                      {portal.tag}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-ink">{portal.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">{portal.desc}</p>
                </div>
                <div className="mt-5 pt-3 border-t border-hairline/60">
                  <Link
                    to={portal.link}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-moss-700 dark:text-moss-400 hover:gap-2.5 transition-all"
                  >
                    <span>Launch Portal</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FEATURES SUBSECTION */}
      <section id="features" className="section-reveal py-12 sm:py-14 border-t border-hairline/60">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <span className="eyebrow-pill mb-2">Platform Features</span>
          <h2 className="font-serif text-3xl sm:text-4xl text-ink">Everything you need for your healthcare</h2>
          <p className="mt-3 text-sm text-ink-soft leading-relaxed">
            Simple, secure tools to manage your appointments, lab tests, prescriptions, and medical records.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: FileText,
              title: 'Unified Health Timeline',
              desc: 'Every doctor consultation, blood test, and hospital visit organized chronologically.',
            },
            {
              icon: Share2,
              title: 'Prescription Code Sharing',
              desc: 'Share a simple prescription code so your doctor can view your records instantly without carrying paper files.',
            },
            {
              icon: ScanLine,
              title: 'Scan Paper Reports',
              desc: 'Snap a picture of physical lab reports to automatically digitize and store test results in your wallet.',
            },
            {
              icon: HeartPulse,
              title: 'Routine Care Reminders',
              desc: 'Helpful notifications when routine lab checks or follow-up doctor consultations are recommended.',
            },
            {
              icon: Pill,
              title: 'Generic Medicine Savings',
              desc: 'Find approved Jan Aushadhi generic equivalents to save on recurring pharmacy and medication costs.',
            },
            {
              icon: Stethoscope,
              title: 'Doctor Prescribing Portal',
              desc: 'Doctors can write electronic prescriptions, look up patient medical history, and view past vitals securely.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="rounded-24 border border-hairline bg-card p-5 sm:p-6 shadow-soft transition-transform hover:-translate-y-1"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-moss-500/10 text-moss-700 dark:text-moss-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-xl text-ink font-bold">{title}</h3>
              <p className="mt-2 text-xs sm:text-sm text-ink-soft leading-relaxed">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FOR PATIENTS & DOCTORS */}
      <section id="patients" className="section-reveal grid gap-4 py-12 md:grid-cols-2">
          <article className="rounded-28 border border-hairline bg-card p-6 sm:p-7 shadow-soft">
            <UserRound className="h-6 w-6 text-moss-600" />
            <h2 className="mt-5 font-serif text-2xl sm:text-3xl font-bold">For patients</h2>
            <ul className="mt-4 space-y-2 text-xs sm:text-sm text-ink-soft">
              <li>• See all your records in one timeline</li>
              <li>• Track blood sugar, blood pressure, and other health values over time</li>
              <li>• Share your prescription with a simple code</li>
              <li>• Scan paper reports to add them digitally</li>
            </ul>
            <div className="mt-6">
              <ButtonLink to="/login">Sign In as Patient</ButtonLink>
            </div>
          </article>

            <article id="doctors" className="rounded-28 border border-hairline bg-paper-2 p-6 sm:p-7 shadow-soft">
              <Stethoscope className="h-6 w-6 text-teal-700" />
              <h2 className="mt-5 font-serif text-2xl sm:text-3xl font-bold">For doctors</h2>
              <ul className="mt-4 space-y-2 text-xs sm:text-sm text-ink-soft">
                <li>• Look up a patient's records using their prescription code</li>
                <li>• See their full medical history, lab tests, and current medications</li>
                <li>• Write and issue new prescriptions digitally</li>
              </ul>
              <div className="mt-6">
                <ButtonLink to="/login?role=doctor" secondary>Open Doctor Portal</ButtonLink>
              </div>
            </article>
          </section>

          {/* BOTTOM CTA */}
          <section className="section-reveal py-16 text-center">
            <h2 className="font-serif text-3xl sm:text-5xl font-bold">Get started today.</h2>
            <p className="mt-4 text-ink-soft max-w-md mx-auto text-sm sm:text-base">
              Connect your ABHA Health ID and have your entire health history organized in minutes.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink to="/login">Sign In</ButtonLink>
              <ButtonLink to="/signup" secondary>Doctor Registration</ButtonLink>
            </div>
          </section>
        </div>
        );
};
