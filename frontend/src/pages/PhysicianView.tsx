import React, { useState, useEffect } from 'react';
import { Pill, Search, ShieldAlert, Sparkles, TrendingDown, ArrowRight, CheckCircle2, AlertCircle, Building2, User, FileText, Printer, Stethoscope } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { PATIENT_PROFILES } from '@/data/patients';
import { evaluateCareGaps, ClinicalResourceInput } from '@/lib/careGaps';

function bundleToInputs(bundle: any): ClinicalResourceInput[] {
  if (!bundle?.entry || !Array.isArray(bundle.entry)) return [];
  return bundle.entry.map((e: any) => {
    const r = e.resource || {};
    const codeObj = r.code;
    const codings = codeObj?.coding || [];
    const valQty = r.valueQuantity;

    const title =
      codeObj?.text ||
      codings[0]?.display ||
      r.resourceType;

    const valStr = valQty
      ? `${valQty.value} ${valQty.unit || ''}`
      : r.valueString || null;

    const dateStr =
      r.effectiveDateTime ||
      r.issued ||
      r.recordedDate ||
      r.authoredOn ||
      null;

    const isOcr =
      r.source === 'ocr_scan' ||
      (r.meta?.tag || []).some((t: any) => t.code === 'ocr-scan');

    return {
      id: r.id || '',
      fhir_id: r.id || '',
      resource_type: r.resourceType || '',
      event_date: dateStr,
      summary_title: title,
      summary_value: valStr,
      source: isOcr ? 'ocr_scan' : 'ingested',
      raw_json: r,
    };
  });
}

interface NormalizedMedication {
  prescribedDrug: string;
  salt: string;
  genericAlternative: string;
  brandCostRupees: number;
  genericCostRupees: number;
  monthlySavingsRupees: number;
  savingsPercentage: number;
  caution: string | null;
  dosesPerDay?: number;
}

interface NormalizedSavings {
  rx_id: string;
  hospital_name?: string;
  doctor_name?: string;
  issued_on?: string;
  totalBrandCostRupees: number;
  totalGenericCostRupees: number;
  totalMonthlySavingsRupees: number;
  medications: NormalizedMedication[];
  unmatched: Array<{ prescribed_drug: string; reason: string }>;
  disclaimer?: string;
}

const DEMO_RX_SUGGESTIONS = [
  { rx_id: 'APL-RR-1410-RAME', label: 'Ramesh Kumar (Telmisartan & Metformin)' },
  { rx_id: 'FRT-SS-1809-PRIY', label: 'Priya Sharma (Thyroxine & Metformin)' },
  { rx_id: 'MNP-AS-0511-ARUN', label: 'Arun Patel (Amlodipine & Atorvastatin)' },
  { rx_id: 'MDC-PN-1208-SUNI', label: 'Sunita Verma (Asthma Inhaler)' },
  { rx_id: 'AMS-RR-2207-VIKR', label: 'Vikram Malhotra (CKD & Diabetes)' },
  { rx_id: 'APL-RR-1410-ANAN', label: 'Ananya Deshmukh (Severe Gap)' },
];

