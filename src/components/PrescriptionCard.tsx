import React from 'react';
import {
  FileCode,
  Lock,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import type {
  FhirMedicationRequest,
  FhirEncounter,
  FhirPatient,
  FhirResource,
} from '@/lib/fhir/types';
import { Badge } from '@/components/ui/badge';

interface PrescriptionCardProps {
  medication: FhirMedicationRequest;
  encounter?: FhirEncounter;
  patient: FhirPatient | null;
  rxId: string;
  onInspect: (resource: FhirResource) => void;
}

export const PrescriptionCard: React.FC<PrescriptionCardProps> = ({
  medication,
  encounter,
  patient,
  rxId,
  onInspect,
}) => {
  const drugName =
    medication.medicationCodeableConcept?.coding?.[0]?.display ||
    medication.medicationCodeableConcept?.text ||
    'Prescribed Medication';

  const dosage =
    medication.dosageInstruction?.[0]?.text || 'As directed by physician';

  const doctorName =
    medication.requester?.display ||
    encounter?.participant?.[0]?.individual?.display ||
    'Dr. Rajesh Rao';

  const hospitalName =
    medication.encounter?.display ||
    encounter?.serviceProvider?.display ||
    'Apollo Hospitals Chennai';

  const authoredDate = medication.authoredOn
    ? new Date(medication.authoredOn).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

  const patientName = patient?.name?.[0]?.text || 'Ramesh Kumar';
  const abhaId =
    patient?.identifier?.find((i) => i.system === 'https://healthid.ndhm.gov.in')
      ?.value || '91-1234-5678-9012';

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-up">
      {/* Top Banner Notice */}
      <div className="flex items-center justify-between rounded-xl border border-moss-500/20 bg-moss-100/50 px-4 py-2 text-xs text-ink-soft">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-moss-600" />
          <span className="font-medium text-ink">
            Speakable Rx-ID Verified by ABDM Protocol
          </span>
        </div>
        <span className="font-mono text-[11px] text-moss-600 font-semibold">
          Single-Encounter Scope
        </span>
      </div>

      {/* Main Digital Prescription Sheet */}
      <div className="relative overflow-hidden rounded-28 border border-hairline bg-card shadow-elevated">
        {/* Perforated top receipt edge */}
        <div className="h-2 w-full bg-paper-2 border-b-2 border-dashed border-hairline" />

        {/* Prescription content */}
        <div className="relative p-6 sm:p-8">
          {/* Serif ℞ Watermark */}
          <div className="pointer-events-none absolute right-6 top-8 font-serif text-8xl font-normal text-moss-600/10 select-none">
            ℞
          </div>

          <div className="flex flex-col gap-6">
            {/* Header row: Stamp badge & Date */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
              <div className="flex items-center gap-3">
                <span className="rounded-md border-2 border-moss-600/60 bg-paper-2 px-3 py-1 font-mono text-sm font-bold tracking-widest text-moss-600 uppercase shadow-xs">
                  {rxId}
                </span>
                <span className="text-xs uppercase tracking-wider text-ink-soft font-semibold">
                  Electronic Prescription
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-ink-soft font-mono">
                <Calendar className="h-3.5 w-3.5 text-stone-500" />
                <span>Date: {authoredDate}</span>
              </div>
            </div>

            {/* Drug Details */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-soft">
                Prescribed Drug & Strength
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-ink leading-tight">
                {drugName}
              </h2>
              <div className="rounded-xl border border-hairline/80 bg-paper-2/70 p-3 mt-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-ink-soft block mb-1">
                  Dosage & Administration Instructions
                </span>
                <p className="font-medium text-sm text-ink leading-relaxed">
                  {dosage}
                </p>
              </div>
            </div>

            {/* Provider and Facility Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-hairline pt-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-2 border border-hairline text-ink">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-ink-soft font-medium block">
                    Prescribing Clinician
                  </span>
                  <span className="font-semibold text-sm text-ink">
                    {doctorName}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-2 border border-hairline text-ink">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-ink-soft font-medium block">
                    Healthcare Facility
                  </span>
                  <span className="font-semibold text-sm text-ink">
                    {hospitalName}
                  </span>
                </div>
              </div>
            </div>

            {/* Inspect Button */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => onInspect(medication)}
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-paper-2 px-4 py-2 text-xs font-medium text-ink hover:bg-moss-100/50 hover:border-moss-500/50 transition-colors"
              >
                <FileCode className="h-3.5 w-3.5 text-moss-600" />
                <span>Inspect MedicationRequest FHIR</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Associated Context Cards: Patient Demographics & Encounter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Patient Demographics Card */}
        <div className="rounded-20 border border-hairline bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="eyebrow-pill text-[10px]">
              <span className="eyebrow-dot" />
              Patient Demographics
            </span>
            {patient && (
              <button
                type="button"
                onClick={() => onInspect(patient)}
                className="text-xs text-teal-700 hover:underline flex items-center gap-1"
              >
                <FileCode className="h-3 w-3" />
                <span>FHIR</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-600 font-serif text-lg text-paper">
              RK
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-serif text-xl text-ink">{patientName}</h4>
                <Badge variant="verified" className="h-4 px-1.5 text-[9px] gap-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Verified
                </Badge>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                <span>54 · Male</span>
                <span>•</span>
                <span className="font-mono text-[11px]">{abhaId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Parent Encounter Card */}
        <div className="rounded-20 border border-hairline bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="eyebrow-pill text-[10px]">
              <span className="eyebrow-dot" />
              Consultation Encounter
            </span>
            {encounter && (
              <button
                type="button"
                onClick={() => onInspect(encounter)}
                className="text-xs text-teal-700 hover:underline flex items-center gap-1"
              >
                <FileCode className="h-3 w-3" />
                <span>FHIR</span>
              </button>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-sm text-ink mb-1">
              {hospitalName}
            </h4>
            <div className="flex flex-col gap-0.5 text-xs text-ink-soft">
              <span>Attending: {doctorName}</span>
              <span>Encounter Type: Ambulatory Outpatient</span>
              <span className="font-mono text-[11px]">Date: {authoredDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gated Consent Action Button */}
      <div className="flex flex-col items-center justify-center gap-2 pt-2">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Requires patient consent under ABDM guidelines"
          className="inline-flex items-center gap-2 rounded-full border border-hairline bg-paper-2 px-6 py-3 text-xs font-medium text-ink-soft opacity-60 cursor-not-allowed shadow-xs"
        >
          <Lock className="h-3.5 w-3.5 text-stone-400" />
          <span>View full longitudinal history</span>
          <span className="rounded-full bg-stone-200 dark:bg-stone-800 px-2 py-0.5 text-[10px] font-semibold text-stone-600 dark:text-stone-300">
            Requires patient consent
          </span>
        </button>
        <span className="text-[11px] text-ink-soft text-center max-w-md">
          Phase 1 provides strict single-prescription containment. Full record disclosure requires verified ABDM consent artefact.
        </span>
      </div>
    </div>
  );
};
