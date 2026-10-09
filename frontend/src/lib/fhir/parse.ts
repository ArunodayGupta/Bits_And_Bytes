import { z } from 'zod';
import {
  generateSpeakableRxId,
  allocateRxId,
  RX_TOKEN_SYSTEM,
} from '../rxId';
import type {
  FhirPatient,
  FhirEncounter,
  FhirCondition,
  FhirObservation,
  FhirMedicationRequest,
  FhirResource,
} from './types';

// Zod schema for validating input bundles
export const FhirBundleZodSchema = z.object({
  resourceType: z.literal('Bundle'),
  type: z.enum(['collection', 'document', 'transaction']).optional().default('collection'),
  entry: z.array(
    z.object({
      fullUrl: z.string().optional(),
      resource: z.object({
        resourceType: z.string(),
        id: z.string().optional(),
      }).passthrough(),
    })
  ).optional().default([]),
}).passthrough();

export interface ParsedResourceRow {
  resource_type: string;
  fhir_id: string;
  event_date: string | null;
  encounter_fhir_id?: string | null;
  speakable_rx_id?: string | null;
  summary_title: string;
  summary_value: string | null;
  source?: 'ingested' | 'ocr_scan';
  raw_json: unknown;
}

export interface ParsedPrescriptionRow {
  rx_id: string;
  encounter_fhir_id?: string | null;
  hospital_name: string | null;
  doctor_name: string | null;
  issued_on: string;
}

export interface ParsedPatientRow {
  abha_id: string;
  fhir_id: string | null;
  name: string;
  gender: string | null;
  dob: string | null;
  phone: string | null;
  is_demo: boolean;
}

export interface ParseBundleResult {
  patient: ParsedPatientRow;
  resources: ParsedResourceRow[];
  prescriptions: ParsedPrescriptionRow[];
  counts: Record<string, number>;
  skipped: Array<{ resourceType: string; count: number }>;
  warnings: string[];
  rxIds: string[];
}

export interface IngestOptions {
  abhaId?: string;
  isDemo?: boolean;
}

/**
 * Format Observation value summary defensively.
 * Combines systolic (8480-6) and diastolic (8462-4) for blood pressure panels (85354-9).
 */
export function formatObservationSummaryValue(obs: FhirObservation): string {
  // Check for blood pressure panel LOINC 85354-9 or components
  const codingList = obs.code?.coding || [];
  const isBpPanel = codingList.some((c) => c.code === '85354-9' || c.display?.toLowerCase().includes('blood pressure'));

  const rawAny = obs as Record<string, unknown>;
  const components = (rawAny.component as Array<Record<string, unknown>>) || [];

  if (isBpPanel || components.length >= 2) {
    let systolic: number | string | undefined;
    let diastolic: number | string | undefined;
    let unit = 'mmHg';

    for (const comp of components) {
      const codeList = (comp.code as Record<string, unknown>)?.coding as Array<Record<string, unknown>> || [];
      const isSystolic = codeList.some((c) => c.code === '8480-6' || String(c.display).toLowerCase().includes('systolic'));
      const isDiastolic = codeList.some((c) => c.code === '8462-4' || String(c.display).toLowerCase().includes('diastolic'));

      const valQty = comp.valueQuantity as Record<string, unknown> | undefined;
      if (valQty && typeof valQty.value !== 'undefined') {
        if (valQty.unit) unit = String(valQty.unit);
        if (isSystolic) systolic = valQty.value as number;
        if (isDiastolic) diastolic = valQty.value as number;
      }
    }

    if (typeof systolic !== 'undefined' && typeof diastolic !== 'undefined') {
      return `${systolic}/${diastolic} ${unit}`;
    }
  }

  // Single valueQuantity
  if (obs.valueQuantity && typeof obs.valueQuantity.value !== 'undefined') {
    const val = obs.valueQuantity.value;
    const unit = obs.valueQuantity.unit || obs.valueQuantity.code || '';
    return unit ? `${val} ${unit}` : String(val);
  }

  // valueString or valueCodeableConcept
  if (obs.valueString) {
    return obs.valueString;
  }

  const valueConcept = rawAny.valueCodeableConcept as Record<string, unknown> | undefined;
  if (valueConcept) {
    const codings = valueConcept.coding as Array<Record<string, unknown>> | undefined;
    if (codings && codings[0]?.display) return String(codings[0].display);
    if (valueConcept.text) return String(valueConcept.text);
  }

  return 'Recorded';
}

