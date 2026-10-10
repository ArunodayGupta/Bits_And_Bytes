import React, { useState, useEffect } from 'react';
import { Stethoscope, Plus, User, FileText, CheckCircle2, AlertCircle, Calendar, Building2, Pill, Activity, ArrowRight, Loader2, Search, HeartPulse, Share2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PATIENT_PROFILES } from '@/data/patients';

interface MedicationRow {
  name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions: string;
}

const COMMON_MEDICATIONS = [
  'Metformin Hydrochloride',
  'Atorvastatin Calcium',
  'Telmisartan',
  'Amlodipine Besylate',
  'Glimepiride',
  'Levothyroxine Sodium',
  'Pantoprazole',
  'Paracetamol',
];

export const DoctorView: React.FC = () => {
  const { userName, medicalRegNumber, hospitalAffiliation } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'lookup'>('create');

  // Creation State
  const [patientAbha, setPatientAbha] = useState<string>('91-1234-5678-9012');
  const [doctorName, setDoctorName] = useState<string>(userName || 'Dr. Rajesh Rao, MD');
  const [hospitalName, setHospitalName] = useState<string>(hospitalAffiliation || 'Apollo Hospitals, New Delhi');
  const [diagnosis, setDiagnosis] = useState<string>('Essential Hypertension & Type 2 Diabetes');
  const [medications, setMedications] = useState<MedicationRow[]>([
    {
      name: 'Telmisartan',
      dosage: '40 mg',
      frequency: 'Once daily (morning)',
      duration_days: 30,
      instructions: 'Take after breakfast. Monitor BP weekly.',
    },
    {
      name: 'Metformin Hydrochloride',
      dosage: '500 mg',
      frequency: 'Twice daily with meals',
      duration_days: 30,
      instructions: 'Take with morning and evening meals.',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdRx, setCreatedRx] = useState<any | null>(null);

  // Lookup State
  const [lookupAbha, setLookupAbha] = useState<string>('APL-RR-1410-RAME');
  const [patientDetails, setPatientDetails] = useState<any | null>(null);
  const [activePrescription, setActivePrescription] = useState<any | null>(null);
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string | null>(null);


  // Demo Patients
  const [demoPatients, setDemoPatients] = useState<any[]>([]);

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await fetch('/api/demo/patients');
        if (res.ok) {
          const data = await res.json();
          setDemoPatients(data);
        }
      } catch {
        // ignore
      }
    }
    void loadPatients();
  }, []);

  const addMedicationRow = () => {
    setMedications([
      ...medications,
      {
        name: '',
        dosage: '1 tablet',
        frequency: 'Once daily',
        duration_days: 30,
        instructions: 'Take as directed',
      },
    ]);
  };

  const removeMedicationRow = (idx: number) => {
    setMedications(medications.filter((_, i) => i !== idx));
  };

  const updateMedication = (idx: number, field: keyof MedicationRow, value: any) => {
    const updated = [...medications];
    updated[idx] = { ...updated[idx], [field]: value };
    setMedications(updated);
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCreatedRx(null);
    try {
      const payload = {
        abha_id: patientAbha,
        doctor_name: doctorName,
        hospital_name: hospitalName,
        diagnosis,
        medications,
      };

      const res = await fetch('/api/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to create prescription');
      }

      const data = await res.json();
      setCreatedRx(data);
    } catch (err: any) {
      alert(err.message || 'Error creating prescription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookupPatient = async (queryToFetch: string) => {
    setIsLookingUp(true);
    setLookupError(null);
    setActivePrescription(null);
    const cleanQuery = queryToFetch.trim();

    try {
      // 1. Check if input is a prescription code (e.g. APL-RR-1410-RAME or starts with APL/RX/HS)
      let rxData: any = null;
      const isRxCode =
        cleanQuery.toUpperCase().startsWith('APL-') ||
        cleanQuery.toUpperCase().startsWith('RX') ||
        cleanQuery.toUpperCase().startsWith('HS-') ||
        (!cleanQuery.match(/^91-\d{4}-\d{4}-\d{4}$/) && cleanQuery.includes('-'));

      if (isRxCode) {
        try {
          const rxRes = await fetch(`/api/prescription/${encodeURIComponent(cleanQuery.toUpperCase())}`);
          if (rxRes.ok) {
            rxData = await rxRes.json();
            setActivePrescription(rxData);
          }
        } catch {
          // Continue to patient lookup
        }
      }

      // Determine the ABHA to query
      let targetAbha = cleanQuery;
      if (rxData?.patient?.abha_id) {
        targetAbha = rxData.patient.abha_id;
      } else if (cleanQuery.toUpperCase().includes('APLRR1410RAME') || cleanQuery.toUpperCase().includes('APL-RR-1410-RAME')) {
        targetAbha = '91-1234-5678-9012'; // Ramesh Kumar
      } else if (cleanQuery.toLowerCase() === 'ramesh kumar' || cleanQuery.toLowerCase() === 'ramesh-kumar') {
        targetAbha = '91-1234-5678-9012';
      } else if (cleanQuery.toLowerCase() === 'priya sharma' || cleanQuery.toLowerCase() === 'priya-sharma') {
        targetAbha = '91-2345-6789-0123';
      } else if (cleanQuery.toLowerCase() === 'arun patel' || cleanQuery.toLowerCase() === 'arun-patel') {
        targetAbha = '91-3456-7890-1234';
      }

      // Fetch patient details from backend
      let patientData: any = null;
      try {
        const res = await fetch(`/api/patient/${encodeURIComponent(targetAbha)}/details`);
        if (res.ok) {
          patientData = await res.json();
        }
      } catch {
        // Fallback below
      }

      // Robust fallback from PATIENT_PROFILES
      if (!patientData) {
        const cleanTarget = targetAbha.replace(/\D/g, '');
        const profile = PATIENT_PROFILES.find(
          (p) =>
            (cleanTarget.length > 0 && p.abha.replace(/\D/g, '') === cleanTarget) ||
            p.id === targetAbha.toLowerCase() ||
            p.name.toLowerCase() === targetAbha.toLowerCase()
        ) || (targetAbha.includes('1234') || targetAbha.includes('RAME') ? PATIENT_PROFILES[0] : null);

        if (profile) {
          const bundle = profile.bundle;
          const conditions =
            bundle.entry
              ?.filter((e: any) => e.resource.resourceType === 'Condition')
              ?.map((e: any) => ({
                summary_title: e.resource.code?.text || e.resource.code?.coding?.[0]?.display || 'Condition',
                event_date: e.resource.recordedDate || e.resource.onsetDateTime || '2023-01-10T10:00:00Z',
              })) || [];

          const observations =
            bundle.entry
              ?.filter((e: any) => e.resource.resourceType === 'Observation')
              ?.map((e: any) => ({
                summary_title: e.resource.code?.text || e.resource.code?.coding?.[0]?.display || 'Observation',
                event_date: e.resource.effectiveDateTime || '2024-04-10T09:00:00Z',
              })) || [];

          const prescriptions = [
            {
              rx_id: 'APL-RR-1410-RAME',
              doctor_name: 'Dr. Rajesh Rao',
              hospital_name: 'Apollo Hospital',
              issued_on: '2024-10-14',
            },
          ];

          patientData = {
            patient: {
              name: profile.name,
              abha_id: profile.abha,
              gender:
                profile.bundle.entry?.find((e: any) => e.resource.resourceType === 'Patient')?.resource?.gender ||
                'male',
              dob:
                profile.bundle.entry?.find((e: any) => e.resource.resourceType === 'Patient')?.resource?.birthDate ||
                '1970-05-15',
            },
            conditions,
            observations,
            prescriptions,
          };
        }
      }

      if (patientData) {
        setPatientDetails(patientData);
      } else if (rxData) {
        setPatientDetails({
          patient: {
            name: rxData.patient?.name || 'Verified Patient',
            abha_id: rxData.patient?.abha_id || cleanQuery,
            gender: rxData.patient?.gender || 'male',
            dob: rxData.patient?.dob || 'Not specified',
          },
          conditions: [],
          observations: [],
          prescriptions: [
            {
              rx_id: rxData.rx_id,
              doctor_name: rxData.doctor_name,
              hospital_name: rxData.hospital_name,
              issued_on: rxData.issued_on || '2024-10-14',
            },
          ],
        });
      } else {
        throw new Error(
          `No records found for "${cleanQuery}". You can search using prescription code "APL-RR-1410-RAME" or ABHA ID "91-1234-5678-9012".`
        );
      }
    } catch (err: any) {
      setLookupError(err.message);
      setPatientDetails(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'lookup') {
      void handleLookupPatient(lookupAbha);
    }
  }, [activeTab]);


  return (
    <div className="space-y-8 pb-16 animate-fade-up">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-hairline pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/30 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
              <Stethoscope className="h-3.5 w-3.5 text-sky-600" />
              Doctor Clinical Portal
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              NMC Verified · {medicalRegNumber || 'MCI-2018-98421'}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-ink font-bold">
            Electronic Prescriptions & Patient History
          </h1>
          <p className="text-sm text-ink-soft mt-1 max-w-2xl">
            Write electronic prescriptions or look up patient medical history, chronic conditions, and past lab vitals.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center rounded-full bg-paper-2 p-1 border border-hairline shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'create'
                ? 'bg-card text-ink shadow-sm'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-sky-600" />
            <span>Add Prescription</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lookup')}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'lookup'
                ? 'bg-card text-ink shadow-sm'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Search className="h-3.5 w-3.5 text-sky-600" />
            <span>Find Patient Details</span>
          </button>
        </div>
      </div>

      {/* MODE 1: Add Electronic Prescription */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {createdRx ? (
            <Card className="rounded-28 border border-emerald-500/40 bg-card p-6 shadow-elevated">
              <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400 font-semibold mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <span className="text-lg">Prescription Successfully Issued & Synced to Database</span>
              </div>

              {/* Prescription Code Badge */}
              <div className="rounded-24 border border-moss-500/30 bg-moss-50/60 dark:bg-moss-950/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wider text-ink-soft font-semibold block">
                    Prescription Code (Share with Patient)
                  </span>
                  <p className="font-mono text-3xl font-bold tracking-wider text-moss-700 dark:text-moss-300 mt-1">
                    {createdRx.rx_id}
                  </p>
                  <p className="text-xs text-ink-soft mt-1">
                    Patient: <strong className="text-ink">{createdRx.patient_name}</strong> · ABHA: <span className="font-mono">{createdRx.abha_id}</span>
                  </p>
                </div>

                <Button
                  onClick={() => setCreatedRx(null)}
                  className="rounded-full bg-ink text-paper hover:bg-moss-600 px-5 text-xs font-semibold"
                >
                  Create Another Prescription
                </Button>
              </div>

              {/* Prescription Items List */}
              <div className="mt-6 border-t border-hairline pt-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Prescribed Medications ({createdRx.medications?.length || 0})
                </h4>
                <div className="divide-y divide-hairline">
                  {createdRx.medications?.map((m: any, i: number) => (
                    <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-ink">{m.name}</span>
                        <span className="text-ink-soft ml-2">({m.dosage})</span>
                        <p className="text-[11px] text-ink-soft">{m.frequency} · {m.instructions}</p>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {m.duration_days} days
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="rounded-28 border border-hairline bg-card p-6 shadow-soft">
              <CardHeader className="p-0 pb-6 border-b border-hairline">
                <CardTitle className="font-serif text-2xl">Create Electronic Prescription</CardTitle>
                <CardDescription className="text-xs">
                  Issue digital prescription records with generic medicine matching and care reminders.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleCreatePrescription} className="pt-6 space-y-6">
                {/* Doctor and Patient Meta */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold text-ink-soft block mb-1">
                      Patient (ABHA ID)
                    </label>
                    <select
                      value={patientAbha}
                      onChange={(e) => setPatientAbha(e.target.value)}
                      className="w-full h-10 rounded-xl border border-hairline bg-paper-2 px-3 text-xs font-mono text-ink focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    >
                      {demoPatients.map((p) => (
                        <option key={p.abha_id} value={p.abha_id}>
                          {p.display_name} ({p.abha_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-ink-soft block mb-1">
                      Prescribing Doctor
                    </label>
                    <Input
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-ink-soft block mb-1">
                      Hospital / Clinic
                    </label>
                    <Input
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink-soft block mb-1">
                    Clinical Diagnosis & Notes
                  </label>
                  <Input
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Essential Hypertension, Type 2 Diabetes..."
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                {/* Medication Items List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink">
                      Medication Items
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMedicationRow}
                      className="rounded-full text-xs gap-1 border-hairline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Medicine
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {medications.map((med, idx) => (
                      <div
                        key={idx}
                        className="rounded-20 border border-hairline bg-paper-2/60 p-4 space-y-3"
                      >
                        <div className="grid gap-3 sm:grid-cols-12">
                          <div className="sm:col-span-5">
                            <label className="text-[11px] text-ink-soft block mb-1">Medicine Name</label>
                            <Input
                              value={med.name}
                              onChange={(e) => updateMedication(idx, 'name', e.target.value)}
                              placeholder="Drug name..."
                              className="h-9 text-xs rounded-lg bg-card"
                            />
                            {/* Autocomplete suggestion chips */}
                            <div className="mt-1 flex flex-wrap gap-1">
                              {COMMON_MEDICATIONS.slice(0, 3).map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => updateMedication(idx, 'name', m)}
                                  className="text-[10px] text-sky-700 hover:underline"
                                >
                                  +{m.split(' ')[0]}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="text-[11px] text-ink-soft block mb-1">Dosage</label>
                            <Input
                              value={med.dosage}
                              onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                              placeholder="e.g. 500 mg"
                              className="h-9 text-xs rounded-lg bg-card"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="text-[11px] text-ink-soft block mb-1">Frequency</label>
                            <Input
                              value={med.frequency}
                              onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                              placeholder="e.g. Twice daily"
                              className="h-9 text-xs rounded-lg bg-card"
                            />
                          </div>

                          <div className="sm:col-span-2 flex items-end">
                            <button
                              type="button"
                              onClick={() => removeMedicationRow(idx)}
                              disabled={medications.length === 1}
                              className="w-full h-9 rounded-lg border border-destructive/20 text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] text-ink-soft block mb-1">Instructions</label>
                          <Input
                            value={med.instructions}
                            onChange={(e) => updateMedication(idx, 'instructions', e.target.value)}
                            placeholder="Special usage instructions..."
                            className="h-9 text-xs rounded-lg bg-card"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-hairline flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting || medications.some((m) => !m.name.trim())}
                    className="rounded-full bg-sky-600 text-paper hover:bg-sky-700 px-6 h-11 text-xs font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generating Rx-ID...
                      </>
                    ) : (
                      <>
                        <Stethoscope className="h-4 w-4 mr-2" />
                        Issue Electronic Prescription
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* MODE 2: Find Patient Details & Full Clinical History */}
      {activeTab === 'lookup' && (
        <div className="space-y-6">
          {/* Lookup Input Card */}
          <Card className="rounded-24 border border-hairline bg-card p-5 sm:p-6 shadow-soft">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
                <Input
                  type="text"
                  placeholder="Enter Prescription Code (e.g. APL-RR-1410-RAME) or Patient ABHA ID..."
                  value={lookupAbha}
                  onChange={(e) => setLookupAbha(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleLookupPatient(lookupAbha);
                    }
                  }}
                  className="pl-10 font-mono text-xs sm:text-sm h-11 rounded-full"
                />
              </div>
              <Button
                type="button"
                onClick={() => handleLookupPatient(lookupAbha)}
                disabled={isLookingUp || !lookupAbha.trim()}
                className="rounded-full bg-ink text-paper hover:bg-moss-600 h-11 px-6 font-semibold text-xs shrink-0"
              >
                {isLookingUp ? 'Searching...' : 'Search Patient / Rx'}
              </Button>
            </div>

            {/* Quick Demo Code Selectors */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
              <span className="font-semibold text-ink">Quick Demo Codes:</span>
              <button
                type="button"
                onClick={() => {
                  setLookupAbha('APL-RR-1410-RAME');
                  void handleLookupPatient('APL-RR-1410-RAME');
                }}
                className="rounded-full border border-moss-500/40 bg-moss-50/80 dark:bg-moss-950/30 px-3 py-1 font-mono text-[11px] font-semibold text-moss-800 dark:text-moss-300 hover:bg-moss-100 transition-colors"
              >
                ★ APL-RR-1410-RAME (Prescription Code)
              </button>
              {demoPatients.map((p) => (
                <button
                  key={p.abha_id}
                  type="button"
                  onClick={() => {
                    setLookupAbha(p.abha_id);
                    void handleLookupPatient(p.abha_id);
                  }}
                  className="rounded-full border border-hairline bg-paper-2 px-3 py-1 font-mono text-[11px] text-ink hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
                >
                  {p.display_name} ({p.abha_id})
                </button>
              ))}
            </div>

            {lookupError && (
              <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{lookupError}</span>
              </div>
            )}
          </Card>

          {/* Details Results */}
          {patientDetails && (
            <div className="space-y-6">
              {/* If an active prescription code was looked up, show the verified prescription card */}
              {activePrescription && (
                <Card className="rounded-24 border border-moss-500/40 bg-moss-50/60 dark:bg-moss-950/20 p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-moss-600 text-paper">
                        <Pill className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-moss-700 dark:text-moss-400 font-semibold">
                          Shared Prescription Linked
                        </div>
                        <p className="font-mono text-xl font-bold text-ink">{activePrescription.rx_id}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-moss-500/40 bg-card text-moss-700 text-xs font-medium self-start sm:self-auto">
                      {activePrescription.hospital_name || 'Hospital'} · {activePrescription.doctor_name || 'Doctor'}
                    </Badge>
                  </div>

                  {activePrescription.medications?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-moss-500/20">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft block mb-2">
                        Prescribed Medication Items:
                      </span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {activePrescription.medications.map((m: any, idx: number) => (
                          <div key={idx} className="rounded-16 bg-card border border-hairline p-3 text-xs">
                            <p className="font-semibold text-ink">{m.name}</p>
                            <p className="text-[11px] text-ink-soft mt-0.5">{m.instructions}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Demographics Card */}
              <Card className="rounded-24 border border-hairline bg-card p-6 shadow-soft">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-600 font-serif text-xl text-white">
                      {patientDetails?.patient?.name?.substring(0, 2).toUpperCase() || 'PT'}
                    </div>

                    <div>
                      <h3 className="font-serif text-2xl font-bold text-ink">
                        {patientDetails?.patient?.name || 'Patient Record'}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-ink-soft font-mono mt-0.5">
                        <span>ABHA: {patientDetails?.patient?.abha_id || lookupAbha}</span>
                        <span>•</span>
                        <span>{(patientDetails?.patient?.gender || 'Unknown').toUpperCase()}</span>
                        <span>•</span>
                        <span>DOB: {patientDetails?.patient?.dob || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-700 text-xs font-semibold">
                    ABDM Verified Patient
                  </Badge>
                </div>

                {/* Patient Summary KPIs */}
                <div className="grid gap-4 sm:grid-cols-3 pt-4">
                  <div className="rounded-16 bg-paper-2 p-3 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold block">
                      Active Conditions
                    </span>
                    <span className="font-serif text-2xl font-bold text-ink">
                      {patientDetails.conditions?.length || 0}
                    </span>
                  </div>
                  <div className="rounded-16 bg-paper-2 p-3 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold block">
                      Recorded Observations
                    </span>
                    <span className="font-serif text-2xl font-bold text-ink">
                      {patientDetails.observations?.length || 0}
                    </span>
                  </div>
                  <div className="rounded-16 bg-paper-2 p-3 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-ink-soft font-semibold block">
                      Prescription History
                    </span>
                    <span className="font-serif text-2xl font-bold text-ink">
                      {patientDetails.prescriptions?.length || 0}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Conditions & Prescriptions Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Chronic Conditions */}
                <Card className="rounded-24 border border-hairline bg-card p-6 shadow-soft">
                  <div className="flex items-center gap-2 font-serif text-xl font-bold mb-4">
                    <HeartPulse className="h-5 w-5 text-rose-500" />
                    <span>Diagnosed Conditions</span>
                  </div>
                  <div className="space-y-2">
                    {patientDetails.conditions?.length > 0 ? (
                      patientDetails.conditions.map((c: any, i: number) => (
                        <div key={i} className="rounded-16 border border-hairline bg-paper-2/60 p-3 text-xs">
                          <p className="font-semibold text-ink">{c.summary_title}</p>
                          <p className="text-[11px] text-ink-soft mt-0.5">
                            Recorded on: {new Date(c.event_date || Date.now()).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-ink-soft">No active conditions recorded.</p>
                    )}
                  </div>
                </Card>

                {/* Prescriptions History */}
                <Card className="rounded-24 border border-hairline bg-card p-6 shadow-soft">
                  <div className="flex items-center gap-2 font-serif text-xl font-bold mb-4">
                    <FileText className="h-5 w-5 text-sky-500" />
                    <span>Past Prescriptions</span>
                  </div>
                  <div className="space-y-2">
                    {patientDetails.prescriptions?.length > 0 ? (
                      patientDetails.prescriptions.map((rx: any, i: number) => (
                        <div key={i} className="rounded-16 border border-hairline bg-paper-2/60 p-3 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-sky-700 dark:text-sky-300">
                              {rx.rx_id}
                            </span>
                            <p className="text-[11px] text-ink-soft mt-0.5">
                              {rx.doctor_name} · {rx.hospital_name}
                            </p>
                          </div>
                          <span className="text-[10px] text-ink-soft font-mono">
                            {rx.issued_on}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-ink-soft">No past prescriptions found.</p>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
