import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from 'recharts';
import type { TrendSeries } from '@/lib/fhir/buildTimeline';
import { TrendingUp } from 'lucide-react';

interface ObservationTrendProps {
  series: TrendSeries;
}

export const ObservationTrend: React.FC<ObservationTrendProps> = ({ series }) => {
  const validPoints = (series.points || []).filter(
    (pt) => typeof pt.value === 'number' && !isNaN(pt.value)
  );

  if (validPoints.length < 2) {
    return null;
  }

  const chartData = validPoints.map((pt) => ({
    date: pt.displayDate,
    value: pt.value,
    unit: pt.unit,
  }));

  const latestPoint = validPoints[validPoints.length - 1];
  const firstPoint = validPoints[0];
  const changeDiff = latestPoint.value - firstPoint.value;
  const change = isNaN(changeDiff) ? '0.0' : changeDiff.toFixed(1);
  const isImproved = latestPoint.value < firstPoint.value; // for HbA1c / BP lower is often improved
  const safeGradId = `grad-${(series.code || 'trend').replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  return (
    <div className="rounded-20 border border-hairline bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-moss-600" />
          <h4 className="font-semibold text-sm text-ink">
            {series.name}
          </h4>
        </div>
        <span className="text-xs font-mono text-ink-soft">
          last {validPoints.length} readings
        </span>
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-2xl font-medium text-ink">
            {latestPoint.value}
          </span>
          <span className="text-xs text-ink-soft font-mono">
            {series.unit}
          </span>
        </div>

        <div className="text-xs font-medium">
          <span
            className={`px-2 py-0.5 rounded-full border ${
              isImproved
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
            }`}
          >
            {Number(change) > 0 ? `+${change}` : change} {series.unit}
          </span>
        </div>
      </div>

      <div className="h-20 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <defs>
              <linearGradient id={safeGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6F8F4E" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#6F8F4E" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-hairline bg-paper-2 px-2.5 py-1 text-xs text-ink shadow-md font-sans">
                      <span className="font-semibold block">{data.date}</span>
                      <span className="font-mono text-moss-600 font-bold">
                        {data.value} {data.unit}
                      </span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#4F6B3A"
              strokeWidth={2.5}
              fill={`url(#${safeGradId})`}
              dot={{ r: 2, fill: '#4F6B3A' }}
              activeDot={{ r: 4, fill: '#C9A24B', stroke: '#4F6B3A', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
