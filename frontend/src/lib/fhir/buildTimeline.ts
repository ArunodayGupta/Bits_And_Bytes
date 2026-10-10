import type {
  FhirBundle,
  FhirEncounter,
  FhirCondition,
  FhirObservation,
  FhirMedicationRequest,
  TimelineEvent,
  TimelineDateGroup,
} from './types';

/**
 * Format a calendar date to a local-safe YYYY-MM-DD string.
 * Handles ISO timestamps with timezone offsets or simple date strings safely.
 */
export function extractLocalDateString(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') {
    return 'Undated';
  }

  // If already YYYY-MM-DD format
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Undated';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return 'Undated';
  }
}

/**
 * Pretty formats a YYYY-MM-DD date string into "14 Oct 2024" or "Undated".
 */
export function formatDisplayDate(dateKey: string): string {
  if (dateKey === 'Undated') return 'Undated Records';
  try {
    const [y, m, d] = dateKey.split('-').map(Number);
    if (!y || !m || !d) return dateKey;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateKey;
  }
}

/**
 * Extract a human-readable title from CodeableConcept with full fallback chain.
 */
export function extractConceptDisplay(
  concept?: {
    coding?: Array<{ display?: string; code?: string; system?: string }>;
    text?: string;
  },
  fallback = 'Clinical Item'
): string {
  if (!concept) return fallback;
  if (concept.text && concept.text.trim()) return concept.text.trim();
  if (concept.coding && concept.coding.length > 0) {
    const first = concept.coding[0];
    if (first.display && first.display.trim()) return first.display.trim();
    if (first.code && first.code.trim()) return `Code ${first.code}`;
  }
  return fallback;
}

/**
 * Parse an Encounter resource defensively into a TimelineEvent.
 */
export function parseEncounterEvent(enc: FhirEncounter): TimelineEvent {
  const dateKey = extractLocalDateString(enc.period?.start);
  const hospital = enc.serviceProvider?.display || 'Medical Center';
  const doctor = enc.participant?.[0]?.individual?.display;

  return {
    id: enc.id || `enc-${Math.random()}`,
    type: 'encounter',
    date: dateKey,
    dateTimeRaw: enc.period?.start,
    title: enc.class?.display ? `${enc.class.display} Consultation` : 'Clinical Consultation',
    subtitle: doctor ? `With ${doctor}` : `Status: ${enc.status || 'Finished'}`,
    hospital,
    doctor,
    badge: enc.class?.code || 'Outpatient',
    resource: enc,
  };
}

/**
 * Parse a Condition resource defensively into a TimelineEvent.
 */
export function parseConditionEvent(
  cond: FhirCondition,
  _encounterHospitalMap?: Map<string, string>
): TimelineEvent {
  const dateKey = extractLocalDateString(cond.recordedDate || cond.onsetDateTime);
  const title = extractConceptDisplay(cond.code, 'Diagnosed Condition');
  const snomedCode = cond.code?.coding?.[0]?.code;
  const status = cond.clinicalStatus?.coding?.[0]?.display || 'Active';

  return {
    id: cond.id || `cond-${Math.random()}`,
    type: 'condition',
    date: dateKey,
    dateTimeRaw: cond.recordedDate || cond.onsetDateTime,
    title,
    subtitle: `Clinical Status: ${status}`,
    badge: snomedCode ? `SNOMED: ${snomedCode}` : undefined,
    resource: cond,
  };
}

/**
 * Parse an Observation resource defensively into a TimelineEvent.
 */
export function parseObservationEvent(obs: FhirObservation): TimelineEvent {
  const dateKey = extractLocalDateString(obs.effectiveDateTime || obs.issued);
  const title = extractConceptDisplay(obs.code, 'Lab Observation');
  const loincCode = obs.code?.coding?.[0]?.code;

  let subtitle = 'Result recorded';
  let numericValue: number | undefined;
  let unit: string | undefined;

  if (obs.valueQuantity && typeof obs.valueQuantity.value === 'number') {
    numericValue = obs.valueQuantity.value;
    unit = obs.valueQuantity.unit || obs.valueQuantity.code || '';
    subtitle = `${numericValue} ${unit}`;
  } else if (obs.valueString) {
    subtitle = obs.valueString;
  }

  const isOcrScan = (obs as any).source === 'ocr_scan' || 
    ((obs.meta as any)?.tag as Array<{ code?: string }> | undefined)?.some((t) => t.code === 'ocr-scan');

  return {
    id: obs.id || `obs-${Math.random()}`,
    type: 'lab',
    date: dateKey,
    dateTimeRaw: obs.effectiveDateTime || obs.issued,
    title,
    subtitle,
    numericValue,
    unit,
    badge: loincCode ? `LOINC: ${loincCode}` : undefined,
    source: isOcrScan ? 'ocr_scan' : 'ingested',
    resource: obs,
  };
}

