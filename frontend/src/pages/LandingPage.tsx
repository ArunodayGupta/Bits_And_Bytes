import type { ReactNode } from 'react';
import { ArrowRight, Check, Database, FileCode2, HeartPulse, Pill, ScanLine, ShieldCheck, Stethoscope, TrendingUp, UserRound } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ButtonLink = ({ to, children, secondary = false }: { to: string; children: ReactNode; secondary?: boolean }) => (
  <Link to={to} className={`group inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 ${secondary ? 'border border-hairline bg-card/70 text-ink hover:bg-paper-2' : 'bg-ink text-paper shadow-elevated hover:bg-moss-600'}`}>
    {children}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
  </Link>
);

const Eyebrow = ({ children }: { children: ReactNode }) => <span className="eyebrow-pill"><span className="eyebrow-dot" />{children}</span>;

const MockTimeline = () => (
  <div className="mock-timeline relative overflow-hidden rounded-28 border border-white/25 bg-[#f8f3e8]/90 p-4 text-ink shadow-glass sm:p-6">
    <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-ink-soft">Ramesh Kumar</p><h3 className="font-serif text-2xl">Your timeline</h3></div><div className="rounded-full bg-moss-100 px-3 py-1 text-[10px] font-semibold text-moss-600">4 records</div></div>
    <div className="relative space-y-3 before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-moss-500/40">
      {[['Lab result', 'HbA1c · 6.8%', 'bg-event-lab-bg text-event-lab-text'], ['Prescription', 'Metformin · 500mg', 'bg-event-med-bg text-event-med-text'], ['Consultation', 'Apollo Hospitals', 'bg-event-enc-bg text-event-enc-text']].map(([kind, label, color]) => <div key={kind} className="relative flex items-center gap-3"><span className="z-10 h-7 w-7 rounded-full border-4 border-[#f8f3e8] bg-moss-600" /><div className="flex flex-1 items-center justify-between rounded-2xl border border-hairline bg-card px-3 py-2.5"><div><p className="text-[10px] text-ink-soft">{kind}</p><p className="text-sm font-medium">{label}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${color}`}>NEW</span></div></div>)}
    </div>
    <div className="mt-5 h-12 rounded-xl bg-moss-100/50 p-2"><svg viewBox="0 0 240 32" className="h-full w-full" aria-label="HbA1c trend chart"><path d="M0 26 C35 24,45 9,75 16 S110 27,135 12 S180 5,240 9" fill="none" stroke="#4F6B3A" strokeWidth="2.5" /><path d="M0 26 C35 24,45 9,75 16 S110 27,135 12 S180 5,240 9 L240 32 L0 32Z" fill="#6F8F4E" opacity=".15" /></svg></div>
    <div className="absolute right-5 top-16 z-20 max-w-[185px] animate-float rounded-2xl border border-white/60 bg-white/80 p-3 shadow-glass backdrop-blur-md"><p className="font-mono text-xs font-semibold tracking-wide">APL-RR-1410-RAME</p><p className="mt-1 text-[10px] text-ink-soft">Share this code with your doctor</p></div>
  </div>
);

const features = [
  [Pill, 'Prescription Code', 'Share a simple code with your doctor to open your prescription immediately.', true],
  [HeartPulse, 'Complete Health Timeline', 'Your records from hospitals, labs, and pharmacies in one clean chronological view.', true],
  [FileCode2, 'Clinical Details', 'See exact lab values, doctor notes, and diagnostic dates for each entry.', true],
  [Database, 'Cloud Database Synced', 'Records are securely stored and synced in real-time with the database.', true],
  [TrendingUp, 'Generic Medicine Savings', 'Match prescribed medicines to affordable generic alternatives and save monthly.', false],
  [ScanLine, 'Scan Paper Reports', 'Digitize paper medical reports and track important health indicators.', false],
] as const;

export const LandingPage = () => {
  const { isAuthenticated, role } = useAuth();

  if (isAuthenticated) {
    if (role === 'doctor') return <Navigate to="/doctor" replace />;
    if (role === 'physician' || role === 'clinician') return <Navigate to="/physician" replace />;
    if (role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/patient" replace />;
  }

  return (
    <div className="landing-page pb-16">
      <section className="grid items-center gap-10 pt-8 md:grid-cols-[.95fr_1.05fr] md:pt-16">
        <div className="animate-fade-up" style={{ animationDelay: '70ms' }}>
          <Eyebrow>Patient-Owned Health Wallet</Eyebrow>
          <h1 className="mt-5 font-serif text-[42px] leading-[1.05] text-ink sm:text-[56px]">
            Your entire health history, <em>in one secure place.</em>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
            A private health wallet that organizes your hospital visits, lab reports, and prescriptions into a clean timeline. Easily share prescriptions with your doctor using a simple code.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/signup">Get Started with Google</ButtonLink>
            <ButtonLink to="/login" secondary>Sign In with ABHA ID</ButtonLink>
            <ButtonLink to="/doctor" secondary>Doctor Portal</ButtonLink>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-ink-soft">
            {['Secure Records', 'ABDM Health ID', 'Cloud Database Synced'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-moss-600" />
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="hero-atmosphere animate-fade-up p-4 sm:p-7" style={{ animationDelay: '140ms' }}>
          <MockTimeline />
        </div>
      </section>

  <div className="my-14 border-y border-hairline py-5 text-center text-xs font-semibold tracking-[.12em] text-ink-soft sm:flex sm:justify-around">{['Digital Prescriptions', 'Verified Lab Trends', 'Affordable Generics', 'Instant Doctor Sharing', 'Private & Secure'].map(x => <span key={x}>{x}</span>)}</div>

  <section id="how-it-works" className="section-reveal py-10 text-center">
    <h2 className="mx-auto max-w-4xl font-serif text-4xl leading-tight sm:text-5xl">
      Records are scattered. Care shouldn't be. <em>Your history travels with you.</em>
    </h2>
    <p className="mx-auto mt-5 max-w-2xl text-ink-soft">
      Paper files, repeated tests and disconnected clinics make managing health harder than it should be. HealthSafe puts your health records back in your hands.
    </p>
  </section>

  <section className="section-reveal py-12">
    <div className="mb-7"><Eyebrow>How it works</Eyebrow></div>
    <div className="grid gap-5 md:grid-cols-3">
      {[
        ['01', 'Connect', 'Link your records and prescriptions securely into your personal health wallet.'],
        ['02', 'Understand', 'View your lab trends, blood pressure, and medications in a single chronological view.'],
        ['03', 'Share', 'Share your prescription code with your doctor or pharmacist in seconds.']
      ].map(([number, title, text]) => (
        <article key={number} className="rounded-28 border border-hairline bg-card p-6 shadow-soft">
          <p className="font-serif text-5xl text-moss-600/70">{number}</p>
          <h3 className="mt-4 font-serif text-2xl">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
        </article>
      ))}
    </div>
  </section>

  <section id="features" className="section-reveal py-12">
    <div className="mb-7">
      <Eyebrow>Built for care continuity</Eyebrow>
      <h2 className="mt-3 font-serif text-4xl">Every record, in its <em>right context.</em></h2>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {features.map(([Icon, title, copy, live]) => (
        <article key={title} className="rounded-20 border border-hairline bg-card p-5 shadow-soft transition-transform hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <span className="rounded-xl bg-moss-100 p-2.5 text-moss-600">
              <Icon className="h-5 w-5" />
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${live ? 'border-moss-500/30 bg-moss-100 text-moss-600' : 'border-gold-400/60 text-gold-400'}`}>
              {live ? 'Available' : 'Coming soon'}
            </span>
          </div>
          <h3 className="mt-5 font-serif text-2xl">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{copy}</p>
        </article>
      ))}
    </div>
  </section>

  <section className="section-reveal my-10 overflow-hidden rounded-28 border border-hairline bg-card p-6 text-ink shadow-soft sm:p-10">
    <Eyebrow>One connected view</Eyebrow>
    <h2 className="mt-4 font-serif text-4xl text-ink sm:text-5xl">Turn records into <em>real answers.</em></h2>
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      {[
        ['Timeline', 'A clean, chronological medical history'],
        ['Trend chart', 'Track vital measurements like blood pressure and blood sugar'],
        ['Digital prescription', 'Easily accessible prescription codes']
      ].map(([title, copy]) => (
        <div key={title} className="rounded-20 border border-hairline bg-paper-2/60 p-5 transition-transform hover:-translate-y-1">
          <p className="font-serif text-2xl text-ink">{title}</p>
          <div className="my-4 h-1.5 w-12 rounded-full bg-moss-500/50" />
          <p className="text-sm leading-relaxed text-ink-soft">{copy}</p>
        </div>
      ))}
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {[
        'Comprehensive health records',
        'Direct prescription code sharing',
        'Real-time cloud database sync'
      ].map(x => (
        <div key={x} className="rounded-xl border border-hairline bg-paper-2/40 p-3 text-center text-xs font-medium text-ink-soft">
          {x}
        </div>
      ))}
    </div>
  </section>

  <section id="patients" className="section-reveal grid gap-4 py-12 md:grid-cols-2">
    <article className="rounded-28 border border-hairline bg-card p-7">
      <UserRound className="h-6 w-6 text-moss-600" />
      <h2 className="mt-5 font-serif text-3xl">For patients</h2>
      <ul className="mt-4 space-y-2 text-sm text-ink-soft">
        <li>• See your complete records in one unified timeline</li>
        <li>• Follow key health trends over time</li>
        <li>• Share your prescription with a simple code</li>
      </ul>
      <div className="mt-6">
        <ButtonLink to="/patient">Open Dashboard</ButtonLink>
      </div>
    </article>
    <article id="doctors" className="rounded-28 border border-hairline bg-paper-2 p-7">
      <Stethoscope className="h-6 w-6 text-teal-700" />
      <h2 className="mt-5 font-serif text-3xl">For doctors</h2>
      <ul className="mt-4 space-y-2 text-sm text-ink-soft">
        <li>• Look up prescription details in seconds</li>
        <li>• Review clinical context, conditions, and vitals</li>
        <li>• Issue verified electronic prescriptions</li>
      </ul>
      <div className="mt-6">
        <ButtonLink to="/doctor" secondary>Open Doctor Portal</ButtonLink>
      </div>
    </article>
  </section>

  <aside className="rounded-20 border border-moss-500/25 bg-moss-100/45 px-5 py-4 text-center text-sm text-ink-soft">
    <ShieldCheck className="mr-2 inline h-4 w-4 text-moss-600" />
    Encrypted, private, and ABDM-aligned · Your medical data is strictly private.
  </aside>

  <section className="section-reveal py-20 text-center">
    <h2 className="font-serif text-5xl">See your health history, <em>in one place.</em></h2>
    <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
      <ButtonLink to="/patient">Patient Dashboard</ButtonLink>
      <ButtonLink to="/doctor" secondary>Doctor Portal</ButtonLink>
    </div>
  </section>
</div>
);
};
