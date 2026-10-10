// Core FHIR R4 TypeScript definitions for HealthSafe

export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string;
  profile?: string[];
  tag?: FhirCoding[];
}

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
  version?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirIdentifier {
  system?: string;
  value?: string;
  type?: FhirCodeableConcept;
}

export interface FhirReference {
  reference?: string;
  display?: string;
  type?: string;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirQuantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirBaseResource {
  resourceType: string;
  id: string;
  meta?: FhirMeta;
  [key: string]: unknown;
}

export interface FhirPatient extends FhirBaseResource {
  resourceType: 'Patient';
  identifier?: FhirIdentifier[];
  name?: Array<{
    text?: string;
    family?: string;
    given?: string[];
    prefix?: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: Array<{
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  telecom?: Array<{
    system?: string;
    value?: string;
    use?: string;
  }>;
}

export interface FhirPractitioner extends FhirBaseResource {
  resourceType: 'Practitioner';
  identifier?: FhirIdentifier[];
  name?: Array<{
    text?: string;
    family?: string;
    given?: string[];
    prefix?: string[];
  }>;
  qualification?: Array<{
    code?: FhirCodeableConcept;
  }>;
}

export interface FhirOrganization extends FhirBaseResource {
  resourceType: 'Organization';
  identifier?: FhirIdentifier[];
  name?: string;
  telecom?: Array<{
    system?: string;
    value?: string;
  }>;
  address?: Array<{
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
  }>;
}

export interface FhirEncounter extends FhirBaseResource {
  resourceType: 'Encounter';
  status?: string;
  class?: FhirCoding;
  subject?: FhirReference;
  participant?: Array<{
    individual?: FhirReference;
  }>;
  period?: FhirPeriod;
  serviceProvider?: FhirReference;
}

export interface FhirCondition extends FhirBaseResource {
  resourceType: 'Condition';
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  recordedDate?: string;
  onsetDateTime?: string;
}

export interface FhirObservation extends FhirBaseResource {
  resourceType: 'Observation';
  status?: string;
  category?: FhirCodeableConcept[];
  code?: FhirCodeableConcept;
  subject?: FhirReference;
  effectiveDateTime?: string;
  issued?: string;
  valueQuantity?: FhirQuantity;
  valueString?: string;
}

export interface FhirDosage {
  text?: string;
}

export interface FhirMedicationRequest extends FhirBaseResource {
  resourceType: 'MedicationRequest';
  status?: string;
  intent?: string;
  identifier?: FhirIdentifier[];
  groupIdentifier?: FhirIdentifier;
  medicationCodeableConcept?: FhirCodeableConcept;
  subject?: FhirReference;
  encounter?: FhirReference;
  authoredOn?: string;
  requester?: FhirReference;
  dosageInstruction?: FhirDosage[];
}

export type FhirResource =
  | FhirPatient
  | FhirPractitioner
  | FhirOrganization
  | FhirEncounter
  | FhirCondition
  | FhirObservation
  | FhirMedicationRequest
  | FhirBaseResource;

export interface FhirBundleEntry {
  fullUrl?: string;
  resource: FhirResource;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id?: string;
  meta?: FhirMeta;
  type?: string;
  timestamp?: string;
  entry?: FhirBundleEntry[];
  total?: number;
}

// Timeline model types
export type TimelineEventType = 'medication' | 'lab' | 'condition' | 'encounter';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string; // YYYY-MM-DD or 'undated'
  dateTimeRaw?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  hospital?: string;
  doctor?: string;
  numericValue?: number;
  unit?: string;
  rxId?: string;
  speakableRxId?: string;
  source?: 'ingested' | 'ocr_scan';
  resource: FhirResource;
}

export interface TimelineDateGroup {
  date: string; // YYYY-MM-DD or 'Undated'
  displayDate: string; // e.g. "14 Oct 2024" or "Undated"
  hospitalNames: string[];
  events: TimelineEvent[];
}
