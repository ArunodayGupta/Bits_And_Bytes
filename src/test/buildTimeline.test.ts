import { describe, it, expect } from 'vitest';
import { buildTimeline, extractLocalDateString, formatDisplayDate } from '../lib/fhir/buildTimeline';
import type { FhirBundle } from '../lib/fhir/types';

describe('buildTimeline pure functions', () => {
  it('extractLocalDateString handles ISO timestamps, dates, and invalid strings safely', () => {
    expect(extractLocalDateString('2024-10-14T09:30:00+05:30')).toBe('2024-10-14');
    expect(extractLocalDateString('2024-10-14')).toBe('2024-10-14');
    expect(extractLocalDateString(undefined)).toBe('Undated');
    expect(extractLocalDateString('invalid-date')).toBe('Undated');
  });

  it('formatDisplayDate formats valid dates into readable strings', () => {
    expect(formatDisplayDate('2024-10-14')).toBe('14 Oct 2024');
    expect(formatDisplayDate('Undated')).toBe('Undated Records');
  });

  it('merges same-day events into a single parent node and sorts descending by date', () => {
    const mockBundle: FhirBundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [
        {
          resource: {
            resourceType: 'Encounter',
            id: 'enc-2021',
            period: { start: '2021-03-15T09:00:00Z' },
            serviceProvider: { display: 'Apollo Chennai' },
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-2024-1',
            effectiveDateTime: '2024-10-14T08:00:00Z',
            code: {
              coding: [{ system: 'http://loinc.org', code: '4548-4', display: 'HbA1c' }],
            },
            valueQuantity: { value: 6.9, unit: '%' },
          },
        },
        {
          resource: {
            resourceType: 'MedicationRequest',
            id: 'med-2024-2',
            authoredOn: '2024-10-14T10:00:00Z',
            medicationCodeableConcept: {
              coding: [{ display: 'Metformin 500mg' }],
            },
            dosageInstruction: [{ text: '1 tablet twice daily' }],
          },
        },
        {
          resource: {
            resourceType: 'Condition',
            id: 'cond-undated',
            code: { text: 'Chronic Condition' },
          },
        },
      ],
    };

    const timeline = buildTimeline(mockBundle);

    // Should have 3 date groups: 2024-10-14, 2021-03-15, and Undated
    expect(timeline.length).toBe(3);

    // Sort order: 2024-10-14 first, then 2021-03-15, then Undated
    expect(timeline[0].date).toBe('2024-10-14');
    expect(timeline[1].date).toBe('2021-03-15');
    expect(timeline[2].date).toBe('Undated');

    // Same-day merge: 2024-10-14 contains 2 events (Observation and MedicationRequest)
    expect(timeline[0].events.length).toBe(2);
    expect(timeline[0].events.some((e) => e.type === 'lab')).toBe(true);
    expect(timeline[0].events.some((e) => e.type === 'medication')).toBe(true);

    // Undated group at the end
    expect(timeline[2].events[0].title).toBe('Chronic Condition');
  });

  it('handles missing/sparse fields without throwing errors', () => {
    const sparseBundle: FhirBundle = {
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Encounter',
            id: 'enc-sparse',
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-sparse',
          },
        },
        {
          resource: {
            resourceType: 'Condition',
            id: 'cond-sparse',
          },
        },
        {
          resource: {
            resourceType: 'MedicationRequest',
            id: 'med-sparse',
          },
        },
      ],
    };

    const timeline = buildTimeline(sparseBundle);
    expect(timeline.length).toBe(1);
    expect(timeline[0].date).toBe('Undated');
    expect(timeline[0].events.length).toBe(4);
  });
});
