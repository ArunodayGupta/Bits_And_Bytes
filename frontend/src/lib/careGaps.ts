/**
 * frontend/src/lib/careGaps.ts
 * Clinical Care-Gap Rule Engine v2 (TypeScript implementation).
 *
 * Implements:
 * - HBA1C_OVERDUE (Type 2 Diabetes glycemic monitoring)
 * - UNCONTROLLED_BP (Hypertension with last 2 readings >= 140/90)
 * - BP_ELEVATED_SINGLE_READING (Hypertension with single reading >= 140/90)
 * - BP_RISING_TREND (Hypertension with strictly rising systolic across 3 readings >= 10 mmHg)
 *
 * Guaranteed parity with Python engine via shared/test-vectors/care-gaps.json.
 */

export interface EvidenceItem {
  resource_id: string;
  date?: string | null;
  summary: string;
  source?: string | null;
}

export interface CareGap {
  code: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  evidence: EvidenceItem[];
  rule_version: string;
  days_since?: number | null;
  last_value?: string | null;
  last_date?: string | null;
  // Dynamic clinical risk calculation fields
  risk_score?: number;
  clinical_rationale?: string;
  action_recommendation?: string;
  // Phase 1 camelCase aliases
  daysSince?: number | null;
  lastValue?: string | null;
  lastDate?: string | null;
}

/**
 * Dynamic Clinical Severity & Risk Calculation Engine
 * Calculates risk scores (0-100) and severity dynamically using ADA 2024 & ACC/AHA 2017 clinical standards
 * instead of static hardcoded labels.
 */
export function calculateHbA1cClinicalSeverity(
  valNum: number | undefined,
  daysDiff: number | null
): { severity: 'low' | 'medium' | 'high'; riskScore: number; rationale: string } {
  if (daysDiff === null || valNum === undefined) {
    return {
      severity: 'high',
      riskScore: 85,
      rationale:
        'Diagnosed Type 2 Diabetes without baseline HbA1c test on record. Urgent glycemic evaluation recommended.',
    };
  }

  let score = 30;
  if (valNum >= 9.0) {
    score += 45; // Critical uncontrolled hyperglycemia
  } else if (valNum >= 8.0) {
    score += 30; // Elevated hyperglycemia
  } else if (valNum >= 7.0) {
    score += 15; // Above ADA standard target (<7.0%)
  } else {
    score += 5; // Near target
  }

  if (daysDiff >= 365) {
    score += 25; // Over a year overdue
  } else if (daysDiff >= 270) {
    score += 15; // Over 9 months overdue
  } else if (daysDiff >= 180) {
    score += 10; // Over 6 months overdue
  }

  const riskScore = Math.min(100, Math.max(10, score));
  let severity: 'low' | 'medium' | 'high' = 'low';
  if (riskScore >= 70) severity = 'high';
  else if (riskScore >= 45) severity = 'medium';

  const rationale = `Dynamic Risk Score: ${riskScore}/100. Evaluated from HbA1c ${valNum}% and ${daysDiff} days elapsed since last laboratory check (ADA Guidelines 180-day monitoring cycle).`;
  return { severity, riskScore, rationale };
}

