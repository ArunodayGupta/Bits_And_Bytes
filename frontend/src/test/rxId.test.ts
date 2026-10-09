import { describe, it, expect } from 'vitest';
import {
  abbreviateHospital,
  extractDoctorInitials,
  formatDayMonth,
  extractPatientNameCode,
  generateSpeakableRxId,
  formatSpokenRxId,
  createCollisionRegistry,
  registerAndGetUniqueRxId,
  injectRxIdsIntoBundle,
  allocateRxId,
  RX_TOKEN_SYSTEM,
} from '../lib/rxId';
import type { FhirBundle } from '../lib/fhir/types';

describe('Speakable Rx-ID generation and collision handling', () => {
  describe('abbreviateHospital', () => {
    it('strips common hospital terms and uses consonant-preferring rule', () => {
      // "Apollo Hospitals Chennai" -> "Apollo" -> A + P + L -> "APL"
      expect(abbreviateHospital('Apollo Hospitals Chennai')).toBe('APL');
      // "MedCare Family Clinic" -> "MedCare" -> M + D + C -> "MDC"
      expect(abbreviateHospital('MedCare Family Clinic')).toBe('MDC');
      // "Fortis Healthcare" -> "Fortis" -> F + R + T -> "FRT"
      expect(abbreviateHospital('Fortis Healthcare')).toBe('FRT');
      // "AIIMS Medical Center" -> "AIIMS" -> A + M + S -> "AMS"
      expect(abbreviateHospital('AIIMS Medical Center')).toBe('AMS');
    });

    it('falls back safely on empty or unusual names', () => {
      expect(abbreviateHospital('')).toBe('GEN');
      expect(abbreviateHospital('Hospital')).toBe('HSP');
    });
  });

  describe('extractDoctorInitials', () => {
    it('strips titles like Dr., Prof. and extracts initials', () => {
      expect(extractDoctorInitials('Dr. Rajesh Rao')).toBe('RR');
      expect(extractDoctorInitials('Doctor Sunita Sharma')).toBe('SS');
      expect(extractDoctorInitials('Prof. Amit Kumar Sen')).toBe('AKS');
    });

    it('handles single name with fallback', () => {
      expect(extractDoctorInitials('Rao')).toBe('RA');
    });
  });

  describe('formatDayMonth & extractPatientNameCode', () => {
    it('formats day and month as zero padded DDMM', () => {
      expect(formatDayMonth('2024-10-14T09:45:00Z')).toBe('1410');
      expect(formatDayMonth('2024-05-02T09:45:00Z')).toBe('0205');
    });

    it('extracts first 4 letters of patient name in uppercase', () => {
      expect(extractPatientNameCode('Ramesh Kumar')).toBe('RAME');
      expect(extractPatientNameCode('Ali')).toBe('ALIX');
    });
  });

  describe('generateSpeakableRxId', () => {
    it('deterministically generates expected HOS-DD-DDMM-PATI format', () => {
      const rxId1 = generateSpeakableRxId({
        hospital: 'Apollo Hospitals Chennai',
        doctor: 'Dr. Rajesh Rao',
        date: '2024-10-14T09:45:00+05:30',
        patient: 'Ramesh Kumar',
      });

      const rxId2 = generateSpeakableRxId({
        hospital: 'Apollo Hospitals Chennai',
        doctor: 'Dr. Rajesh Rao',
        date: '2024-10-14T09:45:00+05:30',
        patient: 'Ramesh Kumar',
      });

      expect(rxId1).toBe('APL-RR-1410-RAME');
      expect(rxId1).toBe(rxId2);
      expect(rxId1.length).toBe(16);
    });
  });

  describe('formatSpokenRxId', () => {
    it('generates clear phonetic spoken phrase', () => {
      const spoken = formatSpokenRxId('APL-RR-1410-RAME');
      expect(spoken).toBe('A P L, R R, one four one zero, R A M E');
    });
  });

  describe('Collision handling & in-memory injection', () => {
    it('appends unique suffix on collision for different medication requests', () => {
      const registry = createCollisionRegistry();
      const baseId = 'APL-RR-1410-RAME';

      const id1 = registerAndGetUniqueRxId(baseId, 'med-1', registry);
      const id2 = registerAndGetUniqueRxId(baseId, 'med-2', registry);
      const id3 = registerAndGetUniqueRxId(baseId, 'med-3', registry);

      expect(id1).toBe('APL-RR-1410-RAME');
      expect(id2).toBe('APL-RR-1410-RAMEA');
      expect(id3).toBe('APL-RR-1410-RAMEB');

      // Calling again for med-1 returns the same ID without duplicating
      expect(registerAndGetUniqueRxId(baseId, 'med-1', registry)).toBe('APL-RR-1410-RAME');
    });

    it('injectRxIdsIntoBundle clones bundle and injects identifier without mutating original', () => {
      const originalBundle: FhirBundle = {
        resourceType: 'Bundle',
        entry: [
          {
            resource: {
              resourceType: 'MedicationRequest',
              id: 'med-original',
              authoredOn: '2024-10-14T10:00:00Z',
              medicationCodeableConcept: { text: 'Metformin' },
              identifier: [{ system: 'urn:internal', value: 'internal-123' }],
            },
          },
        ],
      };

      const { bundle: injectedBundle } = injectRxIdsIntoBundle(originalBundle);

      // Original must NOT be mutated
      const originalMed = originalBundle.entry![0].resource as any;
      expect(originalMed.identifier.length).toBe(1);

      // Injected bundle must have both identifiers preserved
      const injectedMed = injectedBundle.entry![0].resource as any;
      expect(injectedMed.identifier.length).toBe(2);
      expect(
        injectedMed.identifier.some(
          (id: any) => id.system === RX_TOKEN_SYSTEM || id.system === 'https://phr-demo.example.org/rx-token'
        )
      ).toBe(true);
    });

    it('allocateRxId reuses ID for same encounter and appends suffix for different encounters', () => {
      const registry = new Map<string, string>();
      const candidate = 'APL-RR-1410-RAME';

      // First request from encounter-1
      const id1 = allocateRxId(candidate, registry, 'encounter-1');
      expect(id1).toBe('APL-RR-1410-RAME');

      // Second medication request from SAME encounter-1 -> shares the ID!
      const id2 = allocateRxId(candidate, registry, 'encounter-1');
      expect(id2).toBe('APL-RR-1410-RAME');

      // Request with identical candidate from a DIFFERENT encounter-2 -> collision suffix!
      const id3 = allocateRxId(candidate, registry, 'encounter-2');
      expect(id3).toBe('APL-RR-1410-RAMEA');

      // Another medication from encounter-2 -> reuses the suffixed ID
      const id4 = allocateRxId(candidate, registry, 'encounter-2');
      expect(id4).toBe('APL-RR-1410-RAMEA');

      // Yet another encounter-3 -> appends suffix B
      const id5 = allocateRxId(candidate, registry, 'encounter-3');
      expect(id5).toBe('APL-RR-1410-RAMEB');
    });

    it('guarantees timezone-safe date extraction near midnight UTC without shifting day', () => {
      // 23:59:59 UTC on 14th should NOT shift to 15th (or 13th)
      expect(formatDayMonth('2024-10-14T23:59:59Z')).toBe('1410');
      // 00:00:01 UTC on 14th should be 14th
      expect(formatDayMonth('2024-10-14T00:00:01Z')).toBe('1410');
      // Date only
      expect(formatDayMonth('2024-10-14')).toBe('1410');
    });
  });
});
