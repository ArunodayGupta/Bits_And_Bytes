import React, { useState, useMemo, useEffect, useCallback } from 'react';

import { usePatientData } from '@/context/usePatientData';
import { useAuth } from '@/context/AuthContext';
import { Timeline } from '@/components/Timeline';
import { ResourceSheet } from '@/components/ResourceSheet';
import { PatientSwitcher } from '@/components/PatientSwitcher';
import { CareGapBanner } from '@/components/CareGapBanner';
import { ScanDialog } from '@/components/ScanDialog';
import {
  Calendar, Activity, Pill, Shield, Camera, Share2, Copy, Check,
  TrendingUp, TrendingDown, Minus
} from 'lucide-react';


// ─────────────────────────────────────────────
// Mini inline SVG line chart (no external dep)
// ─────────────────────────────────────────────
function SparkLine({
  values,
  color = '#4F6B3A',
  fill = 'rgba(79,107,58,0.12)',
}: {
  values: number[];
  color?: string;
  fill?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 200;
  const h = 48;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 6) - 3,
  }));
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fillD = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" aria-hidden="true">
      <path d={fillD} fill={fill} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* last point dot */}
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
    </svg>
  );
}

// Derive trend arrow and delta
function useTrend(values: number[]) {
  if (values.length < 2) return { icon: Minus, label: 'No trend', color: 'text-ink-soft' };
  const last = values[values.length - 1];
  const prev = values[values.length - 2];
  const delta = last - prev;
  if (Math.abs(delta) < 0.01) return { icon: Minus, label: 'Stable', color: 'text-ink-soft' };
  if (delta > 0) return { icon: TrendingUp, label: `+${delta.toFixed(1)}`, color: 'text-amber-600' };
  return { icon: TrendingDown, label: `${delta.toFixed(1)}`, color: 'text-moss-600' };
}

// ─────────────────────────────────────────────
// Share to Doctor panel
// ─────────────────────────────────────────────
function ShareToDoctor({ rxId, patientName }: { rxId: string | null; patientName: string }) {
  const [copied, setCopied] = useState(false);
  const code = rxId || `HS-${patientName.toUpperCase().replace(/\s+/g, '').slice(0, 4)}-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [code]);

  return (
    <section className="rounded-28 border border-hairline bg-card p-6 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="h-5 w-5 text-moss-600" />
        <h2 className="font-serif text-xl text-ink">Share with your doctor</h2>
      </div>
      <p className="text-sm text-ink-soft mb-4 leading-relaxed">
        Give this code to your doctor so they can instantly access your health records and prescriptions.
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-xl border border-hairline bg-paper-2 px-4 py-3">
          <p className="font-mono text-lg font-bold text-ink tracking-widest text-center">{code}</p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
            copied
              ? 'bg-moss-100 text-moss-700 border border-moss-300'
              : 'bg-ink text-paper hover:bg-moss-600'
          }`}
          aria-label="Copy prescription code"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-ink-soft">
        Your doctor can look this up in the Doctor Portal to view your records.
      </p>
    </section>
  );
}

// ─────────────────────────────────────────────
// Health Trends panel
// ─────────────────────────────────────────────
interface ObsPoint { date: string; value: number; unit: string; }
interface ObsSeries { label: string; points: ObsPoint[]; normalRange?: [number, number]; }

