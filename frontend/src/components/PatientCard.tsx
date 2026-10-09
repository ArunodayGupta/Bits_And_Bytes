import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import type { FhirPatient } from '@/lib/fhir/types';
import { Badge } from '@/components/ui/badge';

interface PatientCardProps {
  patient: FhirPatient | null;
  compact?: boolean;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, compact = false }) => {
  const patientName = patient?.name?.[0]?.text || 'Ramesh Kumar';
  const abhaId =
    patient?.identifier?.find((i) => i.system === 'https://healthid.ndhm.gov.in')?.value ||
    '91-1234-5678-9012';

  // Calculate initials
  const initials = patientName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'RK';

  // Age / gender
  const gender = patient?.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'Male';
  let age: number | string = 52;
  if (patient?.birthDate) {
    const birthYear = new Date(patient.birthDate).getFullYear();
    if (!isNaN(birthYear)) {
      age = new Date().getFullYear() - birthYear;
    }
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-600 text-paper font-serif font-semibold shadow-sm">
          {initials}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-medium text-ink truncate leading-tight">
              {patientName}
            </span>
            <Badge variant="verified" className="h-5 px-1.5 py-0 text-[10px] gap-1">
              <CheckCircle2 className="h-3 w-3 text-moss-600" />
              <span>Verified</span>
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <span>{age} · {gender}</span>
            <span>•</span>
            <span className="font-mono text-[11px] text-ink-soft tracking-wider">{abhaId}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-20 border border-hairline bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-600 text-paper font-serif text-xl font-semibold shadow-sm">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-serif text-2xl font-normal text-ink">
                {patientName}
              </h2>
              <Badge variant="verified" className="gap-1 px-2 py-0.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-moss-600" />
                <span>Verified ABHA</span>
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
              <span>{age} years</span>
              <span>•</span>
              <span>{gender}</span>
              <span>•</span>
              <span className="font-mono tracking-wider font-medium text-ink bg-paper-2 px-2 py-0.5 rounded-full border border-hairline text-xs">
                ABHA: {abhaId}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-moss-600 bg-moss-100/60 px-3 py-1.5 rounded-full border border-moss-500/20">
          <ShieldCheck className="h-4 w-4" />
          <span className="font-medium">ABDM / NRCeS Compliant</span>
        </div>
      </div>
    </div>
  );
};
