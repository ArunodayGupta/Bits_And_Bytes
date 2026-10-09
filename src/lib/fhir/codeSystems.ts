// Code system mappings for FHIR R4 Standards Inspector

export interface CodeSystemInfo {
  label: string;
  badgeClass: string;
  category: 'clinical' | 'lab' | 'units' | 'hl7' | 'id' | 'other';
}

export const KNOWN_CODE_SYSTEMS: Record<string, CodeSystemInfo> = {
  'http://snomed.info/sct': {
    label: 'SNOMED CT',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800',
    category: 'clinical',
  },
  'http://loinc.org': {
    label: 'LOINC',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800',
    category: 'lab',
  },
  'http://unitsofmeasure.org': {
    label: 'UCUM',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800',
    category: 'units',
  },
  'http://terminology.hl7.org/CodeSystem/v3-ActCode': {
    label: 'HL7 ActCode',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800',
    category: 'hl7',
  },
  'http://terminology.hl7.org/CodeSystem/condition-clinical': {
    label: 'HL7 Condition Clinical',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-800',
    category: 'hl7',
  },
  'http://terminology.hl7.org/CodeSystem/condition-ver-status': {
    label: 'HL7 Condition VerStatus',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200 dark:border-indigo-800',
    category: 'hl7',
  },
  'http://terminology.hl7.org/CodeSystem/observation-category': {
    label: 'HL7 Observation Category',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-200 dark:border-cyan-800',
    category: 'hl7',
  },
  'http://terminology.hl7.org/CodeSystem/v2-0203': {
    label: 'HL7 Identifier Type',
    badgeClass: 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    category: 'hl7',
  },
  'https://healthid.ndhm.gov.in': {
    label: 'ABDM ABHA ID',
    badgeClass: 'bg-moss-100 text-moss-600 border-moss-500',
    category: 'id',
  },
  'https://doctor.ndhm.gov.in': {
    label: 'ABDM HPR (Doctor ID)',
    badgeClass: 'bg-moss-100 text-moss-600 border-moss-500',
    category: 'id',
  },
  'https://facility.ndhm.gov.in': {
    label: 'ABDM HFR (Facility ID)',
    badgeClass: 'bg-moss-100 text-moss-600 border-moss-500',
    category: 'id',
  },
  'https://abdm.gov.in/rx-token': {
    label: 'Speakable Rx-ID Token',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-200 dark:border-teal-800',
    category: 'id',
  },
};

export function getSystemLabel(systemUrl?: string): string {
  if (!systemUrl) return 'Unspecified System';
  if (KNOWN_CODE_SYSTEMS[systemUrl]) {
    return KNOWN_CODE_SYSTEMS[systemUrl].label;
  }
  // Try clean URL display
  try {
    const url = new URL(systemUrl);
    return url.hostname.replace('www.', '');
  } catch {
    return systemUrl;
  }
}

export function getSystemBadgeClass(systemUrl?: string): string {
  if (!systemUrl) return 'bg-stone-100 text-stone-700 border-stone-200';
  return KNOWN_CODE_SYSTEMS[systemUrl]?.badgeClass ?? 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700';
}