function extractObservationSeries(bundle: any): ObsSeries[] {
  if (!bundle?.entry) return [];

  const seriesMap: Record<string, ObsPoint[]> = {};
  const unitMap: Record<string, string> = {};

  const codeToLabel: Record<string, string> = {
    '2339-0': 'Blood Glucose',
    '4548-4': 'HbA1c',
    '55284-4': 'Blood Pressure',
    '8867-4': 'Heart Rate',
    '29463-7': 'Weight',
    '8302-2': 'Height',
    '39156-5': 'BMI',
    '2085-9': 'HDL Cholesterol',
    '2089-1': 'LDL Cholesterol',
    '2093-3': 'Total Cholesterol',
    '2571-8': 'Triglycerides',
  };

  for (const entry of bundle.entry) {
    const res = entry.resource;
    if (res.resourceType !== 'Observation') continue;

    const code = res.code?.coding?.[0]?.code;
    const display = codeToLabel[code] || res.code?.coding?.[0]?.display || res.code?.text;
    if (!display) continue;

    // Skip component-based (e.g., blood pressure with systolic/diastolic)
    const val = res.valueQuantity?.value;
    if (typeof val !== 'number') continue;

    const date = res.effectiveDateTime?.slice(0, 10) || '';
    if (!date) continue;

    if (!seriesMap[display]) seriesMap[display] = [];
    seriesMap[display].push({ date, value: val, unit: res.valueQuantity?.unit || '' });
    unitMap[display] = res.valueQuantity?.unit || '';
  }

  const normalRanges: Record<string, [number, number]> = {
    'HbA1c': [4, 5.7],
    'Blood Glucose': [70, 100],
    'Heart Rate': [60, 100],
    'BMI': [18.5, 24.9],
    'HDL Cholesterol': [40, 60],
    'LDL Cholesterol': [0, 100],
    'Total Cholesterol': [0, 200],
    'Triglycerides': [0, 150],
  };

  return Object.entries(seriesMap)
    .filter(([, pts]) => pts.length >= 1)
    .map(([label, pts]) => ({
      label,
      points: pts.sort((a, b) => a.date.localeCompare(b.date)),
      normalRange: normalRanges[label],
    }))
    .slice(0, 6); // Show up to 6 charts
}