/**
 * Parse a MedicationRequest resource defensively into a TimelineEvent.
 */
export function parseMedicationRequestEvent(
  med: FhirMedicationRequest,
  encounterHospitalMap: Map<string, string>
): TimelineEvent {
  const dateKey = extractLocalDateString(med.authoredOn);
  const title = extractConceptDisplay(med.medicationCodeableConcept, 'Prescribed Medication');
  const dosage = med.dosageInstruction?.[0]?.text || 'Oral prescription';
  const doctor = med.requester?.display;

  let hospital: string | undefined;
  if (med.encounter?.display) {
    hospital = med.encounter.display;
  } else if (med.encounter?.reference) {
    hospital = encounterHospitalMap.get(med.encounter.reference);
  }

  // Extract injected speakable Rx-ID defensively
  const rxTokenIdentifier = med.identifier?.find(
    (id) =>
      id.system === 'https://abdm.gov.in/rx-token' ||
      id.system === 'https://phr-demo.example.org/rx-token' ||
      id.system?.toLowerCase().includes('prescription') ||
      id.system?.toLowerCase().includes('rx') ||
      (typeof id.value === 'string' &&
        (id.value.startsWith('APL-') || id.value.startsWith('RX-') || id.value.startsWith('HS-')))
  );
  const rxId =
    rxTokenIdentifier?.value ||
    med.groupIdentifier?.value ||
    (med as any).speakable_rx_id ||
    (med as any).rx_id ||
    (med.identifier?.[0]?.value && med.identifier[0].value.includes('-') ? med.identifier[0].value : undefined);

  const isOcrScan = (med as any).source === 'ocr_scan' || 
    ((med.meta as any)?.tag as Array<{ code?: string }> | undefined)?.some((t) => t.code === 'ocr-scan');

  return {
    id: med.id || `med-${Math.random()}`,
    type: 'medication',
    date: dateKey,
    dateTimeRaw: med.authoredOn,
    title,
    subtitle: dosage,
    hospital,
    doctor,
    rxId,
    badge: rxId ? `Rx: ${rxId}` : undefined,
    source: isOcrScan ? 'ocr_scan' : 'ingested',
    resource: med,
  };
}

/**
 * Builds the complete longitudinal timeline from a FHIR bundle.
 * Pure function:
 * - Parses Encounter, Condition, Observation, and MedicationRequest
 * - Groups by calendar date (YYYY-MM-DD)
 * - Merges same-day events into a single parent node
 * - Collects hospital names for each date node
 * - Sorts descending by date, with "Undated" placed at the end
 */
