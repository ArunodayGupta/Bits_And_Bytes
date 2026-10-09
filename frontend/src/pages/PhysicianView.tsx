import React, { useState, useEffect } from 'react';
import { Pill, Search, ShieldAlert, Sparkles, TrendingDown, ArrowRight, CheckCircle2, AlertCircle, Building2, User, FileText, Printer, Stethoscope } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface AlternativeItem {
  branded_medicine: string;
  prescribed_dosage: string;
  generic_substitute: string;
  pmbjp_product_code: string;
  brand_price_paisa: number;
  generic_price_paisa: number;
  monthly_savings_paisa: number;
  notes: string;
}

interface SavingsData {
  rx_id: string;
  hospital_name?: string;
  doctor_name?: string;
  issued_on?: string;
  total_brand_cost_paisa: number;
  total_generic_cost_paisa: number;
  total_monthly_savings_paisa: number;
  alternatives: AlternativeItem[];
  care_gaps?: Array<{ code: string; title: string; rationale: string; severity: string }>;
}

const DEMO_RX_SUGGESTIONS = [
  { rx_id: 'APL-RR-1410-RAME', label: 'Ramesh Kumar (Metformin & Atorvastatin)' },
  { rx_id: 'MAX-SD-1808-PRIY', label: 'Priya Sharma (Thyroxine & Multivitamin)' },
  { rx_id: 'FOR-AK-0511-ARUN', label: 'Arun Patel (Telmisartan & Amlodipine)' },
];

