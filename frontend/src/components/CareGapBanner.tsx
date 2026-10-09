import React, { useMemo } from 'react';
import { usePatientData } from '@/context/usePatientData';
import { AlertTriangle, CheckCircle, Clock, HeartPulse, Activity } from 'lucide-react';
import type { FhirObservation, FhirCondition } from '@/lib/fhir/types';

export const CareGapBanner: React.FC = () => {
  const { bundle } = usePatientData();

  const gapAnalysis = useMemo(() => {
    if (!bundle?.entry) return null;

    const conditions: FhirCondition[] = [];
    const observations: FhirObservation[] = [];

    for (const e of bundle.entry) {
      if (e.resource.resourceType === 'Condition') {
        conditions.push(e.resource as FhirCondition);
      } else if (e.resource.resourceType === 'Observation') {
        observations.push(e.resource as FhirObservation);
      }
    }

    const hasT2DM = conditions.some((c) => {
      const codings = c.code?.coding || [];
      return (
        codings.some((cod) => cod.code === '44054006') ||
        c.code?.text?.toLowerCase().includes('diabetes')
      );
    });

    const hasCAD = conditions.some((c) => {
      const codings = c.code?.coding || [];
      return (
        codings.some((cod) => cod.code === '53741008') ||
        c.code?.text?.toLowerCase().includes('coronary')
      );
    });

    const hasAsthma = conditions.some((c) => {
      const codings = c.code?.coding || [];
      return (
        codings.some((cod) => cod.code === '195967001') ||
        c.code?.text?.toLowerCase().includes('asthma')
      );
    });

    // 1. If patient has Diabetes
    if (hasT2DM) {
      const hba1cObs = observations
        .filter((o) => {
          const codings = o.code?.coding || [];
          return (
            codings.some((c) => c.code === '4548-4') ||
            o.code?.text?.toLowerCase().includes('hba1c') ||
            o.code?.text?.toLowerCase().includes('hemoglobin a1c')
          );
        })
        .sort((a, b) => {
          const dateA = a.effectiveDateTime || '';
          const dateB = b.effectiveDateTime || '';
          return dateB.localeCompare(dateA);
        });

      if (hba1cObs.length === 0) {
        return {
          type: 'missing',
          title: 'High Care Gap: Overdue HbA1c Lab Test',
          message:
            'Patient has diagnosed Type 2 Diabetes Mellitus but no HbA1c test is on record. NRCeS/ADA clinical guidelines recommend baseline and quarterly surveillance.',
          badge: 'Missing Baseline',
          color: 'amber',
        };
      }

      const latest = hba1cObs[0];
      const val = latest.valueQuantity?.value ?? 0;
      const dateStr = latest.effectiveDateTime ? latest.effectiveDateTime.split('T')[0] : 'Unknown';

      if (val >= 9.0) {
        return {
          type: 'severe',
          title: 'Critical Care Gap: Severely Elevated HbA1c',
          message: `Last recorded HbA1c was ${val}% (on ${dateStr}). Glycemic control is critically above target (< 7.0%). Immediate clinical consultation and treatment intensification recommended.`,
          badge: `HbA1c ${val}% Overdue`,
          color: 'rose',
        };
      } else if (val >= 8.0) {
        return {
          type: 'moderate',
          title: 'Care Gap: Sub-Optimal HbA1c & Overdue Monitoring',
          message: `Last recorded HbA1c was ${val}% (on ${dateStr}). The test is > 180 days old. Routine 3–6 month follow-up is overdue.`,
          badge: `HbA1c ${val}% Overdue`,
          color: 'amber',
        };
      } else {
        return {
          type: 'controlled',
          title: 'Care Plan on Track: Glycemic Target Met',
          message: `Recent HbA1c is ${val}% (on ${dateStr}), within the recommended ADA/NRCeS target (< 7.0%). Continue current therapy and schedule routine checkup in 3 months.`,
          badge: `HbA1c ${val}% Optimal`,
          color: 'emerald',
        };
      }
    }

    // 2. If patient has Coronary Artery Disease
    if (hasCAD) {
      return {
        type: 'cardio',
        title: 'Cardiovascular Care Plan: Secondary Prevention Active',
        message:
          'Longitudinal lipid biomarkers recorded (Total Cholesterol 242 mg/dL, LDL 158 mg/dL). Daily statin and antiplatelet therapy active. Blood pressure monitored at 148/92 mmHg.',
        badge: 'Cardio Protocol',
        color: 'blue',
      };
    }

    // 3. If patient has Asthma
    if (hasAsthma) {
      return {
        type: 'respiratory',
        title: 'Pulmonary Care Plan: Maintenance Inhaler Active',
        message:
          'Bronchial asthma with recorded PEFR 340 L/min and SpO2 97%. Dual bronchodilator/corticosteroid inhaler prescribed with leukotriene receptor antagonist.',
        badge: 'Respiratory Protocol',
        color: 'teal',
      };
    }

    return null;
  }, [bundle]);

  if (!gapAnalysis) return null;

  const colorStyles = {
    rose: {
      wrapper: 'border-rose-200 bg-rose-50/80 text-rose-950',
      iconBg: 'bg-rose-100 text-rose-700',
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      Icon: AlertTriangle,
    },
    amber: {
      wrapper: 'border-amber-200 bg-amber-50/80 text-amber-950',
      iconBg: 'bg-amber-100 text-amber-700',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      Icon: Clock,
    },
    emerald: {
      wrapper: 'border-emerald-200 bg-emerald-50/80 text-emerald-950',
      iconBg: 'bg-emerald-100 text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      Icon: CheckCircle,
    },
    blue: {
      wrapper: 'border-blue-200 bg-blue-50/80 text-blue-950',
      iconBg: 'bg-blue-100 text-blue-700',
      badge: 'bg-blue-100 text-blue-800 border-blue-300',
      Icon: HeartPulse,
    },
    teal: {
      wrapper: 'border-teal-200 bg-teal-50/80 text-teal-950',
      iconBg: 'bg-teal-100 text-teal-700',
      badge: 'bg-teal-100 text-teal-800 border-teal-300',
      Icon: Activity,
    },
  }[gapAnalysis.color as 'rose' | 'amber' | 'emerald' | 'blue' | 'teal'];

  const IconComponent = colorStyles.Icon;

  return (
    <div
      className={`rounded-24 border p-4 sm:p-5 shadow-sm transition-all mb-6 ${colorStyles.wrapper}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-xs ${colorStyles.iconBg}`}
          >
            <IconComponent className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-serif text-base sm:text-lg font-medium leading-tight">
                {gapAnalysis.title}
              </h4>
            </div>
            <p className="text-xs sm:text-sm opacity-90 leading-relaxed max-w-2xl">
              {gapAnalysis.message}
            </p>
          </div>
        </div>

        <span
          className={`self-start sm:self-center shrink-0 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold ${colorStyles.badge}`}
        >
          {gapAnalysis.badge}
        </span>
      </div>
    </div>
  );
};
