import { useState, useMemo, useEffect } from 'react';
import { usePatientData } from '@/context/usePatientData';
import { useAuth } from '@/context/AuthContext';
import { Timeline } from '@/components/Timeline';
import { ResourceSheet } from '@/components/ResourceSheet';
import { PatientSwitcher } from '@/components/PatientSwitcher';
import { CareGapBanner } from '@/components/CareGapBanner';
import { ScanDialog } from '@/components/ScanDialog';
import { Calendar, Activity, Pill, Shield, Camera } from 'lucide-react';

export const PatientView: React.FC = () => {
  const { abhaId } = useAuth();
  const {
    bundle,
    patient,
    selectedResource,
    setSelectedResource,
    setPatientId,
    availablePatients,
  } = usePatientData();

  const [isScanOpen, setIsScanOpen] = useState(false);

  // Enforce session ABHA in patient view (no free-text switching)
  useEffect(() => {
    if (abhaId && availablePatients.length > 0) {
      const cleanSessionAbha = abhaId.replace(/\D/g, '');
      const matched = availablePatients.find(
        (p) => p.abha.replace(/\D/g, '') === cleanSessionAbha
      );
      if (matched) {
        setPatientId(matched.id);
      }
    }
  }, [abhaId, availablePatients, setPatientId]);

  // Dynamic statistics from bundle
  const stats = useMemo(() => {
    if (!bundle?.entry) return { encounters: 0, conditions: 0, medications: 0, labs: 0 };
    let encounters = 0;
    let conditions = 0;
    let medications = 0;
    let labs = 0;

    for (const e of bundle.entry) {
      if (e.resource.resourceType === 'Encounter') encounters++;
      if (e.resource.resourceType === 'Condition') conditions++;
      if (e.resource.resourceType === 'MedicationRequest') medications++;
      if (e.resource.resourceType === 'Observation') labs++;
    }

    return { encounters, conditions, medications, labs };
  }, [bundle]);

  const patientName = patient?.name?.[0]?.text || 'Patient';

  return (
    <div className="flex flex-col gap-6 pb-16 animate-fade-up">
      {/* Show Patient Switcher only if no session ABHA locked */}
      {!abhaId && <PatientSwitcher />}

      {/* Verdant Clinical Hero Header Band */}
      <section className="patient-hero relative overflow-hidden rounded-28 border border-hairline bg-gradient-to-br from-[#E4EBD6]/60 via-[#F4EFE2] to-[#ECE9DF]/70 p-8 sm:p-12 shadow-soft">
        {/* Organic blurred blobs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-moss-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-teal-700/10 blur-3xl" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="eyebrow-pill">
              <span className="eyebrow-dot" />
              Longitudinal Health Record · {patientName}
            </span>

            {/* Scan Lab Report Button */}
            <button
              type="button"
              onClick={() => setIsScanOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-moss-600 px-4 py-2 text-xs font-semibold text-paper hover:bg-moss-500 transition-all shadow-sm"
              aria-label="Scan and upload a lab report"
            >
              <Camera className="h-4 w-4" />
              <span>Scan lab report</span>
            </button>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal text-ink leading-tight mb-4">
            Clinical history, <span className="italic">in one timeline</span>
          </h1>

          <p className="text-base sm:text-lg text-ink-soft leading-relaxed max-w-2xl mb-8">
            Your complete medical consultations, lab test trends, and prescriptions organized in one timeline.
          </p>

          {/* 4 Frosted Glass Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-card rounded-20 p-4 shadow-sm border border-white/40">
              <div className="flex items-center gap-2 text-ink-soft text-xs mb-1">
                <Calendar className="h-3.5 w-3.5 text-moss-600" />
                <span className="font-medium">Encounters</span>
              </div>
              <div className="font-serif text-3xl font-medium text-ink">
                {stats.encounters}
              </div>
              <span className="text-[11px] text-ink-soft">Doctor Visits</span>
            </div>

            <div className="glass-card rounded-20 p-4 shadow-sm border border-white/40">
              <div className="flex items-center gap-2 text-ink-soft text-xs mb-1">
                <Activity className="h-3.5 w-3.5 text-amber-600" />
                <span className="font-medium">Active conditions</span>
              </div>
              <div className="font-serif text-3xl font-medium text-ink">
                {stats.conditions}
              </div>
              <span className="text-[11px] text-ink-soft">Health Conditions</span>
            </div>

            <div className="glass-card rounded-20 p-4 shadow-sm border border-white/40">
              <div className="flex items-center gap-2 text-ink-soft text-xs mb-1">
                <Pill className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-medium">Medications</span>
              </div>
              <div className="font-serif text-3xl font-medium text-ink">
                {stats.medications}
              </div>
              <span className="text-[11px] text-ink-soft">Prescriptions</span>
            </div>

            <div className="glass-card rounded-20 p-4 shadow-sm border border-white/40">
              <div className="flex items-center gap-2 text-ink-soft text-xs mb-1">
                <Shield className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-medium">Lab Biomarkers</span>
              </div>
              <div className="font-serif text-3xl font-medium text-ink">
                {stats.labs}
              </div>
              <span className="text-[11px] text-ink-soft">Lab Results</span>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical Care Gap Banner */}
      <CareGapBanner />

      {/* Main Longitudinal Timeline */}
      <section>
        <Timeline />
      </section>

      {/* Resource Inspector Sheet */}
      <ResourceSheet
        resource={selectedResource}
        open={Boolean(selectedResource)}
        onOpenChange={(open) => {
          if (!open) setSelectedResource(null);
        }}
      />

      {/* Scan to FHIR Dialog */}
      <ScanDialog
        open={isScanOpen}
        onOpenChange={setIsScanOpen}
      />
    </div>
  );
};
