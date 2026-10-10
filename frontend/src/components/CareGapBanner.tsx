import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  HeartPulse,
  Activity,
  X,
  Info,
  Calendar,
  FileCheck2,
} from 'lucide-react';
import { usePatientData } from '@/context/usePatientData';
import { useAuth } from '@/context/AuthContext';
import {
  evaluateCareGaps,
  type CareGap,
  type ClinicalResourceInput,
} from '@/lib/careGaps';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const RULE_DESCRIPTIONS: Record<string, string> = {
  HBA1C_OVERDUE:
    'Demo rule: Triggers when HbA1c laboratory monitoring is older than 180 days for a diagnosed Type 2 diabetes patient.',
  UNCONTROLLED_BP:
    'Demo rule: Triggers when the 2 most recent blood pressure readings are both at or above 140/90 mmHg for a patient with hypertension.',
  BP_ELEVATED_SINGLE_READING:
    'Demo rule: Triggers when only one blood pressure reading is on record and it is at or above 140/90 mmHg.',
  BP_RISING_TREND:
    'Demo rule: Triggers when systolic blood pressure is strictly increasing across the latest 3 readings with total rise >= 10 mmHg.',
};

export const CareGapBanner: React.FC = () => {
  const { bundle, source, patient, currentPatientId } = usePatientData();
  const { abhaId: authAbhaId } = useAuth();

  // Session-only dismiss state
  const [dismissedCodes, setDismissedCodes] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem('dismissed_care_gaps');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [backendGaps, setBackendGaps] = useState<CareGap[] | null>(null);

  const activeAbha =
    authAbhaId ||
    patient?.identifier?.find((i) => i.system?.includes('healthid'))?.value ||
    (currentPatientId === 'ramesh-kumar' ? '91-1234-5678-9012' : currentPatientId);

  // If Live or Database source is active, fetch from backend and DO NOT recompute
  useEffect(() => {
    let isCancelled = false;

    if (source === 'live' || source === 'database' || (source as string) === 'backend') {
      const fetchBackendGaps = async () => {
        try {
          const res = await fetch(`/api/patient/${encodeURIComponent(activeAbha)}/care-gaps`);
          if (res.ok) {
            const data = (await res.json()) as CareGap[];
            if (!isCancelled) setBackendGaps(Array.isArray(data) ? data : []);
            return;
          }
        } catch {
          // ignore network failure
        }
        if (!isCancelled) setBackendGaps(null);
      };

      void fetchBackendGaps();
    } else {
      setBackendGaps(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [source, activeAbha, bundle]);

  // Client-side computed gaps for offline mode or fallback
  const clientGaps = useMemo(() => {
    if (!bundle?.entry) return [];

    try {
      const inputs: ClinicalResourceInput[] = bundle.entry.map((e) => {
        const r = e.resource as Record<string, unknown>;
        const codeObj = r.code as Record<string, unknown> | undefined;
        const codings = (codeObj?.coding as Array<Record<string, unknown>>) || [];
        const valQty = r.valueQuantity as Record<string, unknown> | undefined;

        const title =
          (codeObj?.text as string) ||
          (codings[0]?.display as string) ||
          (r.resourceType as string);

        const valStr = valQty
          ? `${valQty.value} ${valQty.unit || ''}`
          : (r.valueString as string) || null;

        const dateStr =
          (r.effectiveDateTime as string) ||
          (r.issued as string) ||
          (r.recordedDate as string) ||
          (r.authoredOn as string) ||
          null;

        const metaObj = r.meta as Record<string, unknown> | undefined;
        const metaTags = (metaObj?.tag as Array<Record<string, unknown>>) || [];
        const isOcr =
          (r.source as string) === 'ocr_scan' ||
          metaTags.some((t) => t.code === 'ocr-scan');

        return {
          id: r.id as string,
          fhir_id: r.id as string,
          resource_type: r.resourceType as string,
          event_date: dateStr,
          summary_title: title,
          summary_value: valStr,
          source: isOcr ? 'ocr_scan' : 'ingested',
          raw_json: r,
        };
      });

      return evaluateCareGaps(inputs) || [];
    } catch (err) {
      console.warn('Fallback care gap evaluation error:', err);
      return [];
    }
  }, [bundle]);

  const rawGaps = (backendGaps !== null ? backendGaps : clientGaps) || [];

  // Filter out session-dismissed gaps
  const activeGaps = rawGaps.filter((gap) => gap && !dismissedCodes.has(gap.code));

  const handleDismiss = (code: string) => {
    setDismissedCodes((prev) => {
      const next = new Set(prev);
      next.add(code);
      try {
        sessionStorage.setItem('dismissed_care_gaps', JSON.stringify(Array.from(next)));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  if (activeGaps.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col gap-3.5 mb-6 w-full animate-fade-up"
      >
        {activeGaps.map((gap) => {
          const isHigh = gap.severity === 'high';
          const isMedium = gap.severity === 'medium';

          const wrapperStyle = isHigh
            ? 'border-rose-200/90 bg-rose-50/85 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100'
            : isMedium
            ? 'border-amber-200/90 bg-amber-50/85 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100'
            : 'border-blue-200/90 bg-blue-50/85 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100';

          const iconStyle = isHigh
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
            : isMedium
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';

          const badgeStyle = isHigh
            ? 'bg-rose-100/90 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800'
            : isMedium
            ? 'bg-amber-100/90 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800'
            : 'bg-blue-100/90 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800';

          const IconComponent = gap.code.includes('BP')
            ? HeartPulse
            : gap.code.includes('HBA1C')
            ? Clock
            : isHigh
            ? AlertTriangle
            : Activity;

          const ruleTooltipText =
            RULE_DESCRIPTIONS[gap.code] || `Demo rule v${gap.rule_version}: ${gap.title}`;

          return (
            <div
              key={gap.code}
              className={`relative rounded-24 border p-4 sm:p-5 shadow-sm transition-all ${wrapperStyle}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3.5 pr-8 sm:pr-0">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-xs ${iconStyle}`}
                  >
                    <IconComponent className="h-5 w-5" />
                  </span>

                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-serif text-base sm:text-lg font-medium leading-tight">
                        {gap.title}
                      </h4>

                      {/* Rule Tooltip */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono font-medium opacity-80 hover:opacity-100 border border-current transition-opacity cursor-help"
                            aria-label={`Rule explanation for ${gap.code}`}
                          >
                            <Info className="h-3 w-3" />
                            <span>Demo rule</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs font-sans">
                          {ruleTooltipText}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
                      {gap.message}
                    </p>

                    {/* Evidence Dates & Summaries */}
                    {gap.evidence && gap.evidence.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs opacity-80">
                        <span className="font-semibold flex items-center gap-1 text-[11px]">
                          <Calendar className="h-3.5 w-3.5" />
                          Evidence:
                        </span>
                        {gap.evidence.map((ev, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-black/20 border border-current/20 px-2 py-0.5 text-[11px] font-mono"
                          >
                            <span>{ev.summary}</span>
                            {ev.source === 'ocr_scan' && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 px-1.5 py-0.2 text-[9px] font-semibold">
                                <FileCheck2 className="h-2.5 w-2.5" />
                                Scanned
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start shrink-0">
                  <span
                    className={`rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider ${badgeStyle}`}
                  >
                    {gap.severity} severity
                  </span>

                  {/* Session-only Dismiss Button */}
                  <button
                    type="button"
                    onClick={() => handleDismiss(gap.code)}
                    className="flex h-7 w-7 items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    title="Dismiss alert for this session"
                    aria-label={`Dismiss ${gap.title}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