function HealthTrendCard({ series }: { series: ObsSeries }) {
  const values = series.points.map((p) => p.value);
  const latest = values[values.length - 1];
  const unit = series.points[series.points.length - 1]?.unit || '';
  const trend = useTrend(values);
  const TrendIcon = trend.icon;

  const [normal] = [series.normalRange];
  let statusLabel = '';
  let statusColor = '';
  if (normal && latest !== undefined) {
    if (latest < normal[0]) { statusLabel = 'Below range'; statusColor = 'text-sky-600'; }
    else if (latest > normal[1]) { statusLabel = 'Above range'; statusColor = 'text-amber-600'; }
    else { statusLabel = 'Normal'; statusColor = 'text-moss-600'; }
  }

  return (
    <div className="rounded-20 border border-hairline bg-card p-4 shadow-soft transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-semibold text-ink">{series.label}</p>
        {statusLabel && (
          <span className={`text-[10px] font-semibold ${statusColor}`}>{statusLabel}</span>
        )}
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span className="font-serif text-2xl font-medium text-ink">
          {latest?.toFixed(1)}
        </span>
        <span className="text-xs text-ink-soft mb-1">{unit}</span>
        <span className={`ml-auto flex items-center gap-0.5 text-xs font-semibold ${trend.color}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {trend.label}
        </span>
      </div>
      {values.length >= 2 ? (
        <SparkLine values={values} />
      ) : (
        <div className="h-12 flex items-center justify-center text-[11px] text-ink-soft">
          Only 1 reading — add more for trend
        </div>
      )}
      <p className="mt-2 text-[10px] text-ink-soft">
        {series.points.length} reading{series.points.length !== 1 ? 's' : ''} · Last: {series.points[series.points.length - 1]?.date}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main PatientView
// ─────────────────────────────────────────────
export const PatientView: React.FC = () => {
  const { abhaId } = useAuth();
  const {
    bundle,
    patient,
    selectedResource,
    setSelectedResource,
    setPatientId,
    availablePatients,
  } = usePatientData();

  const [isScanOpen, setIsScanOpen] = useState(false);

  // Enforce session ABHA in patient view
  useEffect(() => {
    if (abhaId && availablePatients.length > 0) {
      const cleanSessionAbha = abhaId.replace(/\D/g, '');
      const matched = availablePatients.find(
        (p) => p.abha.replace(/\D/g, '') === cleanSessionAbha
      );
      if (matched) {
        setPatientId(matched.id);
      }
    }
  }, [abhaId, availablePatients, setPatientId]);

  // Dynamic statistics from bundle
  const stats = useMemo(() => {
    if (!bundle?.entry) return { encounters: 0, conditions: 0, medications: 0, labs: 0 };
    let encounters = 0, conditions = 0, medications = 0, labs = 0;
    for (const e of bundle.entry) {
      if (e.resource.resourceType === 'Encounter') encounters++;
      if (e.resource.resourceType === 'Condition') conditions++;
      if (e.resource.resourceType === 'MedicationRequest') medications++;
      if (e.resource.resourceType === 'Observation') labs++;
    }
    return { encounters, conditions, medications, labs };
  }, [bundle]);

  // Extract health trend series
  const trendSeries = useMemo(() => extractObservationSeries(bundle), [bundle]);

  // Find most recent prescription ID for share code
  const latestRxId = useMemo(() => {
    if (!bundle?.entry) return null;
    for (const e of bundle.entry) {
      if (e.resource.resourceType === 'MedicationRequest') {
        return e.resource.id || null;
      }
    }
    return null;
  }, [bundle]);

  const patientName = patient?.name?.[0]?.text || 'Patient';

  return (
    <div className="flex flex-col gap-6 pb-16 animate-fade-up">
      {/* Show Patient Switcher only if no session ABHA locked */}
      {!abhaId && <PatientSwitcher />}

      {/* Hero Header */}
      <section className="patient-hero relative overflow-hidden rounded-28 border border-hairline bg-gradient-to-br from-[#E4EBD6]/60 via-[#F4EFE2] to-[#ECE9DF]/70 p-8 sm:p-12 shadow-soft">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-moss-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-teal-700/10 blur-3xl" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="eyebrow-pill">
              <span className="eyebrow-dot" />
              Health Records · {patientName}
            </span>

            <button
              type="button"
              onClick={() => setIsScanOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-moss-600 px-4 py-2 text-xs font-semibold text-paper hover:bg-moss-500 transition-all shadow-sm"
              aria-label="Scan and upload a lab report"
            >
              <Camera className="h-4 w-4" />
              <span>Scan report</span>
            </button>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal text-ink leading-tight mb-4">
            Welcome back, <span className="italic">{patientName.split(' ')[0]}.</span>
          </h1>

          <p className="text-base sm:text-lg text-ink-soft leading-relaxed max-w-2xl mb-8">
            Your complete health history — doctor visits, lab results, and prescriptions — all in one place.
          </p>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-card rounded-20 p-4 shadow-sm border border-white/40">
              <div className="flex items-center gap-2 text-ink-soft text-xs mb-1">
                <Calendar className="h-3.5 w-3.5 text-moss-600" />
                <span className="font-medium">Doctor visits</span>
              </div>
              <div className="font-serif text-3xl font-medium text-ink">{stats.encounters}</div>
            </div>

            <div className="glass-card rounded-20 p-4 shadow-sm border border-white/40">
              <div className="flex items-center gap-2 text-ink-soft text-xs mb-1">
                <Activity className="h-3.5 w-3.5 text-amber-600" />
                <span className="font-medium">Conditions</span>
              </div>
              <div className="font-serif text-3xl font-medium text-ink">{stats.conditions}</div>
            </div>

            <div className="glass-card rounded-20 p-4 shadow-sm border border-white/40">
              <div className="flex items-center gap-2 text-ink-soft text-xs mb-1">
                <Pill className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-medium">Prescriptions</span>
              </div>
              <div className="font-serif text-3xl font-medium text-ink">{stats.medications}</div>
            </div>

            <div className="glass-card rounded-20 p-4 shadow-sm border border-white/40">
              <div className="flex items-center gap-2 text-ink-soft text-xs mb-1">
                <Shield className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-medium">Lab results</span>
              </div>
              <div className="font-serif text-3xl font-medium text-ink">{stats.labs}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Care Gap Banner */}
      <CareGapBanner />

      {/* Share to Doctor */}
      <ShareToDoctor rxId={latestRxId} patientName={patientName} />

      {/* Health Trends */}
      {trendSeries.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-moss-600" />
            <h2 className="font-serif text-xl text-ink">Health trends</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trendSeries.map((s) => (
              <HealthTrendCard key={s.label} series={s} />
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-moss-600" />
          <h2 className="font-serif text-xl text-ink">Your timeline</h2>
        </div>
        <Timeline />
      </section>

      {/* Resource Inspector Sheet */}
      <ResourceSheet
        resource={selectedResource}
        open={Boolean(selectedResource)}
        onOpenChange={(open) => {
          if (!open) setSelectedResource(null);
        }}
      />

      {/* Scan Dialog */}
      <ScanDialog
        open={isScanOpen}
        onOpenChange={setIsScanOpen}
      />
    </div>
  );
};