export function buildTimeline(bundle: FhirBundle): TimelineDateGroup[] {
  if (!bundle.entry || bundle.entry.length === 0) {
    return [];
  }

  // Map to resolve encounters to hospitals
  const encounterHospitalMap = new Map<string, string>();
  for (const entry of bundle.entry) {
    if (entry.resource.resourceType === 'Encounter') {
      const enc = entry.resource as FhirEncounter;
      const hosp = enc.serviceProvider?.display || 'Medical Center';
      if (enc.id) {
        encounterHospitalMap.set(enc.id, hosp);
        encounterHospitalMap.set(`urn:uuid:${enc.id}`, hosp);
        encounterHospitalMap.set(`Encounter/${enc.id}`, hosp);
      }
    }
  }

  const allEvents: TimelineEvent[] = [];

  for (const entry of bundle.entry) {
    const res = entry.resource;
    switch (res.resourceType) {
      case 'Encounter':
        allEvents.push(parseEncounterEvent(res as FhirEncounter));
        break;
      case 'Condition':
        allEvents.push(parseConditionEvent(res as FhirCondition, encounterHospitalMap));
        break;
      case 'Observation':
        allEvents.push(parseObservationEvent(res as FhirObservation));
        break;
      case 'MedicationRequest':
        allEvents.push(
          parseMedicationRequestEvent(res as FhirMedicationRequest, encounterHospitalMap)
        );
        break;
      default:
        // Other resources (Patient, Practitioner, Organization) are referenced or displayed in profile
        break;
    }
  }

  // Group by date
  const groupsByDate = new Map<string, TimelineEvent[]>();
  for (const ev of allEvents) {
    const d = ev.date;
    if (!groupsByDate.has(d)) {
      groupsByDate.set(d, []);
    }
    groupsByDate.get(d)!.push(ev);
  }

  // Build TimelineDateGroups
  const dateGroups: TimelineDateGroup[] = [];

  for (const [dateKey, events] of groupsByDate.entries()) {
    // Sort events within the same day: Encounters first, then Conditions, Labs, Medications
    const priorityMap: Record<string, number> = {
      encounter: 1,
      condition: 2,
      lab: 3,
      medication: 4,
    };

    events.sort((a, b) => {
      const pA = priorityMap[a.type] ?? 5;
      const pB = priorityMap[b.type] ?? 5;
      return pA - pB;
    });

    // Gather distinct hospital names and propagate rxId if present for same-day medications
    const hospitalSet = new Set<string>();
    let groupRxId: string | undefined;
    for (const ev of events) {
      if (ev.hospital) hospitalSet.add(ev.hospital);
      if (ev.type === 'medication' && ev.rxId && !groupRxId) {
        groupRxId = ev.rxId;
      }
    }

    if (groupRxId) {
      for (const ev of events) {
        if (ev.type === 'medication' && !ev.rxId) {
          ev.rxId = groupRxId;
          ev.badge = `Rx: ${groupRxId}`;
        }
      }
    }

    dateGroups.push({
      date: dateKey,
      displayDate: formatDisplayDate(dateKey),
      hospitalNames: Array.from(hospitalSet),
      events,
    });
  }

  // Sort descending by date (YYYY-MM-DD), with "Undated" placed at the very end
  dateGroups.sort((a, b) => {
    if (a.date === 'Undated') return 1;
    if (b.date === 'Undated') return -1;
    return b.date.localeCompare(a.date);
  });

  return dateGroups;
}

export interface TrendPoint {
  date: string;
  displayDate: string;
  value: number;
  unit: string;
}

export interface TrendSeries {
  code: string;
  name: string;
  unit: string;
  points: TrendPoint[];
}

/**
 * Extracts numeric observation trend series over time (e.g. HbA1c, Systolic BP).
 */
export function extractObservationTrends(groups: TimelineDateGroup[]): TrendSeries[] {
  const seriesMap = new Map<string, TrendPoint[]>();
  const metaMap = new Map<string, { name: string; unit: string }>();

  // Gather all observations across all groups
  for (const group of groups) {
    for (const event of group.events) {
      if (event.type === 'lab' && typeof event.numericValue === 'number' && group.date !== 'Undated') {
        const obs = event.resource as FhirObservation;
        const testCode = obs.code?.coding?.[0]?.code || event.title;
        const testName = event.title;
        const unit = event.unit || '';

        if (!seriesMap.has(testCode)) {
          seriesMap.set(testCode, []);
          metaMap.set(testCode, { name: testName, unit });
        }

        seriesMap.get(testCode)!.push({
          date: group.date,
          displayDate: group.displayDate,
          value: event.numericValue,
          unit,
        });
      }
    }
  }

  const result: TrendSeries[] = [];

  for (const [code, points] of seriesMap.entries()) {
    // Only return series with at least 2 points to display trends
    if (points.length >= 2) {
      // Sort points chronologically ascending for the chart
      points.sort((a, b) => a.date.localeCompare(b.date));
      const meta = metaMap.get(code)!;
      result.push({
        code,
        name: meta.name,
        unit: meta.unit,
        points,
      });
    }
  }

  return result;
}
