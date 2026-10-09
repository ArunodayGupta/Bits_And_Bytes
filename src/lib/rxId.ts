import type { FhirBundle, FhirMedicationRequest, FhirPatient, FhirPractitioner, FhirOrganization, FhirEncounter } from './fhir/types';

const nodeProcess = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;

export const RX_TOKEN_SYSTEM: string =
  nodeProcess?.env?.RX_TOKEN_SYSTEM ||
  'https://phr-demo.example.org/rx-token';

export interface RxIdInputs {
  hospital?: string;
  doctor?: string;
  date?: string;
  patient?: string;
}

const COMMON_HOSPITAL_WORDS = new Set([
  'hospital',
  'hospitals',
  'clinic',
  'clinics',
  'centre',
  'center',
  'centres',
  'centers',
  'medical',
  'healthcare',
  'diagnostics',
  'diagnostic',
  'pvt',
  'ltd',
  'health',
  'institute',
  'institutes',
  'care',
]);

const TITLE_WORDS = new Set([
  'dr',
  'dr.',
  'doctor',
  'prof',
  'prof.',
  'professor',
  'mr',
  'mr.',
  'mrs',
  'mrs.',
  'ms',
  'ms.',
]);

const DIGIT_WORDS: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
};

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

/**
 * Abbreviate hospital name into 3 letters, preferring the first letter plus the next two consonants.
 * e.g. "Apollo" -> 'A' + 'P' + 'L' = "APL"
 */
export function abbreviateHospital(hospitalName?: string): string {
  if (!hospitalName || !hospitalName.trim()) {
    return 'GEN';
  }

  // Tokenize and clean words
  const rawWords = hospitalName.trim().split(/[\s,.-]+/);
  const filteredWords = rawWords.filter(
    (w) => w.length > 0 && !COMMON_HOSPITAL_WORDS.has(w.toLowerCase())
  );

  const targetWord = (filteredWords.length > 0 ? filteredWords[0] : rawWords[0])
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

  if (targetWord.length === 0) {
    return 'GEN';
  }

  const firstChar = targetWord[0];
  const restChars = targetWord.slice(1);

  // Find consonants in the rest of the word
  const consonants: string[] = [];
  const otherLetters: string[] = [];

  for (const ch of restChars) {
    if (!VOWELS.has(ch)) {
      consonants.push(ch);
    } else {
      otherLetters.push(ch);
    }
  }

  const picked: string[] = [firstChar];

  // Pick up to two consonants
  for (const c of consonants) {
    if (picked.length < 3) {
      picked.push(c);
    }
  }

  // If still under 3, fill with remaining vowels / letters
  for (const ch of otherLetters) {
    if (picked.length < 3) {
      picked.push(ch);
    }
  }

  // If still under 3, pad with 'X'
  while (picked.length < 3) {
    picked.push('X');
  }

  return picked.slice(0, 3).join('');
}

/**
 * Extract doctor initials (max 3, min 2), stripping titles like Dr./Prof.
 */
export function extractDoctorInitials(doctorName?: string): string {
  if (!doctorName || !doctorName.trim()) {
    return 'MD';
  }

  const words = doctorName.trim().split(/[\s,.-]+/);
  const cleanWords = words.filter(
    (w) => w.length > 0 && !TITLE_WORDS.has(w.toLowerCase())
  );

  if (cleanWords.length === 0) {
    return 'MD';
  }

  const initials = cleanWords
    .map((w) => w[0].toUpperCase())
    .filter((ch) => /[A-Z0-9]/.test(ch));

  if (initials.length >= 2) {
    return initials.slice(0, 3).join('');
  }

  if (initials.length === 1) {
    // If only one name like "Rao", take first 2 letters
    const single = cleanWords[0].toUpperCase().replace(/[^A-Z]/g, '');
    return single.length >= 2 ? single.slice(0, 2) : `${single}X`;
  }

  return 'MD';
}

/**
 * Format day and month as DDMM zero-padded.
 * Uses string-based parsing on the first 10 characters to guarantee timezone safety.
 */
export function formatDayMonth(dateString?: string): string {
  if (!dateString || typeof dateString !== 'string') return '0101';
  const match = dateString.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const month = match[2];
    const day = match[3];
    return `${day}${month}`;
  }
  return '0101';
}

/**
 * Extract first 4 letters of patient's given name, padded with 'X' if shorter.
 */