export function calculateBpClinicalSeverity(
  readings: BpReading[],
  ruleType: 'uncontrolled' | 'single' | 'rising'
): { severity: 'low' | 'medium' | 'high'; riskScore: number; rationale: string } {
  if (readings.length === 0) {
    return { severity: 'medium', riskScore: 50, rationale: 'Elevated blood pressure monitoring required.' };
  }

  const latest = readings[0];

  if (ruleType === 'rising' && readings.length >= 3) {
    const rise = latest.systolic - readings[2].systolic;
    const riskScore = Math.min(68, Math.max(45, 50 + Math.floor(rise * 1.2)));
    return {
      severity: 'medium',
      riskScore,
      rationale: `Dynamic Trend Score: ${riskScore}/100. Evaluated from +${rise} mmHg systolic rise across last 3 readings (${readings[2].systolic} -> ${readings[1].systolic} -> ${latest.systolic} mmHg).`,
    };
  }

  let score = 30;

  if (latest.systolic >= 180 || latest.diastolic >= 120) {
    score += 55; // Hypertensive crisis threshold
  } else if (latest.systolic >= 160 || latest.diastolic >= 100) {
    score += 40; // Stage 2 Hypertension
  } else if (latest.systolic >= 140 || latest.diastolic >= 90) {
    score += 25; // Stage 1 Hypertension
  } else {
    score += 10;
  }

  if (ruleType === 'uncontrolled' && readings.length >= 2) {
    const prev = readings[1];
    if (prev.systolic >= 140 || prev.diastolic >= 90) {
      score += 20; // Persistent elevation across consecutive encounters
    }
  }

  const riskScore = Math.min(100, Math.max(10, score));
  let severity: 'low' | 'medium' | 'high' = 'low';
  if (riskScore >= 70) severity = 'high';
  else if (riskScore >= 45) severity = 'medium';

  const rationale = `Dynamic Risk Score: ${riskScore}/100. Evaluated from latest BP ${latest.systolic}/${latest.diastolic} mmHg against ACC/AHA clinical criteria.`;
  return { severity, riskScore, rationale };
}



export interface ClinicalResourceInput {
  id?: string;
  resource_type: string;
  fhir_id?: string;
  event_date?: string | null;
  summary_title?: string;
  summary_value?: string | null;
  source?: string;
  raw_json?: unknown;
}

export const BP_SYSTOLIC_THRESHOLD = 140;
export const BP_DIASTOLIC_THRESHOLD = 90;
export const BP_RISING_MIN_RISE = 10;
export const HBA1C_OVERDUE_DAYS = 180;

interface BpReading {
  resource_id: string;
  event_date: Date;
  date_str: string;
  systolic: number;
  diastolic: number;
  source: string;
}

function parseIsoDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatDisplayDate(dt: Date): string {
  return dt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function extractBpReadings(
  observations: ClinicalResourceInput[]
): { readings: BpReading[]; warnings: string[] } {
  const readings: BpReading[] = [];
  const warnings: string[] = [];

  for (const obs of observations) {
    const raw = (obs.raw_json as Record<string, unknown>) || {};
    const status = String(raw.status || '').toLowerCase();
    if (status === 'entered-in-error' || status === 'cancelled') {
      continue;
    }

    const resourceId = String(obs.id || obs.fhir_id || raw.id || 'unknown');
    const source = obs.source || (
      Array.isArray((raw.meta as any)?.tag) &&
      (raw.meta as any).tag.some((t: any) => t.code === 'ocr-scan')
        ? 'ocr_scan'
        : 'ingested'
    );

    const dateStr = obs.event_date || (raw.effectiveDateTime as string) || (raw.issued as string);
    const parsedDt = parseIsoDate(dateStr);
    if (!parsedDt) continue;

    const components = (raw.component as Array<Record<string, unknown>>) || [];
    let systolic: number | null = null;
    let diastolic: number | null = null;

    for (const comp of components) {
      const codings = ((comp.code as any)?.coding as Array<Record<string, unknown>>) || [];
      const isSystolic = codings.some(
        (c) => c.code === '8480-6' || String(c.display || '').toLowerCase().includes('systolic')
      );
      const isDiastolic = codings.some(
        (c) => c.code === '8462-4' || String(c.display || '').toLowerCase().includes('diastolic')
      );
      const val = (comp.valueQuantity as any)?.value;
      if (typeof val === 'number') {
        if (isSystolic) systolic = Math.round(val);
        if (isDiastolic) diastolic = Math.round(val);
      }
    }

    if (systolic === null || diastolic === null) {
      const codeCodings = ((raw.code as any)?.coding as Array<Record<string, unknown>>) || [];
      const isBpPanel = codeCodings.some(
        (c) => c.code === '85354-9' || String(c.display || '').toLowerCase().includes('blood pressure')
      );
      if (isBpPanel || components.length > 0) {
        warnings.push(`Observation ${resourceId} skipped: missing component.`);
      }
      continue;
    }

    readings.push({
      resource_id: resourceId,
      event_date: parsedDt,
      date_str: dateStr ? dateStr.substring(0, 10) : '',
      systolic,
      diastolic,
      source,
    });
  }

  // Sort descending by date
  readings.sort((a, b) => b.event_date.getTime() - a.event_date.getTime());

  // Collapse multiple same-day readings to latest
  const daySeen = new Set<string>();
  const collapsed: BpReading[] = [];
  for (const r of readings) {
    if (!daySeen.has(r.date_str)) {
      daySeen.add(r.date_str);
      collapsed.push(r);
    }
  }

  return { readings: collapsed, warnings };
}

export function hasHypertension(conditions: ClinicalResourceInput[]): boolean {
  for (const cond of conditions) {
    const raw = (cond.raw_json as Record<string, unknown>) || {};
    const clinicalStatus = ((raw.clinicalStatus as any)?.coding as Array<Record<string, unknown>>) || [];
    if (clinicalStatus.length > 0) {
      const sc = String(clinicalStatus[0].code || '').toLowerCase();
      if (sc !== 'active' && sc !== '') {
        continue;
      }
    }

    const codings = ((raw.code as any)?.coding as Array<Record<string, unknown>>) || [];
    for (const c of codings) {
      const code = String(c.code || '');
      const display = String(c.display || '').toLowerCase();
      if (code === '59621000' || code === '38341003' || display.includes('hypertension')) {
        return true;
      }
    }

    const text = String((raw.code as any)?.text || '').toLowerCase();
    if (text.includes('hypertension')) return true;
  }
  return false;
}

export function hasDiabetes(conditions: ClinicalResourceInput[]): boolean {
  for (const cond of conditions) {
    const raw = (cond.raw_json as Record<string, unknown>) || {};
    const codings = ((raw.code as any)?.coding as Array<Record<string, unknown>>) || [];
    for (const c of codings) {
      const code = String(c.code || '');
      const display = String(c.display || '').toLowerCase();
      if (code === '44054006' || display.includes('type 2 diabetes')) {
        return true;
      }
    }
    const text = String((raw.code as any)?.text || '').toLowerCase();
    if (text.includes('diabetes')) return true;
  }
  return false;
}

export function evaluateCareGaps(
  resources: ClinicalResourceInput[],
  asOf?: Date | string
): CareGap[] {
  let effectiveAsOf: Date;
  if (asOf) {
    effectiveAsOf = typeof asOf === 'string' ? new Date(asOf) : asOf;
  } else {
    let latestTs = 0;
    for (const r of resources) {
      const raw = (r.raw_json as Record<string, unknown>) || {};
      const d = r.event_date || (raw.effectiveDateTime as string);
      if (d) {
        const t = new Date(d).getTime();
        if (!isNaN(t) && t > latestTs) latestTs = t;
      }
    }
    effectiveAsOf = latestTs > 0 ? new Date(latestTs) : new Date();
  }

  const conditions = resources.filter((r) => r.resource_type === 'Condition');
  const observations = resources.filter((r) => r.resource_type === 'Observation');

  const isDiabetic = hasDiabetes(conditions);
  const isHypertensive = hasHypertension(conditions);
  const { readings: bpReadings } = extractBpReadings(observations);

  const gaps: CareGap[] = [];

  // 1. HBA1C_OVERDUE
  if (isDiabetic) {
    const hba1cObs = observations
      .filter((o) => {
        const raw = (o.raw_json as Record<string, unknown>) || {};
        const codings = ((raw.code as any)?.coding as Array<Record<string, unknown>>) || [];
        const title = String(o.summary_title || '').toLowerCase();
        return (
          codings.some((c) => c.code === '4548-4') ||
          title.includes('hba1c') ||
          title.includes('hemoglobin a1c')
        );
      })
      .sort((a, b) => {
        const rawA = (a.raw_json as Record<string, unknown>) || {};
        const rawB = (b.raw_json as Record<string, unknown>) || {};
        const dateA = new Date(a.event_date || (rawA.effectiveDateTime as string) || 0).getTime();
        const dateB = new Date(b.event_date || (rawB.effectiveDateTime as string) || 0).getTime();
        return dateB - dateA;
      });

    if (hba1cObs.length === 0) {
      const evalResult = calculateHbA1cClinicalSeverity(undefined, null);
      gaps.push({
        code: 'HBA1C_OVERDUE',
        severity: evalResult.severity,
        risk_score: evalResult.riskScore,
        clinical_rationale: evalResult.rationale,
        title: 'Overdue HbA1c Lab Test',
        message:
          'Type 2 diabetes is diagnosed, but no HbA1c monitoring test is on record. Routine glycemic testing every 3–6 months is recommended; please discuss this with your doctor.',
        evidence: [],
        rule_version: '2.0.0',
        days_since: null,
        last_value: null,
        last_date: null,
        daysSince: null,
        lastValue: null,
        lastDate: null,
      });
    } else {
      const latest = hba1cObs[0];
      const raw = (latest.raw_json as Record<string, unknown>) || {};
      const dateStr = latest.event_date || (raw.effectiveDateTime as string);
      const dt = parseIsoDate(dateStr);
      if (dt) {
        const diffMs = effectiveAsOf.getTime() - dt.getTime();
        const daysDiff = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        if (daysDiff > HBA1C_OVERDUE_DAYS) {
          const valNum = (raw.valueQuantity as any)?.value;
          const valUnit = (raw.valueQuantity as any)?.unit || '%';
          const lastValStr = valNum !== undefined ? `${valNum} ${valUnit}` : latest.summary_value || null;
          const lastDateFormatted = formatDisplayDate(dt);
          const source = latest.source || (
            Array.isArray((raw.meta as any)?.tag) &&
            (raw.meta as any).tag.some((t: any) => t.code === 'ocr-scan')
              ? 'ocr_scan'
              : 'ingested'
          );

          const evalResult = calculateHbA1cClinicalSeverity(valNum, daysDiff);

          gaps.push({
            code: 'HBA1C_OVERDUE',
            severity: evalResult.severity,
            risk_score: evalResult.riskScore,
            clinical_rationale: evalResult.rationale,
            title: 'Overdue HbA1c Monitoring',
            message: `Last recorded HbA1c was ${lastValStr} on ${lastDateFormatted} (${daysDiff} days ago). Regular glycemic monitoring is recommended at least every 6 months; please discuss this with your doctor.`,
            evidence: [
              {
                resource_id: String(latest.id || latest.fhir_id || raw.id || ''),
                date: dateStr ? dateStr.substring(0, 10) : null,
                summary: `HbA1c ${lastValStr} on ${lastDateFormatted}`,
                source,
              },
            ],
            rule_version: '2.0.0',
            days_since: daysDiff,
            last_value: lastValStr,
            last_date: lastDateFormatted,
            daysSince: daysDiff,
            lastValue: lastValStr,
            lastDate: lastDateFormatted,
          });
        }
      }
    }
  }

  // 2. BP Rules (requires hypertension)
  if (isHypertensive) {
    if (bpReadings.length >= 2) {
      const r0 = bpReadings[0];
      const r1 = bpReadings[1];
      const r0Elevated = r0.systolic >= BP_SYSTOLIC_THRESHOLD || r0.diastolic >= BP_DIASTOLIC_THRESHOLD;
      const r1Elevated = r1.systolic >= BP_SYSTOLIC_THRESHOLD || r1.diastolic >= BP_DIASTOLIC_THRESHOLD;

      if (r0Elevated && r1Elevated) {
        const d0Fmt = formatDisplayDate(r0.event_date);
        const d1Fmt = formatDisplayDate(r1.event_date);
        const evalResult = calculateBpClinicalSeverity(bpReadings, 'uncontrolled');
        gaps.push({
          code: 'UNCONTROLLED_BP',
          severity: evalResult.severity,
          risk_score: evalResult.riskScore,
          clinical_rationale: evalResult.rationale,
          title: 'Uncontrolled Blood Pressure',
          message: `Your last two blood pressure readings (${r0.systolic}/${r0.diastolic} on ${d0Fmt}, ${r1.systolic}/${r1.diastolic} on ${d1Fmt}) were at or above 140/90 mmHg. Please discuss this with your doctor.`,
          evidence: [
            { resource_id: r0.resource_id, date: r0.date_str, summary: `BP ${r0.systolic}/${r0.diastolic} mmHg on ${d0Fmt}`, source: r0.source },
            { resource_id: r1.resource_id, date: r1.date_str, summary: `BP ${r1.systolic}/${r1.diastolic} mmHg on ${d1Fmt}`, source: r1.source },
          ],
          rule_version: '2.0.0',
        });
      }
    } else if (bpReadings.length === 1) {
      const r0 = bpReadings[0];
      const r0Elevated = r0.systolic >= BP_SYSTOLIC_THRESHOLD || r0.diastolic >= BP_DIASTOLIC_THRESHOLD;
      if (r0Elevated) {
        const d0Fmt = formatDisplayDate(r0.event_date);
        const evalResult = calculateBpClinicalSeverity(bpReadings, 'single');
        gaps.push({
          code: 'BP_ELEVATED_SINGLE_READING',
          severity: evalResult.severity,
          risk_score: evalResult.riskScore,
          clinical_rationale: evalResult.rationale,
          title: 'Elevated Blood Pressure (Single Reading)',
          message: `Your latest blood pressure reading (${r0.systolic}/${r0.diastolic} on ${d0Fmt}) was at or above 140/90 mmHg. There is not enough history to assess the trend; please discuss this with your doctor.`,
          evidence: [
            { resource_id: r0.resource_id, date: r0.date_str, summary: `BP ${r0.systolic}/${r0.diastolic} mmHg on ${d0Fmt}`, source: r0.source },
          ],
          rule_version: '2.0.0',
        });
      }
    }

    // BP_RISING_TREND (demo rule)
    if (bpReadings.length >= 3) {
      const r0 = bpReadings[0];
      const r1 = bpReadings[1];
      const r2 = bpReadings[2];
      const isStrictlyIncreasing = r2.systolic < r1.systolic && r1.systolic < r0.systolic;
      const totalRise = r0.systolic - r2.systolic;

      if (isStrictlyIncreasing && totalRise >= BP_RISING_MIN_RISE) {
        const d2Fmt = formatDisplayDate(r2.event_date);
        const d0Fmt = formatDisplayDate(r0.event_date);
        const evalResult = calculateBpClinicalSeverity(bpReadings, 'rising');
        gaps.push({
          code: 'BP_RISING_TREND',
          severity: evalResult.severity,
          risk_score: evalResult.riskScore,
          clinical_rationale: evalResult.rationale,
          title: 'Rising Blood Pressure Trend (Demo Rule)',
          message: `Demo rule: Your systolic blood pressure has risen across your last 3 readings (${r2.systolic} -> ${r1.systolic} -> ${r0.systolic} mmHg between ${d2Fmt} and ${d0Fmt}, an increase of ${totalRise} mmHg). Please discuss this with your doctor.`,
          evidence: [
            { resource_id: r0.resource_id, date: r0.date_str, summary: `Latest: ${r0.systolic}/${r0.diastolic} mmHg`, source: r0.source },
            { resource_id: r1.resource_id, date: r1.date_str, summary: `Prior: ${r1.systolic}/${r1.diastolic} mmHg`, source: r1.source },
            { resource_id: r2.resource_id, date: r2.date_str, summary: `Baseline: ${r2.systolic}/${r2.diastolic} mmHg`, source: r2.source },
          ],
          rule_version: '2.0.0',
        });
      }
    }
  }


  // Sort by severity (high -> medium -> low), then code
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  gaps.sort((a, b) => {
    const sDiff = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99);
    if (sDiff !== 0) return sDiff;
    return a.code.localeCompare(b.code);
  });

  return gaps;
}