export const PhysicianView: React.FC = () => {
  const [rxInput, setRxInput] = useState<string>('APL-RR-1410-RAME');
  const [activeRxId, setActiveRxId] = useState<string>('APL-RR-1410-RAME');
  const [savingsData, setSavingsData] = useState<SavingsData | null>(null);
  const [careGaps, setCareGaps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dispensed, setDispensed] = useState<boolean>(false);

  const fetchSavings = async (idToFetch: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setDispensed(false);
    try {
      const cleanId = idToFetch.trim().toUpperCase();
      const res = await fetch(`/api/prescription/${encodeURIComponent(cleanId)}/savings`);
      if (!res.ok) {
        throw new Error(`Prescription ${cleanId} not found or inactive`);
      }
      const data: SavingsData = await res.json();
      setSavingsData(data);
      setActiveRxId(cleanId);

      // Also check care gaps for the patient if abha is known or from demo
      try {
        const gapRes = await fetch('/api/patient/91-1234-5678-9012/care-gaps');
        if (gapRes.ok) {
          setCareGaps(await gapRes.json());
        }
      } catch {
        // ignore
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to lookup prescription');
      setSavingsData(null);
    } finally {
      setIsLoading(false);
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

  const formatRupees = (paisa: number) => {
    return `₹${(paisa / 100).toFixed(0)}`;
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
            Input the patient's speakable Rx-ID to inspect prescribed medications, identify Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) generic alternatives, and calculate patient savings.
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
              placeholder="Enter speakable Rx-ID (e.g. APL-RR-1410-RAME)..."
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
                {formatRupees(savingsData.total_brand_cost_paisa)}
                <span className="text-xs font-sans text-ink-soft font-normal ml-1">/ month</span>
              </p>
              <p className="text-[11px] text-ink-soft mt-1">Market MRP for proprietary brand packaging</p>
            </Card>

            <Card className="rounded-24 border border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 p-5 shadow-soft">
              <span className="text-[11px] uppercase tracking-wider text-teal-700 dark:text-teal-300 font-semibold block">
                PMBJP Generic Equivalent
              </span>
              <p className="mt-2 font-serif text-3xl text-teal-700 dark:text-teal-300 font-bold">
                {formatRupees(savingsData.total_generic_cost_paisa)}
                <span className="text-xs font-sans text-teal-600 font-normal ml-1">/ month</span>
              </p>
              <p className="text-[11px] text-teal-600 dark:text-teal-400 mt-1">Govt certified bio-equivalent generic price</p>
            </Card>

            <Card className="rounded-24 border border-moss-500/40 bg-gradient-to-br from-moss-50 to-moss-100/40 dark:from-moss-950/30 dark:to-card p-5 shadow-soft">
              <span className="text-[11px] uppercase tracking-wider text-moss-700 dark:text-moss-300 font-semibold block">
                Patient Monthly Savings
              </span>
              <p className="mt-2 font-serif text-3xl text-moss-700 dark:text-moss-300 font-bold">
                {formatRupees(savingsData.total_monthly_savings_paisa)}
                <span className="text-xs font-sans text-moss-600 font-normal ml-1">saved / mo</span>
              </p>
              <p className="text-[11px] text-moss-600 dark:text-moss-400 mt-1">
                Annual cumulative savings: {formatRupees(savingsData.total_monthly_savings_paisa * 12)}
              </p>
            </Card>
          </div>

          {/* Clinical Alerts / Care Gaps Context for Physician */}
          {careGaps.length > 0 && (
            <div className="rounded-24 border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span>Physician Care Alert: Active Clinical Gaps for this Patient</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {careGaps.map((gap) => (
                  <Badge
                    key={gap.code}
                    variant="outline"
                    className="border-amber-500/40 bg-card text-[11px] font-medium text-ink"
                  >
                    <span className="mr-1 text-amber-600 font-bold">●</span>
                    {gap.title}: {gap.rationale}
                  </Badge>
                ))}
              </div>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDispensed(true)}
                className={`rounded-full text-xs gap-1.5 ${
                  dispensed
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30'
                    : 'border-hairline hover:bg-paper-2'
                }`}
              >
                {dispensed ? (
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
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-hairline">
                {savingsData.alternatives.map((alt, idx) => {
                  const savingsPercent = Math.round(
                    (alt.monthly_savings_paisa / alt.brand_price_paisa) * 100
                  );
                  return (
                    <div
                      key={idx}
                      className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-paper-2/40 transition-colors"
                    >
                      {/* Left: Medicine Comparison */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-ink">{alt.branded_medicine}</span>
                          <span className="text-xs text-ink-soft">({alt.prescribed_dosage})</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <ArrowRight className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          <span className="font-semibold text-teal-700 dark:text-teal-300">
                            Generic Alternative: {alt.generic_substitute}
                          </span>
                          <span className="rounded bg-teal-500/10 px-1.5 py-0.5 font-mono text-[10px] text-teal-700 dark:text-teal-400">
                            PMBJP #{alt.pmbjp_product_code}
                          </span>
                        </div>

                        <p className="text-[11px] text-ink-soft">{alt.notes}</p>
                      </div>

                      {/* Right: Price & Savings Card */}
                      <div className="flex items-center gap-6 border-t md:border-t-0 border-hairline pt-3 md:pt-0">
                        <div className="text-right">
                          <span className="text-[10px] uppercase tracking-wider text-ink-soft block">
                            Cost Comparison
                          </span>
                          <span className="font-mono text-xs line-through text-ink-soft">
                            {formatRupees(alt.brand_price_paisa)}
                          </span>
                          <span className="font-mono text-sm font-bold text-teal-700 dark:text-teal-300 ml-2">
                            {formatRupees(alt.generic_price_paisa)}
                          </span>
                        </div>

                        <div className="rounded-16 bg-moss-500/10 border border-moss-500/25 px-3 py-1.5 text-center min-w-[90px]">
                          <span className="text-[9px] uppercase tracking-wider text-moss-700 dark:text-moss-400 font-semibold block">
                            Save
                          </span>
                          <span className="font-mono text-xs font-bold text-moss-700 dark:text-moss-300">
                            {savingsPercent}%
                          </span>
                          <span className="text-[9px] text-moss-600 block">
                            -{formatRupees(alt.monthly_savings_paisa)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
