import { describe, it, expect } from 'vitest';
import { parseFhirBundle, formatObservationSummaryValue } from '../../src/lib/fhir/parse';
import type { FhirObservation } from '../../src/lib/fhir/types';

describe('FHIR Bundle Parsing and Mapping (parse.ts)', () => {
  const minimalPatient = {
    resourceType: 'Patient',
    id: 'pat-1',
    name: [{ text: 'Ramesh Kumar', given: ['Ramesh'], family: 'Kumar' }],
    gender: 'male',
    birthDate: '1970-03-12',
    identifier: [
      {
        system: 'https://healthid.ndhm.gov.in',
        value: '91-1234-5678-9012',
      },
    ],
  };

  it('successfully parses a minimal bundle with all supported resource types', () => {
    const bundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [
        {
          fullUrl: 'urn:uuid:pat-1',
          resource: minimalPatient,
        },
        {
          fullUrl: 'urn:uuid:enc-1',
          resource: {
            resourceType: 'Encounter',
            id: 'enc-1',
            status: 'finished',
            period: { start: '2024-10-14T09:30:00Z' },
            serviceProvider: { display: 'Apollo Hospital' },
            class: { display: 'Ambulatory' },
          },
        },
        {
          fullUrl: 'urn:uuid:cond-1',
          resource: {
            resourceType: 'Condition',
            id: 'cond-1',
            recordedDate: '2024-10-14T09:35:00Z',
            code: {
              coding: [{ code: '44054006', display: 'Type 2 diabetes mellitus' }],
            },
            clinicalStatus: {
              coding: [{ code: 'active' }],
            },
            encounter: { reference: 'urn:uuid:enc-1' },
          },
        },
        {
          fullUrl: 'urn:uuid:obs-1',
          resource: {
            resourceType: 'Observation',
            id: 'obs-1',
            status: 'final',
            effectiveDateTime: '2024-10-14T09:40:00Z',
            code: { coding: [{ code: '4548-4', display: 'HbA1c' }] },
            valueQuantity: { value: 7.5, unit: '%' },
            encounter: { reference: 'urn:uuid:enc-1' },
          },
        },
        {
          fullUrl: 'urn:uuid:med-1',
          resource: {
            resourceType: 'MedicationRequest',
            id: 'med-1',
            status: 'active',
            authoredOn: '2024-10-14T10:00:00Z',
            medicationCodeableConcept: {
              coding: [{ display: 'Metformin 500mg' }],
              text: 'Metformin 500mg',
            },
            dosageInstruction: [{ text: 'Twice daily after meals' }],
            encounter: { reference: 'urn:uuid:enc-1', display: 'Apollo Hospital' },
            requester: { display: 'Dr. Rajesh Rao' },
          },
        },
      ],
    };

    const parsed = parseFhirBundle(bundle);

    // Patient verification
    expect(parsed.patient.abha_id).toBe('91-1234-5678-9012');
    expect(parsed.patient.name).toBe('Ramesh Kumar');
    expect(parsed.patient.dob).toBe('1970-03-12');

    // Counts
    expect(parsed.counts.Patient).toBe(1);
    expect(parsed.counts.Encounter).toBe(1);
    expect(parsed.counts.Condition).toBe(1);
    expect(parsed.counts.Observation).toBe(1);
    expect(parsed.counts.MedicationRequest).toBe(1);

    // Reference resolution
    const obsRow = parsed.resources.find((r) => r.resource_type === 'Observation');
    expect(obsRow?.encounter_fhir_id).toBe('enc-1');
    expect(obsRow?.summary_value).toBe('7.5 %');

    const medRow = parsed.resources.find((r) => r.resource_type === 'MedicationRequest');
    expect(medRow?.encounter_fhir_id).toBe('enc-1');
    expect(medRow?.speakable_rx_id).toBe('APL-RR-1410-RAME');

    // Prescriptions row created
    expect(parsed.prescriptions.length).toBe(1);
    expect(parsed.prescriptions[0].rx_id).toBe('APL-RR-1410-RAME');
    expect(parsed.prescriptions[0].encounter_fhir_id).toBe('enc-1');
  });

  describe('Blood Pressure panel formatting', () => {
    it('combines systolic 8480-6 and diastolic 8462-4 into 148/92 mmHg', () => {
      const obs: FhirObservation = {
        resourceType: 'Observation',
        id: 'obs-bp',
        status: 'final',
        code: {
          coding: [{ code: '85354-9', display: 'Blood pressure panel' }],
        },
        component: [
          {
            code: { coding: [{ code: '8480-6', display: 'Systolic blood pressure' }] },
            valueQuantity: { value: 148, unit: 'mmHg' },
          },
          {
            code: { coding: [{ code: '8462-4', display: 'Diastolic blood pressure' }] },
            valueQuantity: { value: 92, unit: 'mmHg' },
          },
        ],
      };

      const formatted = formatObservationSummaryValue(obs);
      expect(formatted).toBe('148/92 mmHg');
    });
  });

  describe('Defensive parsing on missing or optional fields', () => {
    it('handles resources missing dates, codes, or text without crashing', () => {
      const bareBundle = {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              identifier: [{ value: '91-1234-5678-9012' }],
            },
          },
          {
            resource: {
              resourceType: 'Encounter',
              id: 'enc-bare',
            },
          },
          {
            resource: {
              resourceType: 'Condition',
              id: 'cond-bare',
            },
          },
          {
            resource: {
              resourceType: 'Observation',
              id: 'obs-bare',
            },
          },
          {
            resource: {
              resourceType: 'MedicationRequest',
              id: 'med-bare',
            },
          },
        ],
      };

      const result = parseFhirBundle(bareBundle);
      expect(result.patient.abha_id).toBe('91-1234-5678-9012');
      expect(result.resources.length).toBe(4);
      expect(result.resources.find((r) => r.resource_type === 'Encounter')?.summary_title).toBe('Consultation');
      expect(result.resources.find((r) => r.resource_type === 'Condition')?.summary_title).toBe('Health Condition');
      expect(result.resources.find((r) => r.resource_type === 'Observation')?.summary_value).toBe('Recorded');
    });

    it('records unsupported resources in skipped array without throwing', () => {
      const bundleWithComposition = {
        resourceType: 'Bundle',
        type: 'document',
        entry: [
          {
            resource: minimalPatient,
          },
          {
            resource: {
              resourceType: 'Composition',
              id: 'comp-1',
              title: 'OP Consultation Note',
            },
          },
          {
            resource: {
              resourceType: 'Organization',
              id: 'org-1',
              name: 'Apollo Hospital',
            },
          },
        ],
      };

      const result = parseFhirBundle(bundleWithComposition);
      expect(result.skipped).toEqual(
        expect.arrayContaining([
          { resourceType: 'Composition', count: 1 },
          { resourceType: 'Organization', count: 1 },
        ])
      );
    });

    it('throws if no Patient or multiple Patients are in the bundle', () => {
      expect(() =>
        parseFhirBundle({
          resourceType: 'Bundle',
          entry: [],
        })
      ).toThrow(/Exactly one Patient resource is required/);

      expect(() =>
        parseFhirBundle({
          resourceType: 'Bundle',
          entry: [
            { resource: minimalPatient },
            { resource: { ...minimalPatient, id: 'pat-2' } },
          ],
        })
      ).toThrow(/found 2/);
    });
  });
});
