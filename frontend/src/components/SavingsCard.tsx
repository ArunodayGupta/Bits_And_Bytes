import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, ShieldAlert, Sparkles, TrendingDown } from 'lucide-react';
import { usePatientData } from '@/context/usePatientData';

export interface MatchedMedication {
  prescribed_drug: string;
  salt: string;
  generic_alternative: string;
  monthly_savings_rupees: string;
  savings_percentage: string;
  monthly_cost_brand: string;
  monthly_cost_generic: string;
  doses_per_day: number;
  assumed_frequency: boolean;
  caution: string | null;
  price_as_of: string;
  illustrative: boolean;
}

export interface UnmatchedMedication {
  prescribed_drug: string;
  reason: string;
}

export interface SavingsResponse {
  rx_id: string;
  medications: MatchedMedication[];
  unmatched: UnmatchedMedication[];
  total_monthly_savings: string;
  disclaimer: string;
}

interface SavingsCardProps {
  rxId?: string | null;
  className?: string;
  defaultExpanded?: boolean;
}

export const SavingsCard: React.FC<SavingsCardProps> = ({
  rxId,
  className = '',
  defaultExpanded = false,
}) => {
  const { source } = usePatientData();
  const [data, setData] = useState<SavingsResponse | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const effectiveRxId = rxId || 'APL-RR-1410-RAME';

  useEffect(() => {
    let isCancelled = false;

    async function loadSavings() {
      setIsLoading(true);
      setHasError(false);

      const loadFallbackAsset = async () => {
        try {
          const res = await fetch('/demo/sample-savings.json');
          if (res.ok) {
            const json = (await res.json()) as SavingsResponse;
            if (!isCancelled) setData(json);
            return true;
          }
        } catch {
          // ignore
        }
        return false;
      };

      // Query Backend endpoint
      try {
        const response = await fetch(`/api/prescription/${encodeURIComponent(effectiveRxId)}/savings`);
        if (response.ok) {
          const json = (await response.json()) as SavingsResponse;
          if (!isCancelled) setData(json);
        } else {
          const fallbackOk = await loadFallbackAsset();
          if (!fallbackOk && !isCancelled) setHasError(true);
        }
      } catch {
        const fallbackOk = await loadFallbackAsset();
        if (!fallbackOk && !isCancelled) setHasError(true);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    void loadSavings();

    return () => {
      isCancelled = true;
    };
  }, [effectiveRxId, source]);

  if (isLoading) {
    return (
      <div className={`rounded-20 border border-emerald-200/80 bg-emerald-50/40 p-4 animate-pulse ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-4 w-64 bg-emerald-200/60 rounded-full" />
          <div className="h-4 w-20 bg-emerald-200/60 rounded-full" />
        </div>
      </div>
    );
  }

  if (hasError || !data || (data.medications.length === 0 && data.unmatched.length === 0)) {
    return null;
  }

  // Calculate total brand cost to derive overall savings percentage
  const totalBrandCost = data.medications.reduce((sum, m) => sum + parseFloat(m.monthly_cost_brand || '0'), 0);
  const totalSavingsNum = parseFloat(data.total_monthly_savings || '0');
  const overallPercent = totalBrandCost > 0 ? ((totalSavingsNum / totalBrandCost) * 100).toFixed(1) : '0';

  return (
    <div
      className={`rounded-24 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-teal-500/5 dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-teal-950/30 dark:border-emerald-500/30 p-5 shadow-sm transition-all ${className}`}
    >
      {/* Header bar / Toggle Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
            <TrendingDown className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className="font-serif text-base sm:text-lg font-medium text-ink dark:text-stone-100 leading-tight">
                Estimated monthly savings with Jan Aushadhi generics:{' '}
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
                  ₹{data.total_monthly_savings}
                </span>{' '}
                <span className="text-emerald-600 dark:text-emerald-300 text-sm font-sans font-normal">({overallPercent}%)</span>
              </h4>
            </div>
            <p className="text-xs text-ink-soft dark:text-stone-400">
              Mapped to equivalent PMBJP generic formulations for {data.rx_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="rounded-full border border-emerald-300 dark:border-emerald-600/40 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
            Illustrative prices
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 rounded-full border border-hairline dark:border-white/15 bg-paper dark:bg-white/10 px-3 py-1 text-xs font-medium text-ink dark:text-stone-200 hover:bg-paper-2 dark:hover:bg-white/20 transition-colors"
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Hide breakdown' : 'View breakdown'}</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Breakdown Table */}
      {isExpanded && (
        <div className="mt-5 pt-4 border-t border-emerald-500/20 dark:border-emerald-500/30 space-y-4 animate-fade-up">
          {/* Matched Medications Table */}
          {data.medications.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-hairline dark:border-white/10 bg-paper dark:bg-black/40 backdrop-blur-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper-2 dark:bg-white/5 text-ink-soft dark:text-stone-300 font-semibold border-b border-hairline dark:border-white/10 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Prescribed Medicine</th>
                    <th className="py-2.5 px-3">Jan Aushadhi Generic</th>
                    <th className="py-2.5 px-3 text-right">Brand/mo</th>
                    <th className="py-2.5 px-3 text-right">Generic/mo</th>
                    <th className="py-2.5 px-3 text-right">Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline dark:divide-white/5">
                  {data.medications.map((med, idx) => (
                    <tr key={idx} className="hover:bg-paper-2/50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-ink dark:text-stone-100">
                        {med.prescribed_drug}
                        {med.assumed_frequency && (
                          <span className="block text-[10px] text-stone-500 dark:text-stone-400 italic">
                            (Assumed 1 dose/day)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-700 dark:text-emerald-400 font-medium">
                        {med.generic_alternative}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-ink-soft dark:text-stone-400">
                        ₹{med.monthly_cost_brand}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        ₹{med.monthly_cost_generic}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                        ₹{med.monthly_savings_rupees} ({med.savings_percentage}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cautions (e.g. Levothyroxine) */}
          {data.medications
            .filter((m) => m.caution)
            .map((m, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-semibold">{m.prescribed_drug}: </span>
                  <span>{m.caution}</span>
                </div>
              </div>
            ))}

          {/* Unmatched Drugs */}
          {data.unmatched.length > 0 && (
            <div className="rounded-xl border border-hairline dark:border-white/10 bg-paper-2/60 dark:bg-white/5 p-3 text-xs space-y-1">
              <span className="font-semibold text-ink-soft dark:text-stone-300 block mb-1">
                No generic comparison available:
              </span>
              {data.unmatched.map((un, idx) => (
                <div key={idx} className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
                  <AlertCircle className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <span className="font-medium text-ink dark:text-stone-100">{un.prescribed_drug}</span>
                  <span>—</span>
                  <span className="italic">{un.reason}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mandatory Disclaimer */}
          <div className="flex items-start gap-2 pt-1 text-[11px] text-ink-soft dark:text-stone-400 leading-relaxed">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <p className="leading-relaxed">
              <span className="font-semibold text-ink dark:text-stone-200">Disclaimer: </span>
              {data.disclaimer} Jan Aushadhi refers to the PMBJP scheme (Pradhan Mantri Bhartiya Janaushadhi Pariyojana).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