export function extractPatientNameCode(patientName?: string): string {
  if (!patientName || !patientName.trim()) {
    return 'PATI';
  }

  // Remove titles if any
  const words = patientName.trim().split(/[\s,.-]+/);
  const cleanWords = words.filter(
    (w) => w.length > 0 && !TITLE_WORDS.has(w.toLowerCase())
  );

  const target = (cleanWords[0] || 'PATI').toUpperCase().replace(/[^A-Z]/g, '');
  if (target.length >= 4) {
    return target.slice(0, 4);
  }

  return target.padEnd(4, 'X');
}

/**
 * Deterministically generates a speakable prescription ID (Rx-ID).
 * Format: HOS-DD-DDMM-PATI (e.g. APL-RR-1410-RAME)
 * Supports both positional arguments: (hospital, doctor, date, patient)
 * and object argument: ({ hospital, doctor, date, patient })
 */
export function generateSpeakableRxId(
  hospitalOrInputs?: string | RxIdInputs,
  doctorName?: string,
  date?: string,
  patientName?: string
): string {
  let hospital = '';
  let doc = '';
  let dStr = '';
  let patient = '';

  if (hospitalOrInputs && typeof hospitalOrInputs === 'object') {
    hospital = hospitalOrInputs.hospital || '';
    doc = hospitalOrInputs.doctor || '';
    dStr = hospitalOrInputs.date || '';
    patient = hospitalOrInputs.patient || '';
  } else {
    hospital = typeof hospitalOrInputs === 'string' ? hospitalOrInputs : '';
    doc = doctorName || '';
    dStr = date || '';
    patient = patientName || '';
  }

  const hos = abbreviateHospital(hospital);
  const dd = extractDoctorInitials(doc);
  const ddmm = formatDayMonth(dStr);
  const pati = extractPatientNameCode(patient);

  return `${hos}-${dd}-${ddmm}-${pati}`;
}

/**
 * Renders the Rx-ID into a spoken phonetic string for patients to read aloud.
 * e.g. "A P L, R R, one four one zero, R A M E"
 */
export function formatSpokenRxId(rxId: string): string {
  const parts = rxId.split('-');
  return parts
    .map((part) => {
      return part
        .split('')
        .map((ch) => {
          if (DIGIT_WORDS[ch]) {
            return DIGIT_WORDS[ch];
          }
          return ch.toUpperCase();
        })
        .join(' ');
    })
    .join(', ');
}

export interface CollisionRegistry {
  generatedIds: Set<string>;
  idToMedicationRequestId: Map<string, string>;
  medicationRequestIdToId: Map<string, string>;
}

export function createCollisionRegistry(): CollisionRegistry {
  return {
    generatedIds: new Set<string>(),
    idToMedicationRequestId: new Map<string, string>(),
    medicationRequestIdToId: new Map<string, string>(),
  };
}

/**
 * Allocates or resolves an Rx-ID with encounter-level reuse and collision resolution.
 * - If the candidate belongs to the SAME encounter/prescription, reuse it without suffix.
 * - If the candidate belongs to a DIFFERENT encounter/prescription, append suffix (A, B, ...)
 */
export function allocateRxId(
  candidate: string,
  existingRegistry: Map<string, string> | CollisionRegistry | Record<string, string>,
  encounterId?: string
): string {
  // Support both Map<rxId, encounterId> and CollisionRegistry
  if ('idToMedicationRequestId' in existingRegistry) {
    const reg = existingRegistry as CollisionRegistry;
    return registerAndGetUniqueRxId(candidate, encounterId || 'default', reg);
  }

  const map = existingRegistry as Map<string, string>;

  // Check if candidate already registered
  if (!map.has(candidate)) {
    if (encounterId) {
      map.set(candidate, encounterId);
    }
    return candidate;
  }

  // Already exists: check if same encounter
  const registeredEncounter = map.get(candidate);
  if (encounterId && registeredEncounter === encounterId) {
    return candidate; // Shared across the same encounter!
  }

  // Collision with a different encounter -> append suffix A, B, ...
  let suffixCode = 65; // 'A'
  while (suffixCode <= 90) {
    const suffixed = `${candidate}${String.fromCharCode(suffixCode)}`;
    if (!map.has(suffixed)) {
      if (encounterId) {
        map.set(suffixed, encounterId);
      }
      return suffixed;
    }
    if (encounterId && map.get(suffixed) === encounterId) {
      return suffixed;
    }
    suffixCode++;
  }

  return `${candidate}Z`;
}

/**
 * Legacy deterministic collision-safe generator for a bundle using MedicationRequestId.
 */