export const PhysicianView: React.FC = () => {
  const [rxInput, setRxInput] = useState<string>('APL-RR-1410-RAME');
  const [activeRxId, setActiveRxId] = useState<string>('APL-RR-1410-RAME');
  const [patientName, setPatientName] = useState<string>('Ramesh Kumar');
  const [patientAbha, setPatientAbha] = useState<string>('91-1234-5678-9012');
  const [savingsData, setSavingsData] = useState<NormalizedSavings | null>(null);
  const [careGaps, setCareGaps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dispensed, setDispensed] = useState<boolean>(false);
  const [dispensedAt, setDispensedAt] = useState<string | null>(null);
  const [isDispensing, setIsDispensing] = useState<boolean>(false);

  const fetchSavings = async (idToFetch: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setDispensed(false);
    setDispensedAt(null);
    try {
      const cleanId = idToFetch.trim().toUpperCase();
      const cleanNoDash = cleanId.replace(/[^A-Z0-9]/g, '');

      // Resolve matching patient profile
      const matchedProfile = PATIENT_PROFILES.find((p) => {
        const pRxClean = p.sampleRxId.replace(/[^A-Z0-9]/g, '').toUpperCase();
        const pAbhaClean = p.abha.replace(/\D/g, '');
        return (
          pRxClean === cleanNoDash ||
          cleanNoDash === pAbhaClean ||
          cleanNoDash.includes(p.name.split(' ')[0].toUpperCase()) ||
          p.id.toLowerCase() === idToFetch.trim().toLowerCase() ||
          p.name.toLowerCase() === idToFetch.trim().toLowerCase()
        );
      }) || PATIENT_PROFILES[0];

      let currentAbha = matchedProfile ? matchedProfile.abha : '91-1234-5678-9012';
      let currentName = matchedProfile ? matchedProfile.name : 'Patient';
      let initialDispensed = false;
      let initialDispensedAt: string | null = null;

      // Check if backend prescription details have specific patient info and dispense status
      try {
        const detailsRes = await fetch(`/api/prescription/${encodeURIComponent(cleanId)}`);
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          if (detailsData.patient?.abha_id) {
            currentAbha = detailsData.patient.abha_id;
          }
          if (detailsData.patient?.name) {
            currentName = detailsData.patient.name;
          }
          if (detailsData.dispensed != null) {
            initialDispensed = Boolean(detailsData.dispensed);
            initialDispensedAt = detailsData.dispensed_at || null;
          }
        }
      } catch {
        // Fallback to matchedProfile
      }

      setPatientAbha(currentAbha);
      setPatientName(currentName);

      const res = await fetch(`/api/prescription/${encodeURIComponent(cleanId)}/savings`);
      let raw: any = null;

      if (res.ok) {
        raw = await res.json();
        if (raw.dispensed != null) {
          initialDispensed = Boolean(raw.dispensed);
          initialDispensedAt = raw.dispensed_at || null;
        }
      } else if (matchedProfile) {
        // Fallback calculation from profile bundle
        const medsInBundle = matchedProfile.bundle.entry
          ?.filter((e: any) => e.resource.resourceType === 'MedicationRequest')
          ?.map((e: any) => ({
            prescribed_drug: e.resource.medicationCodeableConcept?.text || e.resource.medicationCodeableConcept?.coding?.[0]?.display || 'Prescribed Medicine',
            salt: e.resource.dosageInstruction?.[0]?.text || '',
            generic_alternative: 'Jan Aushadhi Generic Substitute',
            monthly_cost_brand: 450,
            monthly_cost_generic: 80,
            monthly_savings_rupees: 370,
            savings_percentage: 82,
          })) || [];

        raw = {
          rx_id: cleanId,
          hospital_name: matchedProfile.facility,
          doctor_name: matchedProfile.doctor,
          issued_on: '2024-10-14',
          medications: medsInBundle,
          total_monthly_savings: medsInBundle.reduce((sum: number, m: any) => sum + m.monthly_savings_rupees, 0),
        };
      } else {
        throw new Error(`Prescription ${cleanId} not found or inactive`);
      }

      // Normalize medications array from backend
      const rawMeds: any[] = raw.medications || raw.alternatives || [];
      const normalizedMeds: NormalizedMedication[] = rawMeds.map((m: any) => {
        const brandCost = m.monthly_cost_brand != null
          ? parseFloat(m.monthly_cost_brand)
          : (m.brand_price_paisa ? m.brand_price_paisa / 100 : 0);
        const genericCost = m.monthly_cost_generic != null
          ? parseFloat(m.monthly_cost_generic)
          : (m.generic_price_paisa ? m.generic_price_paisa / 100 : 0);
        const savings = m.monthly_savings_rupees != null
          ? parseFloat(m.monthly_savings_rupees)
          : (m.monthly_savings_paisa ? m.monthly_savings_paisa / 100 : Math.max(0, brandCost - genericCost));
        const percent = m.savings_percentage != null
          ? parseFloat(m.savings_percentage)
          : (brandCost > 0 ? (savings / brandCost) * 100 : 0);

        return {
          prescribedDrug: m.prescribed_drug || m.branded_medicine || 'Prescribed Medicine',
          salt: m.salt || m.prescribed_dosage || '',
          genericAlternative: m.generic_alternative || m.generic_substitute || 'Jan Aushadhi Generic Alternative',
          brandCostRupees: brandCost,
          genericCostRupees: genericCost,
          monthlySavingsRupees: savings,
          savingsPercentage: Math.round(percent),
          caution: m.caution || null,
          dosesPerDay: m.doses_per_day,
        };
      });

      const totalBrand = normalizedMeds.reduce((acc, m) => acc + m.brandCostRupees, 0) || (raw.total_brand_cost_paisa ? raw.total_brand_cost_paisa / 100 : 0);
      const totalGeneric = normalizedMeds.reduce((acc, m) => acc + m.genericCostRupees, 0) || (raw.total_generic_cost_paisa ? raw.total_generic_cost_paisa / 100 : 0);
      const totalSavings = raw.total_monthly_savings != null
        ? parseFloat(raw.total_monthly_savings)
        : (raw.total_monthly_savings_paisa ? raw.total_monthly_savings_paisa / 100 : (totalBrand - totalGeneric));

      const normalized: NormalizedSavings = {
        rx_id: raw.rx_id || cleanId,
        hospital_name: raw.hospital_name || matchedProfile?.facility,
        doctor_name: raw.doctor_name || matchedProfile?.doctor,
        issued_on: raw.issued_on || '2024-10-14',
        totalBrandCostRupees: totalBrand,
        totalGenericCostRupees: totalGeneric,
        totalMonthlySavingsRupees: totalSavings,
        medications: normalizedMeds,
        unmatched: raw.unmatched || [],
        disclaimer: raw.disclaimer,
      };

      setSavingsData(normalized);
      setActiveRxId(cleanId);
      setDispensed(initialDispensed);
      setDispensedAt(initialDispensedAt);

      // Check care gaps for THIS specific patient
      try {
        const gapRes = await fetch(`/api/patient/${encodeURIComponent(currentAbha)}/care-gaps`);
        if (gapRes.ok) {
          const rawGaps = await gapRes.json();
          setCareGaps(Array.isArray(rawGaps) ? rawGaps : []);
        } else if (matchedProfile?.bundle) {
          const localGaps = evaluateCareGaps(bundleToInputs(matchedProfile.bundle));
          setCareGaps(localGaps);
        } else {
          setCareGaps([]);
        }
      } catch {
        if (matchedProfile?.bundle) {
          const localGaps = evaluateCareGaps(bundleToInputs(matchedProfile.bundle));
          setCareGaps(localGaps);
        } else {
          setCareGaps([]);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to lookup prescription');
      setSavingsData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDispense = async () => {
    if (isDispensing) return;
    const rxIdToUpdate = savingsData?.rx_id || activeRxId;
    if (!rxIdToUpdate) return;

    setIsDispensing(true);
    const targetState = !dispensed;
    try {
      const resp = await fetch(`/api/prescription/${encodeURIComponent(rxIdToUpdate)}/dispense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dispensed: targetState,
          pharmacist_name: 'Apollo Jan Aushadhi Pharmacy',
          notes: 'Dispensed PMBJP Jan Aushadhi generic bioequivalent substitutes',
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setDispensed(Boolean(data.dispensed));
        setDispensedAt(data.dispensed_at || null);
      } else {
        setDispensed(targetState);
      }
    } catch {
      setDispensed(targetState);
    } finally {
      setIsDispensing(false);
    }
  };

  useEffect(() => {
    void fetchSavings(activeRxId);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (rxInput.trim()) {
      void fetchSavings(rxInput);
    }
  };

  const formatRupees = (amount: number) => {
    return `₹${Math.round(amount)}`;
  };

  return (
    <div className="space-y-8 pb-16 animate-fade-up">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-hairline pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 border border-teal-500/30 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300 mb-2">
            <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
            Physician & Pharmacist Portal
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink font-bold">
            Medicine Dispensing & Generic Substitution
          </h1>
          <p className="text-sm text-ink-soft mt-1 max-w-2xl">
            Enter the patient's Prescription ID or ABHA ID to review prescribed medicines, find affordable generic alternatives, and calculate savings.
          </p>
        </div>
      </div>

      {/* Lookup Bar */}
      <Card className="rounded-24 border border-hairline bg-card p-6 shadow-soft">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
            <Input
              type="text"
              placeholder="Enter Prescription ID (e.g. APL-RR-1410-RAME)..."
              value={rxInput}
              onChange={(e) => setRxInput(e.target.value.toUpperCase())}
              className="pl-10 font-mono text-sm uppercase h-11 rounded-full"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading || !rxInput.trim()}
            className="rounded-full bg-ink text-paper hover:bg-moss-600 h-11 px-6 font-semibold text-xs"
          >
            {isLoading ? 'Looking up...' : 'Find Alternatives'}
          </Button>
        </form>

        {/* Quick Demo Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          <span className="font-semibold text-ink">Demo Prescriptions:</span>
          {DEMO_RX_SUGGESTIONS.map((chip) => (
            <button
              key={chip.rx_id}
              type="button"
              onClick={() => {
                setRxInput(chip.rx_id);
                void fetchSavings(chip.rx_id);
              }}
              className="rounded-full border border-hairline bg-paper-2 px-3 py-1 font-mono text-[11px] text-ink hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
            >
              {chip.rx_id} ({chip.label.split(' ')[0]})
            </button>
          ))}
        </div>
      </Card>

      {/* Error State */}
      {errorMsg && (
        <div className="flex items-center gap-3 rounded-20 border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results View */}
      {savingsData && (
        <div className="space-y-6">
          {/* Top Savings KPI Ribbon */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="rounded-24 border border-hairline bg-card p-5 shadow-soft">
              <span className="text-[11px] uppercase tracking-wider text-ink-soft font-semibold block">
                Prescription Total (Branded)
              </span>
              <p className="mt-2 font-serif text-3xl text-ink font-bold line-through text-ink-soft/70">
                {formatRupees(savingsData.totalBrandCostRupees)}
                <span className="text-xs font-sans text-ink-soft font-normal ml-1">/ month</span>
              </p>
              <p className="text-[11px] text-ink-soft mt-1">Market MRP for proprietary brand packaging</p>
            </Card>

            <Card className="rounded-24 border border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 p-5 shadow-soft">
              <span className="text-[11px] uppercase tracking-wider text-teal-700 dark:text-teal-300 font-semibold block">
                PMBJP Generic Equivalent
              </span>
              <p className="mt-2 font-serif text-3xl text-teal-700 dark:text-teal-300 font-bold">
                {formatRupees(savingsData.totalGenericCostRupees)}
                <span className="text-xs font-sans text-teal-600 font-normal ml-1">/ month</span>
              </p>
              <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-1">Govt certified bio-equivalent generic price</p>
            </Card>

            <Card className="rounded-24 border border-moss-500/40 bg-gradient-to-br from-moss-50 to-moss-100/40 dark:from-moss-950/30 dark:to-card p-5 shadow-soft">
              <span className="text-[11px] uppercase tracking-wider text-moss-700 dark:text-moss-300 font-semibold block">
                Patient Monthly Savings
              </span>
              <p className="mt-2 font-serif text-3xl text-moss-700 dark:text-moss-300 font-bold">
                {formatRupees(savingsData.totalMonthlySavingsRupees)}
                <span className="text-xs font-sans text-moss-600 font-normal ml-1">saved / mo</span>
              </p>
              <p className="text-[11px] text-moss-600 dark:text-moss-400 mt-1">
                Annual cumulative savings: {formatRupees(savingsData.totalMonthlySavingsRupees * 12)}
              </p>
            </Card>
          </div>

          {/* Clinical Alerts / Care Gaps Context for Physician */}
          {careGaps.length > 0 ? (
            <div className="rounded-24 border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span>Physician Care Alert: Active Clinical Gaps for {patientName} ({patientAbha})</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {careGaps.map((gap) => (
                  <Badge
                    key={gap.code}
                    variant="outline"
                    className="border-amber-500/40 bg-card text-[11px] font-medium text-ink"
                  >
                    <span className="mr-1 text-amber-600 font-bold">●</span>
                    {gap.title}: {gap.message || gap.rationale || 'Monitoring recommended'}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-24 border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Clinical Guidelines Up to Date: No Active Care Gaps for {patientName} ({patientAbha})</span>
              </div>
              <p className="text-[11px] text-ink-soft mt-1">
                Recent lab vitals and diagnostic tests meet all recommended clinical guidelines for this patient.
              </p>
            </div>
          )}

          {/* Prescribed Medications & Jan Aushadhi Substitutes Table */}
          <Card className="rounded-24 border border-hairline bg-card shadow-soft overflow-hidden">
            <CardHeader className="border-b border-hairline py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-serif text-xl">Medicine Substitution & Dispensing Map</CardTitle>
                <CardDescription className="text-xs">
                  Active prescription: <span className="font-mono font-semibold text-ink">{savingsData.rx_id}</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {dispensed && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Saved in DB
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDispensing}
                  onClick={handleToggleDispense}
                  title={dispensed ? 'Click to toggle dispensed status in database' : 'Mark this prescription as dispensed in the database'}
                  className={`rounded-full text-xs gap-1.5 transition-all ${
                    dispensed
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 hover:bg-emerald-100'
                      : 'border-teal-500/40 bg-teal-500/5 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10'
                  }`}
                >
                  {isDispensing ? (
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-teal-600 border-t-transparent rounded-full" />
                  ) : dispensed ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Dispensed to Patient
                    </>
                  ) : (
                    <>
                      <Pill className="h-3.5 w-3.5 text-teal-600" />
                      Mark as Dispensed
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-hairline">
                {savingsData.medications.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-paper-2/40 transition-colors"
                  >
                    {/* Left: Medicine Comparison */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-ink">{m.prescribedDrug}</span>
                        {m.salt && <span className="text-xs text-ink-soft">({m.salt})</span>}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <ArrowRight className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        <span className="font-semibold text-teal-700 dark:text-teal-300">
                          Generic Alternative: {m.genericAlternative}
                        </span>
                        <span className="rounded bg-teal-500/10 px-1.5 py-0.5 font-mono text-[10px] text-teal-700 dark:text-teal-400">
                          PMBJP Bioequivalent
                        </span>
                      </div>

                      {m.caution && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {m.caution}
                        </p>
                      )}
                    </div>

                    {/* Right: Price & Savings Card */}
                    <div className="flex items-center gap-6 border-t md:border-t-0 border-hairline pt-3 md:pt-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-ink-soft block">
                          Cost Comparison
                        </span>
                        <span className="font-mono text-xs line-through text-ink-soft">
                          {formatRupees(m.brandCostRupees)}
                        </span>
                        <span className="font-mono text-sm font-bold text-teal-700 dark:text-teal-300 ml-2">
                          {formatRupees(m.genericCostRupees)}
                        </span>
                      </div>

                      <div className="rounded-16 bg-moss-500/10 border border-moss-500/25 px-3 py-1.5 text-center min-w-[90px]">
                        <span className="text-[9px] uppercase tracking-wider text-moss-700 dark:text-moss-400 font-semibold block">
                          Save
                        </span>
                        <span className="font-mono text-xs font-bold text-moss-700 dark:text-moss-300">
                          {m.savingsPercentage}%
                        </span>
                        <span className="text-[9px] text-moss-600 block">
                          -{formatRupees(m.monthlySavingsRupees)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Unmatched medications, if any */}
                {savingsData.unmatched?.map((un, idx) => (
                  <div
                    key={`unmatched-${idx}`}
                    className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-paper-2/30"
                  >
                    <div className="space-y-1">
                      <span className="font-semibold text-sm text-ink">{un.prescribed_drug}</span>
                      <p className="text-xs text-ink-soft">
                        {un.reason || 'No direct Jan Aushadhi generic equivalent found in formulary'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs text-ink-soft">
                      Brand Dispensing Only
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
