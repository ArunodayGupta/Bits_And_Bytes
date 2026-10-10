import React, { useState } from 'react';
import type { FhirResource } from '@/lib/fhir/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { StandardsPanel } from './StandardsPanel';
import { DarkJsonViewer } from './DarkJsonViewer';
import { SavingsCard } from './SavingsCard';
import { Badge } from '@/components/ui/badge';
import { formatSpokenRxId } from '@/lib/rxId';
import {
  Layers,
  Pill,
  User,
  Building2,
  Calendar,
  ShieldCheck,
  Copy,
  Check,
  FileCode,
  Info,
  Clock,
  Sparkles,
  Droplet,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ResourceSheetProps {
  resource: FhirResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResourceSheet: React.FC<ResourceSheetProps> = ({
  resource,
  open,
  onOpenChange,
}) => {
  const [copiedRx, setCopiedRx] = useState(false);
  const [showTechnicalInspector, setShowTechnicalInspector] = useState(false);

  if (!resource) return null;

  const isMedication = resource.resourceType === 'MedicationRequest';
  const isObservation = resource.resourceType === 'Observation';
  const isCondition = resource.resourceType === 'Condition';
  const isEncounter = resource.resourceType === 'Encounter';

  // Helper for MedicationRequest details
  let rxId = '';
  let drugName = '';
  let dosage = '';
  let doctorName = '';
  let hospitalName = '';
  let authoredDate = '';

  if (isMedication) {
    const med = resource as any;
    const rxTokenIdentifier = med.identifier?.find(
      (id: any) =>
        id.system === 'https://abdm.gov.in/rx-token' ||
        id.system === 'https://phr-demo.example.org/rx-token' ||
        id.system?.toLowerCase().includes('prescription') ||
        id.system?.toLowerCase().includes('rx') ||
        (typeof id.value === 'string' &&
          (id.value.startsWith('APL-') || id.value.startsWith('RX-') || id.value.startsWith('HS-')))
    );
    rxId =
      rxTokenIdentifier?.value ||
      med.groupIdentifier?.value ||
      med.speakable_rx_id ||
      med.rx_id ||
      (med.identifier?.[0]?.value?.includes('-') ? med.identifier[0].value : undefined) ||
      'APL-RR-1410-RAME';

    drugName =
      med.medicationCodeableConcept?.coding?.[0]?.display ||
      med.medicationCodeableConcept?.text ||
      'Prescribed Medication';

    dosage = med.dosageInstruction?.[0]?.text || 'As directed by physician';
    doctorName = med.requester?.display || 'Dr. Rajesh Rao, MD';
    hospitalName = med.encounter?.display || 'Apollo Hospitals';
    authoredDate = med.authoredOn
      ? new Date(med.authoredOn).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Recent';
  }

  const handleCopyRx = () => {
    if (!rxId) return;
    void navigator.clipboard.writeText(rxId);
    setCopiedRx(true);
    setTimeout(() => setCopiedRx(false), 2000);
  };

  const spokenPhrase = rxId ? formatSpokenRxId(rxId) : '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-5 sm:max-w-[620px] w-full overflow-y-auto max-h-screen p-6">
        {/* MEDICATION DETAIL VIEW ("Read in Detail") */}
        {isMedication ? (
          <div className="space-y-6">
            <SheetHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="eyebrow-pill text-[10px] bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                  <span className="eyebrow-dot bg-emerald-400" />
                  Verified e-Prescription (ABDM R4)
                </span>
                <Badge variant="outline" className="border-white/20 text-stone-300 text-xs font-mono">
                  Active
                </Badge>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle className="text-2xl sm:text-3xl text-stone-100 font-serif font-normal">
                    {drugName}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-stone-300 mt-1">
                    Official digital prescription record issued by licensed medical practitioner.
                  </SheetDescription>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 font-serif text-2xl border border-sky-500/30">
                  ℞
                </div>
              </div>
            </SheetHeader>

            {/* Prescription Share ID Card */}
            <div className="rounded-24 border border-emerald-500/30 bg-emerald-950/50 p-5 shadow-soft backdrop-blur-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Prescription Share Code (Rx-ID)
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-mono text-emerald-300 font-medium">
                  ABDM Token
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-emerald-400/30 bg-emerald-900/40 shadow-xs">
                    <p className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-emerald-200 select-all">
                      {rxId}
                    </p>
                  </div>
                  {spokenPhrase && (
                    <p className="text-[11px] text-stone-300 flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-stone-400">Phonetic pronunciation:</span>{' '}
                      <span className="text-emerald-300 font-mono font-medium">{spokenPhrase}</span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCopyRx}
                  className={`inline-flex items-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-xs ${
                    copiedRx
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50'
                      : 'bg-white/10 hover:bg-white/20 text-stone-100 border border-white/15 hover:border-white/25'
                  }`}
                  aria-label="Copy prescription ID"
                >
                  {copiedRx ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5 text-emerald-400" />}
                  <span>{copiedRx ? 'Copied Rx-ID!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Clinical Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-20 border border-white/10 bg-white/5 p-4">
                <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block mb-1">
                  Dosage & Administration
                </span>
                <p className="font-medium text-sm text-stone-200">{dosage}</p>
              </div>

              <div className="rounded-20 border border-white/10 bg-white/5 p-4">
                <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block mb-1">
                  Prescription Date
                </span>
                <div className="flex items-center gap-2 text-sm text-stone-200 font-mono">
                  <Calendar className="h-3.5 w-3.5 text-stone-400" />
                  <span>{authoredDate}</span>
                </div>
              </div>

              <div className="rounded-20 border border-white/10 bg-white/5 p-4">
                <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block mb-1">
                  Prescribing Physician
                </span>
                <div className="flex items-center gap-2 text-sm text-stone-200">
                  <User className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{doctorName}</span>
                </div>
              </div>

              <div className="rounded-20 border border-white/10 bg-white/5 p-4">
                <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block mb-1">
                  Healthcare Center
                </span>
                <div className="flex items-center gap-2 text-sm text-stone-200">
                  <Building2 className="h-3.5 w-3.5 text-stone-400" />
                  <span>{hospitalName}</span>
                </div>
              </div>
            </div>

            {/* Jan Aushadhi (PMBJP) Generic Savings Card */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Affordable Generic Savings (Jan Aushadhi)
                </h4>
              </div>
              <SavingsCard rxId={rxId} defaultExpanded={true} />
            </div>

            {/* Patient Safe Usage Guidance */}
            <div className="rounded-20 border border-white/10 bg-white/5 p-4 text-xs text-stone-300 space-y-2">
              <div className="flex items-center gap-2 text-stone-200 font-semibold">
                <Info className="h-4 w-4 text-sky-400" />
                <span>Patient Guidance & Precautions</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-stone-400 text-[11px]">
                <li>Take medication at scheduled intervals with water.</li>
                <li>Complete full prescribed course unless advised otherwise by your doctor.</li>
                <li>Store in a cool, dry place away from direct sunlight.</li>
                <li>If you experience adverse reactions, consult your physician immediately.</li>
              </ul>
            </div>

            {/* Collapsible Technical FHIR Inspector (Optional for Developer / Clinician Audit) */}
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowTechnicalInspector(!showTechnicalInspector)}
                className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-stone-300 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-moss-400" />
                  <span>Technical FHIR R4 Schema & JSON Inspector</span>
                </span>
                {showTechnicalInspector ? (
                  <ChevronUp className="h-4 w-4 text-stone-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-stone-400" />
                )}
              </button>

              {showTechnicalInspector && (
                <div className="mt-4 space-y-4 animate-fade-up">
                  <StandardsPanel resource={resource} />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] uppercase tracking-wider text-stone-400 font-medium flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" />
                        Resource Payload
                      </span>
                      <span className="text-[11px] text-stone-500 font-mono">
                        application/fhir+json
                      </span>
                    </div>
                    <DarkJsonViewer data={resource} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* NON-MEDICATION CLINICAL RESOURCES (Labs, Conditions, Encounters) */
          <div className="space-y-5">
            <SheetHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="eyebrow-pill text-[10px] bg-white/10 border-white/20 text-stone-300">
                  <span className="eyebrow-dot bg-emerald-400" />
                  Clinical {resource.resourceType} Record
                </span>
                <Badge variant="outline" className="border-white/20 text-stone-300 text-xs font-mono">
                  {resource.id}
                </Badge>
              </div>

              <SheetTitle className="text-2xl sm:text-3xl text-stone-100 font-serif font-normal">
                {isObservation && ((resource as any).code?.coding?.[0]?.display || (resource as any).code?.text || 'Lab Observation')}
                {isCondition && ((resource as any).code?.coding?.[0]?.display || (resource as any).code?.text || 'Medical Condition')}
                {isEncounter && ((resource as any).serviceProvider?.display || 'Medical Encounter')}
                {!isObservation && !isCondition && !isEncounter && `${resource.resourceType} Resource`}
              </SheetTitle>

              <SheetDescription className="text-xs text-stone-300">
                Detailed clinical biomarkers, NRCeS interoperability profiles, and coding terminology.
              </SheetDescription>
            </SheetHeader>

            {/* Observation Quick Metrics Card */}
            {isObservation && (
              <div className="rounded-20 border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Recorded Result
                  </span>
                  <Badge variant="outline" className="border-white/20 text-stone-300 font-mono text-[10px]">
                    {(resource as any).effectiveDateTime?.split('T')[0] || (resource as any).issued?.split('T')[0] || 'Recent'}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-bold font-serif text-stone-100">
                    {(resource as any).valueQuantity?.value ?? (resource as any).valueString ?? 'Recorded'}
                  </span>
                  <span className="text-base text-emerald-400 font-medium">
                    {(resource as any).valueQuantity?.unit ?? ''}
                  </span>
                </div>
              </div>
            )}

            {/* Condition Quick Card */}
            {isCondition && (
              <div className="rounded-20 border border-white/10 bg-white/5 p-4 space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Clinical Status
                </span>
                <p className="text-lg font-medium text-stone-100">
                  {(resource as any).clinicalStatus?.coding?.[0]?.display || 'Active'}
                </p>
              </div>
            )}

            {/* Encounter Quick Card */}
            {isEncounter && (
              <div className="rounded-20 border border-white/10 bg-white/5 p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Consultation Type
                  </span>
                  <Badge variant="outline" className="border-white/20 text-stone-300 font-mono text-[10px]">
                    {(resource as any).status || 'finished'}
                  </Badge>
                </div>
                <p className="text-lg font-medium text-stone-100">
                  {(resource as any).class?.display || (resource as any).class?.code || 'Outpatient Consultation'}
                </p>
              </div>
            )}

            {/* Standards & Terminology Inspection Panel */}
            <div className="space-y-4">
              <StandardsPanel resource={resource} />

              {/* Raw JSON inspector with line highlights */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-wider text-stone-400 font-medium flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Resource Payload
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">
                    application/fhir+json
                  </span>
                </div>
                <DarkJsonViewer data={resource} />
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