/**
 * Pure parser that inspects a FHIR Bundle and maps all supported resources into DB payload rows.
 */
export function parseFhirBundle(rawBundle: unknown, opts: IngestOptions = {}): ParseBundleResult {
  // 1. Zod Validation
  const validated = FhirBundleZodSchema.parse(rawBundle);

  const entries = validated.entry || [];
  const warnings: string[] = [];
  const counts: Record<string, number> = {
    Patient: 0,
    Encounter: 0,
    Condition: 0,
    Observation: 0,
    MedicationRequest: 0,
  };
  const skippedMap = new Map<string, number>();

  // 2. Identify Patient resource
  const patientEntries = entries.filter((e) => e.resource.resourceType === 'Patient');
  if (patientEntries.length === 0) {
    throw new Error('Invalid bundle: Exactly one Patient resource is required, but found 0.');
  }
  if (patientEntries.length > 1) {
    throw new Error(`Invalid bundle: Exactly one Patient resource is required, but found ${patientEntries.length}.`);
  }

  const patientResource = patientEntries[0].resource as unknown as FhirPatient;
  counts.Patient = 1;

  // Extract ABHA number
  let abhaId = opts.abhaId;
  if (!abhaId && patientResource.identifier) {
    for (const ident of patientResource.identifier) {
      const isAbhaSystem = ident.system && ident.system.includes('healthid.ndhm.gov.in');
      const isAbhaType = ident.type?.text?.toUpperCase().includes('ABHA') ||
        ident.type?.coding?.some((c) => c.code === 'MR' || c.display?.includes('ABHA'));
      if ((isAbhaSystem || isAbhaType) && ident.value) {
        abhaId = ident.value.trim();
        break;
      }
    }
    // Fallback: check any 14-digit hyphenated value
    if (!abhaId) {
      for (const ident of patientResource.identifier) {
        if (ident.value && /^\d{2}-\d{4}-\d{4}-\d{4}$/.test(ident.value)) {
          abhaId = ident.value;
          break;
        }
      }
    }
  }

  if (!abhaId) {
    throw new Error('No ABHA identifier found in Patient resource, and none provided in opts.abhaId.');
  }

  // Extract Patient demographics
  const patientGiven = patientResource.name?.[0]?.given?.[0];
  const patientFamily = patientResource.name?.[0]?.family;
  const patientName = patientResource.name?.[0]?.text ||
    [patientGiven, patientFamily].filter(Boolean).join(' ') ||
    'Ramesh Kumar';

  const patientRow: ParsedPatientRow = {
    abha_id: abhaId,
    fhir_id: patientResource.id || 'patient-1',
    name: patientName,
    gender: patientResource.gender || null,
    dob: patientResource.birthDate || null,
    phone: patientResource.telecom?.find((t) => t.system === 'phone')?.value || null,
    is_demo: opts.isDemo ?? false,
  };

  // 3. Build reference resolution lookup table
  // Maps fullUrls (e.g. urn:uuid:enc-1) and relative IDs (Encounter/enc-1) -> target Encounter fhir_id
  const encounterIdMap = new Map<string, string>();
  const encounterResourceMap = new Map<string, FhirEncounter>();
  const practitionerMap = new Map<string, string>();
  const orgMap = new Map<string, string>();

  for (const entry of entries) {
    const res = entry.resource as unknown as FhirResource;
    const rType = res.resourceType;
    const fhirId = res.id || '';

    if (rType === 'Encounter') {
      const enc = res as FhirEncounter;
      if (fhirId) {
        encounterIdMap.set(fhirId, fhirId);
        encounterIdMap.set(`Encounter/${fhirId}`, fhirId);
        encounterResourceMap.set(fhirId, enc);
      }
      if (entry.fullUrl) {
        encounterIdMap.set(entry.fullUrl, fhirId);
        encounterResourceMap.set(entry.fullUrl, enc);
      }
    } else if (rType === 'Practitioner') {
      const docName = (res as any).name?.[0]?.text || (res as any).name?.[0]?.family || 'Dr';
      if (fhirId) practitionerMap.set(fhirId, docName);
      if (entry.fullUrl) practitionerMap.set(entry.fullUrl, docName);
    } else if (rType === 'Organization') {
      const orgName = (res as any).name || 'Hospital';
      if (fhirId) orgMap.set(fhirId, orgName);
      if (entry.fullUrl) orgMap.set(entry.fullUrl, orgName);
    }
  }

  // Helper to resolve an encounter reference
  const resolveEncounterId = (refStr?: string): string | null => {
    if (!refStr) return null;
    const resolved = encounterIdMap.get(refStr);
    if (resolved) return resolved;
    // Check if stripped reference matches
    const clean = refStr.replace(/^Encounter\//, '').replace(/^urn:uuid:/, '');
    if (encounterIdMap.has(clean)) return encounterIdMap.get(clean)!;
    warnings.push(`Could not resolve encounter reference: ${refStr}`);
    return null;
  };

  // 4. Pre-group MedicationRequests by Encounter for shared Rx-ID allocation
  // Group key: `${encounterFhirId || 'standalone'}-${doctorName}`
  const medRequestsByGroup = new Map<string, Array<{ entry: typeof entries[0]; med: FhirMedicationRequest }>>();

  for (const entry of entries) {
    if (entry.resource.resourceType === 'MedicationRequest') {
      const med = entry.resource as unknown as FhirMedicationRequest;
      const encId = resolveEncounterId(med.encounter?.reference) || 'standalone';
      const docName = med.requester?.display || 'Dr';
      const groupKey = `${encId}::${docName}`;

      if (!medRequestsByGroup.has(groupKey)) {
        medRequestsByGroup.set(groupKey, []);
      }
      medRequestsByGroup.get(groupKey)!.push({ entry, med });
    }
  }

  // Registry for collision allocation
  const rxRegistry = new Map<string, string>(); // rxId -> groupKey
  const groupToRxId = new Map<string, string>();

  for (const [groupKey, list] of medRequestsByGroup.entries()) {
    const firstMed = list[0].med;
    const encId = resolveEncounterId(firstMed.encounter?.reference);
    const enc = encId ? encounterResourceMap.get(encId) : undefined;

    const hospitalName =
      enc?.serviceProvider?.display ||
      firstMed.encounter?.display ||
      'Apollo Hospital';

    const doctorName =
      firstMed.requester?.display ||
      enc?.participant?.[0]?.individual?.display ||
      'Dr. Rajesh Rao';

    const dateStr = firstMed.authoredOn || enc?.period?.start || new Date().toISOString();

    const candidateRxId = generateSpeakableRxId(
      hospitalName,
      doctorName,
      dateStr,
      patientGiven || patientName
    );

    const allocated = allocateRxId(candidateRxId, rxRegistry, groupKey);
    groupToRxId.set(groupKey, allocated);
  }

  // 5. Parse Resources
  const resources: ParsedResourceRow[] = [];
  const prescriptionsMap = new Map<string, ParsedPrescriptionRow>();

  for (const entry of entries) {
    const res = entry.resource as unknown as FhirResource;
    const rType = res.resourceType;
    const fhirId = res.id || `res-${Math.random().toString(36).substring(2, 9)}`;

    switch (rType) {
      case 'Patient':
        // Patient is stored in patients table, not fhir_resources
        break;

      case 'Encounter': {
        counts.Encounter = (counts.Encounter || 0) + 1;
        const enc = res as FhirEncounter;
        const rawAny = enc as Record<string, unknown>;
        const typeCoding = (rawAny.type as Array<{ text?: string; coding?: Array<{ display?: string }> }>)?.[0];
        const summaryTitle =
          typeCoding?.text ||
          typeCoding?.coding?.[0]?.display ||
          enc.class?.display ||
          'Consultation';
        const summaryValue = enc.serviceProvider?.display || 'Medical Center';
        const eventDate = enc.period?.start || null;

        resources.push({
          resource_type: 'Encounter',
          fhir_id: fhirId,
          event_date: eventDate,
          summary_title: summaryTitle,
          summary_value: summaryValue,
          raw_json: JSON.parse(JSON.stringify(enc)),
        });
        break;
      }

      case 'Condition': {
        counts.Condition = (counts.Condition || 0) + 1;
        const cond = res as FhirCondition;
        const summaryTitle = cond.code?.coding?.[0]?.display || cond.code?.text || 'Health Condition';
        const summaryValue = cond.clinicalStatus?.coding?.[0]?.code || 'active';
        const eventDate = cond.recordedDate || cond.onsetDateTime || null;

        const encId = resolveEncounterId((cond as any).encounter?.reference);

        resources.push({
          resource_type: 'Condition',
          fhir_id: fhirId,
          event_date: eventDate,
          encounter_fhir_id: encId,
          summary_title: summaryTitle,
          summary_value: summaryValue,
          raw_json: JSON.parse(JSON.stringify(cond)),
        });
        break;
      }

      case 'Observation': {
        counts.Observation = (counts.Observation || 0) + 1;
        const obs = res as FhirObservation;
        const summaryTitle = obs.code?.coding?.[0]?.display || obs.code?.text || 'Lab Observation';
        const summaryValue = formatObservationSummaryValue(obs);
        const eventDate = obs.effectiveDateTime || (obs as any).effectivePeriod?.start || obs.issued || null;
        const encId = resolveEncounterId((obs as any).encounter?.reference);
        const obsSource = (obs as any).source || (
          Array.isArray((obs.meta as any)?.tag) &&
          (obs.meta as any).tag.some((t: any) => t.code === 'ocr-scan')
            ? 'ocr_scan'
            : 'ingested'
        );

        resources.push({
          resource_type: 'Observation',
          fhir_id: fhirId,
          event_date: eventDate,
          encounter_fhir_id: encId,
          summary_title: summaryTitle,
          summary_value: summaryValue,
          source: obsSource,
          raw_json: JSON.parse(JSON.stringify(obs)),
        });
        break;
      }

      case 'MedicationRequest': {
        counts.MedicationRequest = (counts.MedicationRequest || 0) + 1;
        const med = res as FhirMedicationRequest;
        const encId = resolveEncounterId(med.encounter?.reference);
        const docName = med.requester?.display || 'Dr';
        const groupKey = `${encId || 'standalone'}::${docName}`;
        const rxId = groupToRxId.get(groupKey) || 'GEN-MD-0101-RAME';

        const summaryTitle =
          med.medicationCodeableConcept?.text ||
          med.medicationCodeableConcept?.coding?.[0]?.display ||
          'Prescribed Medication';
        const summaryValue = med.dosageInstruction?.[0]?.text || null;
        const eventDate = med.authoredOn || null;

        // Clone raw_json and inject identifiers
        const clonedMed = JSON.parse(JSON.stringify(med)) as FhirMedicationRequest;
        const existingIdentifiers = clonedMed.identifier || [];
        const hasToken = existingIdentifiers.some((id) => id.system === RX_TOKEN_SYSTEM);

        if (!hasToken) {
          clonedMed.identifier = [
            ...existingIdentifiers,
            { system: RX_TOKEN_SYSTEM, value: rxId },
          ];
        }

        clonedMed.groupIdentifier = {
          system: RX_TOKEN_SYSTEM,
          value: rxId,
        };

        resources.push({
          resource_type: 'MedicationRequest',
          fhir_id: fhirId,
          event_date: eventDate,
          encounter_fhir_id: encId,
          speakable_rx_id: rxId,
          summary_title: summaryTitle,
          summary_value: summaryValue,
          raw_json: clonedMed,
        });

        // Record prescription header row if not already added
        if (!prescriptionsMap.has(rxId)) {
          const enc = encId ? encounterResourceMap.get(encId) : undefined;
          const hospitalName = enc?.serviceProvider?.display || med.encounter?.display || 'Apollo Hospital';
          const prescriber = med.requester?.display || enc?.participant?.[0]?.individual?.display || 'Dr. Rajesh Rao';
          const issuedOn = eventDate ? eventDate.substring(0, 10) : new Date().toISOString().substring(0, 10);

          prescriptionsMap.set(rxId, {
            rx_id: rxId,
            encounter_fhir_id: encId,
            hospital_name: hospitalName,
            doctor_name: prescriber,
            issued_on: issuedOn,
          });
        }
        break;
      }

      default: {
        // Other types (e.g. Composition, Organization, Practitioner) are tracked in skipped
        const currentCount = skippedMap.get(rType) || 0;
        skippedMap.set(rType, currentCount + 1);
        break;
      }
    }
  }

  const skipped: Array<{ resourceType: string; count: number }> = [];
  for (const [rType, count] of skippedMap.entries()) {
    skipped.push({ resourceType: rType, count });
  }

  const prescriptions = Array.from(prescriptionsMap.values());
  const rxIds = prescriptions.map((p) => p.rx_id);

  return {
    patient: patientRow,
    resources,
    prescriptions,
    counts,
    skipped,
    warnings,
    rxIds,
  };
}
