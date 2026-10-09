import { describe, it, expect } from 'vitest';
import { evaluateCareGaps, type ClinicalResourceInput } from '../../src/lib/db/careGaps';

describe('Clinical Care Gap Rule Engine (careGaps.ts)', () => {
  const diabetesCondition: ClinicalResourceInput = {
    resource_type: 'Condition',
    fhir_id: 'cond-t2dm',
    event_date: '2024-01-01T00:00:00Z',
    summary_title: 'Type 2 diabetes mellitus',
    summary_value: 'active',
    raw_json: {
      code: {
        coding: [{ code: '44054006', display: 'Type 2 diabetes mellitus' }],
      },
    },
  };

  it('triggers HBA1C_OVERDUE gap when most recent HbA1c is 187 days old', () => {
    // Consultation date: 2024-10-14
    // HbA1c date: 2024-04-10 (187 days prior)
    const hba1cObservation: ClinicalResourceInput = {
      resource_type: 'Observation',
      fhir_id: 'obs-hba1c',
      event_date: '2024-04-10T08:00:00Z',
      summary_title: 'HbA1c',
      summary_value: '8.1 %',
      raw_json: {
        code: {
          coding: [{ code: '4548-4', display: 'Hemoglobin A1c' }],
        },
      },
    };

    const resources: ClinicalResourceInput[] = [
      diabetesCondition,
      hba1cObservation,
      {
        resource_type: 'Encounter',
        fhir_id: 'enc-1',
        event_date: '2024-10-14T10:00:00Z',
        summary_title: 'Consultation',
        summary_value: 'Apollo Hospital',
        raw_json: {},
      },
    ];

    const asOf = '2024-10-14T10:00:00Z';
    const gaps = evaluateCareGaps(resources, asOf);

    expect(gaps.length).toBe(1);
    expect(gaps[0].code).toBe('HBA1C_OVERDUE');
    expect(gaps[0].severity).toBe('high');
    expect(gaps[0].daysSince).toBe(187);
    expect(gaps[0].lastValue).toBe('8.1 %');
    expect(gaps[0].message).toContain('187 days ago');
  });

  it('triggers NO care gap when HbA1c was performed within 90 days', () => {
    const recentHba1c: ClinicalResourceInput = {
      resource_type: 'Observation',
      fhir_id: 'obs-hba1c-recent',
      event_date: '2024-08-01T08:00:00Z', // 74 days prior to 2024-10-14
      summary_title: 'HbA1c',
      summary_value: '6.8 %',
      raw_json: {
        code: {
          coding: [{ code: '4548-4', display: 'Hemoglobin A1c' }],
        },
      },
    };

    const resources: ClinicalResourceInput[] = [diabetesCondition, recentHba1c];
    const asOf = '2024-10-14T10:00:00Z';
    const gaps = evaluateCareGaps(resources, asOf);

    expect(gaps.length).toBe(0);
  });

  it('triggers HBA1C_OVERDUE gap when diabetic patient has NO HbA1c tests recorded', () => {
    const resources: ClinicalResourceInput[] = [
      diabetesCondition,
      {
        resource_type: 'Encounter',
        fhir_id: 'enc-1',
        event_date: '2024-10-14T10:00:00Z',
        summary_title: 'Consultation',
        summary_value: 'Apollo Hospital',
        raw_json: {},
      },
    ];

    const gaps = evaluateCareGaps(resources, '2024-10-14T10:00:00Z');

    expect(gaps.length).toBe(1);
    expect(gaps[0].code).toBe('HBA1C_OVERDUE');
    expect(gaps[0].daysSince).toBeNull();
    expect(gaps[0].message).toContain('no HbA1c monitoring test is on record');
  });

  it('triggers NO care gap when patient does NOT have diabetes condition', () => {
    const nonDiabeticCondition: ClinicalResourceInput = {
      resource_type: 'Condition',
      fhir_id: 'cond-htn',
      event_date: '2024-01-01T00:00:00Z',
      summary_title: 'Essential hypertension',
      summary_value: 'active',
      raw_json: {
        code: {
          coding: [{ code: '59621000', display: 'Essential hypertension' }],
        },
      },
    };

    const resources: ClinicalResourceInput[] = [nonDiabeticCondition];
    const gaps = evaluateCareGaps(resources, '2024-10-14T10:00:00Z');

    expect(gaps.length).toBe(0);
  });

  it('defaults asOf to the patient latest event_date when not provided', () => {
    // If asOf is omitted, evaluateCareGaps uses the latest event date among resources (2024-10-14)
    // rather than the current system time, keeping the 2024 demo fixture stable.
    const hba1cObservation: ClinicalResourceInput = {
      resource_type: 'Observation',
      fhir_id: 'obs-hba1c',
      event_date: '2024-04-10T08:00:00Z',
      summary_title: 'HbA1c',
      summary_value: '8.1 %',
      raw_json: {
        code: {
          coding: [{ code: '4548-4', display: 'Hemoglobin A1c' }],
        },
      },
    };

    const latestEncounter: ClinicalResourceInput = {
      resource_type: 'Encounter',
      fhir_id: 'enc-latest',
      event_date: '2024-10-14T10:00:00Z',
      summary_title: 'Consultation',
      summary_value: 'Apollo Hospital',
      raw_json: {},
    };

    const resources: ClinicalResourceInput[] = [
      diabetesCondition,
      hba1cObservation,
      latestEncounter,
    ];

    const gaps = evaluateCareGaps(resources); // asOf omitted
    expect(gaps.length).toBe(1);
    expect(gaps[0].daysSince).toBe(187);
  });
});
