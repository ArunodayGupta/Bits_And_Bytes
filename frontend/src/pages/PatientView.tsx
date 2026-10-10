import React, { useState, useMemo, useEffect, useCallback } from 'react';

import { usePatientData } from '@/context/usePatientData';
import { useAuth } from '@/context/AuthContext';
import { Timeline } from '@/components/Timeline';
import { ResourceSheet } from '@/components/ResourceSheet';
import { PatientSwitcher } from '@/components/PatientSwitcher';
import { CareGapBanner } from '@/components/CareGapBanner';
import { ScanDialog } from '@/components/ScanDialog';
import {
  Calendar, Activity, Pill, Shield, Camera, Share2, Copy, Check, QrCode
} from 'lucide-react';

// ─────────────────────────────────────────────
// Share to Doctor panel
// ─────────────────────────────────────────────
function ShareToDoctor({
  rxId,
  abhaId,
  patientName,
}: {
  rxId: string | null;
  abhaId: string | null;
  patientName: string;
}) {
  const [copiedRx, setCopiedRx] = useState(false);
  const [copiedAbha, setCopiedAbha] = useState(false);

  // Use speakable Rx-ID if available, else default demo code for Ramesh Kumar or generate deterministic code
  const code = rxId || 'APL-RR-1410-RAME';
  const displayAbha = abhaId || '91-1234-5678-9012';

  const handleCopyRx = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedRx(true);
      setTimeout(() => setCopiedRx(false), 2500);
    });
  }, [code]);

  const handleCopyAbha = useCallback(() => {
    navigator.clipboard.writeText(displayAbha).then(() => {
      setCopiedAbha(true);
      setTimeout(() => setCopiedAbha(false), 2500);
    });
  }, [displayAbha]);

  return (
    <section className="rounded-28 border border-hairline bg-card p-5 sm:p-6 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="h-5 w-5 text-moss-600" />
        <h2 className="font-serif text-xl text-ink font-bold">Share with your doctor</h2>
      </div>
      <p className="text-xs sm:text-sm text-ink-soft mb-4 leading-relaxed max-w-2xl">
        Give your doctor either your <strong>Prescription Code</strong> or your <strong>ABHA Health ID</strong>. They can enter it in the Doctor Portal to instantly pull up your medical history, vitals, and past prescriptions.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Prescription Code */}
        <div className="rounded-20 border border-moss-500/30 bg-moss-50/60 dark:bg-moss-950/20 p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-moss-700 dark:text-moss-400 font-semibold">
                Prescription Share Code
              </span>
              <span className="text-[10px] text-moss-600 font-mono">Speakable Rx-ID</span>
            </div>
            <p className="font-mono text-xl sm:text-2xl font-bold text-ink tracking-wider mt-1">{code}</p>
          </div>
          <button
            type="button"
            onClick={handleCopyRx}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
              copiedRx
                ? 'bg-moss-200 text-moss-800 border border-moss-400'
                : 'bg-moss-600 text-paper hover:bg-moss-700'
            }`}
            aria-label="Copy prescription share code"
          >
            {copiedRx ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedRx ? 'Copied Prescription Code!' : 'Copy Prescription Code'}
          </button>
        </div>

        {/* ABHA Health ID */}
        <div className="rounded-20 border border-hairline bg-paper-2 p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
                ABHA Health ID
              </span>
              <span className="text-[10px] text-ink-soft font-mono">Verified ABDM ID</span>
            </div>
            <p className="font-mono text-xl sm:text-2xl font-bold text-ink tracking-wider mt-1">{displayAbha}</p>
          </div>
          <button
            type="button"
            onClick={handleCopyAbha}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
              copiedAbha
                ? 'bg-ink/20 text-ink border border-ink/30'
                : 'border border-hairline bg-card text-ink hover:bg-paper-2'
            }`}
            aria-label="Copy ABHA ID"
          >
            {copiedAbha ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedAbha ? 'Copied ABHA ID!' : 'Copy ABHA ID'}
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-ink-soft flex items-center gap-1.5">
        <QrCode className="h-3.5 w-3.5 text-moss-600" />
        Doctors can open the <strong>Doctor Portal</strong> and paste either code to view your records securely.
      </p>
    </section>
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

  // Find most recent prescription ID or speakable token for share code
  const latestRxId = useMemo(() => {
    if (!bundle?.entry) return null;
    for (const e of bundle.entry) {
      if (e.resource.resourceType === 'MedicationRequest') {
        const med = e.resource as any;
        const rxToken =
          med.identifier?.find((id: any) => id.system?.includes('rx-token'))?.value ||
          med.groupIdentifier?.value;
        if (rxToken) return rxToken;
        return med.id || null;
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
      <section className="patient-hero relative overflow-hidden rounded-28 border border-hairline bg-gradient-to-br from-[#E4EBD6]/60 via-[#F4EFE2] to-[#ECE9DF]/70 dark:from-[#17241B] dark:via-[#1B291F] dark:to-[#141E17] dark:border-white/10 p-6 sm:p-10 md:p-12 shadow-soft">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-moss-500/15 dark:bg-moss-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-teal-700/10 dark:bg-teal-700/15 blur-3xl" />

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

          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-normal text-ink leading-tight mb-4">
            Clinical history, <span className="italic">{patientName.split(' ')[0]}.</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-ink-soft leading-relaxed max-w-2xl mb-8">
            Your complete medical history — doctor visits, lab results, and prescriptions — all in one place.
          </p>

          {/* 4 Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-card rounded-20 p-4 shadow-sm border border-white/40 dark:border-white/10 dark:bg-card/75">
              <div className="flex items-center gap-2 text-ink-soft text-xs mb-1">
                <Calendar className="h-3.5 w-3.5 text-moss-600" />
                <span className="font-medium">Encounters</span>
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-medium text-ink">{stats.encounters}</div>
              <span className="text-[11px] text-ink-soft">Doctor Visits</span>
            </div>

            <div className="glass-card rounded-20 p-4 shadow-sm border border-white/40 dark:border-white/10 dark:bg-card/75">
              <div className="flex items-center gap-2 text-ink-soft text-xs mb-1">
                <Activity className="h-3.5 w-3.5 text-amber-600" />
                <span className="font-medium">Active conditions</span>
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-medium text-ink">{stats.conditions}</div>
              <span className="text-[11px] text-ink-soft">Health Conditions</span>
            </div>

            <div className="glass-card rounded-20 p-4 shadow-sm border border-white/40 dark:border-white/10 dark:bg-card/75">
              <div className="flex items-center gap-2 text-ink-soft text-xs mb-1">
                <Pill className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-medium">Medications</span>
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-medium text-ink">{stats.medications}</div>
              <span className="text-[11px] text-ink-soft">Prescriptions</span>
            </div>

            <div className="glass-card rounded-20 p-4 shadow-sm border border-white/40 dark:border-white/10 dark:bg-card/75">
              <div className="flex items-center gap-2 text-ink-soft text-xs mb-1">
                <Shield className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-medium">Lab Biomarkers</span>
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-medium text-ink">{stats.labs}</div>
              <span className="text-[11px] text-ink-soft">Lab Results</span>
            </div>
          </div>
        </div>
      </section>

      {/* Care Gap Banner */}
      <CareGapBanner />

      {/* Share to Doctor */}
      <ShareToDoctor rxId={latestRxId} abhaId={abhaId} patientName={patientName} />


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
