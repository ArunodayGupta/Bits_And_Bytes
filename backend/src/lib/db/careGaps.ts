import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export interface CareGap {
  code: string;
  severity: 'low' | 'moderate' | 'high';
  daysSince: number | null;
  lastValue: string | null;
  lastDate: string | null;
  message: string;
}

export interface ClinicalResourceInput {
  resource_type: string;
  fhir_id: string;
  event_date: string | null;
  summary_title: string;
  summary_value: string | null;
  raw_json: unknown;
}

/**
 * Pure, table-driven care-gap rule engine.
 * Rule: If patient has Condition coded SNOMED 44054006 (Type 2 diabetes mellitus)
 * and the most recent HbA1c Observation (LOINC 4548-4) is > 180 days before `asOf` (or none),
 * flags an HBA1C_OVERDUE gap.
 */
export function evaluateCareGaps(
  resources: ClinicalResourceInput[],
  asOf?: Date | string
): CareGap[] {
  const gaps: CareGap[] = [];

  // Determine effective asOf date: defaults to latest event_date in patient data
  let effectiveAsOfDate: Date;
  if (asOf) {
    effectiveAsOfDate = typeof asOf === 'string' ? new Date(asOf) : asOf;
  } else {
    let latestTimestamp = 0;
    for (const r of resources) {
      if (r.event_date) {
        const t = new Date(r.event_date).getTime();
        if (!isNaN(t) && t > latestTimestamp) {
          latestTimestamp = t;
        }
      }
    }
    effectiveAsOfDate = latestTimestamp > 0 ? new Date(latestTimestamp) : new Date();
  }

  // 1. Check Condition: Type 2 Diabetes Mellitus (SNOMED 44054006)
  const hasDiabetes = resources.some((r) => {
    if (r.resource_type !== 'Condition') return false;
    const raw = r.raw_json as Record<string, unknown> | undefined;
    const codeObj = raw?.code as Record<string, unknown> | undefined;
    const codings = (codeObj?.coding as Array<Record<string, unknown>>) || [];
    return codings.some(
      (c) => String(c.code) === '44054006' || String(c.display).toLowerCase().includes('type 2 diabetes')
    );
  });

  if (!hasDiabetes) {
    return gaps;
  }

  // 2. Find all HbA1c Observations (LOINC 4548-4)
  const hba1cObservations = resources
    .filter((r) => {
      if (r.resource_type !== 'Observation') return false;
      const raw = r.raw_json as Record<string, unknown> | undefined;
      const codeObj = raw?.code as Record<string, unknown> | undefined;
      const codings = (codeObj?.coding as Array<Record<string, unknown>>) || [];
      return (
        codings.some((c) => String(c.code) === '4548-4') ||
        r.summary_title.toLowerCase().includes('hba1c') ||
        r.summary_title.toLowerCase().includes('hemoglobin a1c')
      );
    })
    .sort((a, b) => {
      const timeA = a.event_date ? new Date(a.event_date).getTime() : 0;
      const timeB = b.event_date ? new Date(b.event_date).getTime() : 0;
      return timeB - timeA;
    });

  if (hba1cObservations.length === 0) {
    gaps.push({
      code: 'HBA1C_OVERDUE',
      severity: 'high',
      daysSince: null,
      lastValue: null,
      lastDate: null,
      message: 'Type 2 Diabetes diagnosed, but no HbA1c monitoring test is on record.',
    });
    return gaps;
  }

  const latestHbA1c = hba1cObservations[0];
  const latestDate = latestHbA1c.event_date ? new Date(latestHbA1c.event_date) : null;

  if (!latestDate || isNaN(latestDate.getTime())) {
    gaps.push({
      code: 'HBA1C_OVERDUE',
      severity: 'high',
      daysSince: null,
      lastValue: latestHbA1c.summary_value,
      lastDate: null,
      message: 'Most recent HbA1c test has an invalid or missing record date.',
    });
    return gaps;
  }

  const diffMs = effectiveAsOfDate.getTime() - latestDate.getTime();
  const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysSince > 180) {
    gaps.push({
      code: 'HBA1C_OVERDUE',
      severity: 'high',
      daysSince,
      lastValue: latestHbA1c.summary_value,
      lastDate: latestHbA1c.event_date,
      message: `HbA1c test overdue (${daysSince} days since last test). Clinical guidelines recommend retesting every 90–180 days for type 2 diabetes management.`,
    });
  }

  return gaps;
}

/**
 * Retrieves care gaps for a patient by calling the secure RPC and running rule analysis.
 */
export async function getCareGaps(
  client: SupabaseClient<Database>,
  abhaId: string,
  asOf?: Date | string
): Promise<CareGap[]> {
  const { data, error } = await client.rpc('get_patient_resources_for_care_gaps', {
    p_abha_id: abhaId,
  });

  if (error) {
    throw new Error(`Failed to fetch patient resources for care gaps: ${error.message}`);
  }

  const resources = (data as unknown as ClinicalResourceInput[]) || [];
  return evaluateCareGaps(resources, asOf);
}