export function registerAndGetUniqueRxId(
  baseId: string,
  medicationRequestId: string,
  registry: CollisionRegistry
): string {
  if (registry.medicationRequestIdToId.has(medicationRequestId)) {
    return registry.medicationRequestIdToId.get(medicationRequestId)!;
  }

  let finalId = baseId;
  let suffixCode = 65; // 'A'

  while (
    registry.generatedIds.has(finalId) &&
    registry.idToMedicationRequestId.get(finalId) !== medicationRequestId
  ) {
    finalId = `${baseId}${String.fromCharCode(suffixCode)}`;
    suffixCode++;
    if (suffixCode > 90) break; // Z limit
  }

  registry.generatedIds.add(finalId);
  registry.idToMedicationRequestId.set(finalId, medicationRequestId);
  registry.medicationRequestIdToId.set(medicationRequestId, finalId);

  return finalId;
}

/**
 * Injects speakable Rx-IDs into all MedicationRequests in a bundle in memory.
 * Never mutates original fetched object; deeply clones first.
 */
export function injectRxIdsIntoBundle(bundle: FhirBundle): {
  bundle: FhirBundle;
  registry: CollisionRegistry;
} {
  const clonedBundle = JSON.parse(JSON.stringify(bundle)) as FhirBundle;
  const registry = createCollisionRegistry();

  if (!clonedBundle.entry) {
    return { bundle: clonedBundle, registry };
  }

  let patientName = 'Ramesh';
  const practitionerMap = new Map<string, string>();
  const orgMap = new Map<string, string>();
  const encounterMap = new Map<string, FhirEncounter>();

  for (const entry of clonedBundle.entry) {
    const res = entry.resource;
    if (res.resourceType === 'Patient') {
      const p = res as FhirPatient;
      patientName = p.name?.[0]?.given?.[0] || p.name?.[0]?.text || 'Ramesh';
    } else if (res.resourceType === 'Practitioner') {
      const doc = res as FhirPractitioner;
      const docName = doc.name?.[0]?.text || doc.name?.[0]?.family || 'Dr';
      practitionerMap.set(doc.id, docName);
      practitionerMap.set(`urn:uuid:${doc.id}`, docName);
      practitionerMap.set(`Practitioner/${doc.id}`, docName);
    } else if (res.resourceType === 'Organization') {
      const org = res as FhirOrganization;
      if (org.name) {
        orgMap.set(org.id, org.name);
        orgMap.set(`urn:uuid:${org.id}`, org.name);
        orgMap.set(`Organization/${org.id}`, org.name);
      }
    } else if (res.resourceType === 'Encounter') {
      const enc = res as FhirEncounter;
      encounterMap.set(enc.id, enc);
      encounterMap.set(`urn:uuid:${enc.id}`, enc);
      encounterMap.set(`Encounter/${enc.id}`, enc);
    }
  }

  for (const entry of clonedBundle.entry) {
    if (entry.resource.resourceType === 'MedicationRequest') {
      const med = entry.resource as FhirMedicationRequest;

      let doctorName = med.requester?.display;
      if (!doctorName && med.requester?.reference) {
        doctorName = practitionerMap.get(med.requester.reference);
      }

      let hospitalName = 'Apollo Hospital';
      if (med.encounter?.display) {
        hospitalName = med.encounter.display;
      } else if (med.encounter?.reference) {
        const enc = encounterMap.get(med.encounter.reference);
        if (enc?.serviceProvider?.display) {
          hospitalName = enc.serviceProvider.display;
        } else if (enc?.serviceProvider?.reference) {
          hospitalName = orgMap.get(enc.serviceProvider.reference) || hospitalName;
        }
      }

      const dateStr = med.authoredOn || new Date().toISOString();

      const baseRxId = generateSpeakableRxId(
        hospitalName,
        doctorName,
        dateStr,
        patientName
      );

      const uniqueRxId = registerAndGetUniqueRxId(baseRxId, med.id, registry);

      const existingIdentifiers = med.identifier || [];
      const hasRxToken = existingIdentifiers.some(
        (id) => id.system === RX_TOKEN_SYSTEM || id.system === 'https://abdm.gov.in/rx-token'
      );

      if (!hasRxToken) {
        med.identifier = [
          ...existingIdentifiers,
          {
            system: RX_TOKEN_SYSTEM,
            value: uniqueRxId,
          },
        ];
      }

      // groupIdentifier for FHIR R4 requests belonging to the same prescription
      if (!med.groupIdentifier) {
        med.groupIdentifier = {
          system: RX_TOKEN_SYSTEM,
          value: uniqueRxId,
        };
      }
    }
  }

  return { bundle: clonedBundle, registry };
}
