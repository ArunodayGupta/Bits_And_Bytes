import React, { useState } from 'react';
import { useCareGaps } from '@/hooks/useCareGaps';
import { AlertTriangle, Clock, X, Info } from 'lucide-react';

export const CareGapBanner: React.FC = () => {
  const { data: gaps } = useCareGaps();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (!gaps || gaps.length === 0) return null;

  const handleDismiss = (code: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(code);
      return next;
    });
  };

  return (
    <>
      {gaps.map((gap) => {
        if (dismissed.has(gap.code)) return null;

        const isSevere = gap.severity === 'high';
        const colorStyles = isSevere
          ? {
              wrapper: 'border-rose-200 bg-rose-50/80 text-rose-950',
              iconBg: 'bg-rose-100 text-rose-700',
              badge: 'bg-rose-100 text-rose-800 border-rose-300',
              Icon: AlertTriangle,
            }
          : {
              wrapper: 'border-amber-200 bg-amber-50/80 text-amber-950',
              iconBg: 'bg-amber-100 text-amber-700',
              badge: 'bg-amber-100 text-amber-800 border-amber-300',
              Icon: Clock,
            };

        const IconComponent = colorStyles.Icon;

        // e.g. "HbA1c overdue: last result 8.1% on 10 Apr 2024 (187 days ago)"
        const formattedDate = gap.last_date
          ? new Date(gap.last_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })
          : null;
        
        let displayMessage = gap.message;
        if (gap.last_value && formattedDate && gap.days_since !== null) {
          displayMessage = `HbA1c overdue: last result ${gap.last_value} on ${formattedDate} (${gap.days_since} days ago)`;
        }

        return (
          <div
            key={gap.code}
            role="status"
            className={`relative rounded-24 border p-4 sm:p-5 shadow-sm transition-all mb-6 ${colorStyles.wrapper}`}
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
                    <h4 className="font-serif text-base sm:text-lg font-medium leading-tight group relative flex items-center gap-1 cursor-help">
                      Care Gap Identified
                      <Info className="h-3.5 w-3.5 text-current opacity-60" />
                      <div className="absolute bottom-full left-0 mb-2 hidden w-64 rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 group-hover:block group-hover:opacity-100 z-50">
                        Rule: diabetes patients should have HbA1c checked at least every 180 days (demo rule)
                      </div>
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm opacity-90 leading-relaxed max-w-2xl">
                    {displayMessage}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center">
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold ${colorStyles.badge}`}
                >
                  {isSevere ? 'Critical Overdue' : 'Overdue'}
                </span>
                
                <button
                  type="button"
                  onClick={() => handleDismiss(gap.code)}
                  aria-label="Dismiss alert"
                  className="p-1 rounded-full hover:bg-black/5 transition-colors"
                >
                  <X className="h-4 w-4 opacity-60" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
