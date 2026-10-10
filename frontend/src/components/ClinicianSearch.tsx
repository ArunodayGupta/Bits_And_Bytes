import React, { useState, useMemo } from 'react';
import { Search, CornerDownLeft, Sparkles, Building2, User, FileCode } from 'lucide-react';
import { usePatientData } from '@/context/usePatientData';
import { matchesRxId, matchesAbha } from '@/lib/normalise';
import type {
  FhirMedicationRequest,
  FhirEncounter,
  FhirPatient,
  FhirIdentifier,
} from '@/lib/fhir/types';
import { PrescriptionCard } from './PrescriptionCard';
import { Badge } from '@/components/ui/badge';

export const ClinicianSearch: React.FC = () => {
  const { availablePatients, patient: defaultPatient, setSelectedResource } = usePatientData();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  // Extract all medication requests across all available patients
  const allIndexedRecords = useMemo(() => {
    const list: Array<{
      medication: FhirMedicationRequest;
      encounter?: FhirEncounter;
      patient: FhirPatient;
      patientName: string;
      rxId: string;
    }> = [];

    for (const profile of availablePatients || []) {
      const pBundle = profile.bundle;
      const pPatient = (pBundle.entry?.find(
        (e) => e.resource.resourceType === 'Patient'
      )?.resource as FhirPatient) || null;

      const encounterMap = new Map<string, FhirEncounter>();
      for (const e of pBundle.entry || []) {
        if (e.resource.resourceType === 'Encounter') {
          const enc = e.resource as FhirEncounter;
          encounterMap.set(enc.id, enc);
          encounterMap.set(`urn:uuid:${enc.id}`, enc);
          encounterMap.set(`Encounter/${enc.id}`, enc);
        }
      }

      for (const e of pBundle.entry || []) {
        if (e.resource.resourceType === 'MedicationRequest') {
          const med = e.resource as FhirMedicationRequest;
          const rxToken = med.identifier?.find(
            (id: FhirIdentifier) => id.system === 'https://abdm.gov.in/rx-token'
          );
          const rxId = rxToken?.value || profile.sampleRxId;
          const encRef = med.encounter?.reference;
          const encounter = encRef ? encounterMap.get(encRef) : undefined;

          if (pPatient) {
            list.push({
              medication: med,
              encounter,
              patient: pPatient,
              patientName: profile.name,
              rxId,
            });
          }
        }
      }
    }

    return list;
  }, [availablePatients]);

  // Extract encounters across all patients mapped by patient ABHA
  const patientEncounterMap = useMemo(() => {
    const map = new Map<string, { patient: FhirPatient; recentEncounter?: FhirEncounter }>();
    for (const profile of availablePatients || []) {
      const pBundle = profile.bundle;
      const pPatient = pBundle.entry?.find(
        (e) => e.resource.resourceType === 'Patient'
      )?.resource as FhirPatient;

      if (!pPatient) continue;

      const encounters = (pBundle.entry || [])
        .filter((e) => e.resource.resourceType === 'Encounter')
        .map((e) => e.resource as FhirEncounter)
        .sort((a, b) => {
          const dateA = a.period?.start || '';
          const dateB = b.period?.start || '';
          return dateB.localeCompare(dateA);
        });

      const abha = pPatient.identifier?.find(
        (id) => id.system === 'https://healthid.ndhm.gov.in'
      )?.value || profile.abha;

      map.set(abha, {
        patient: pPatient,
        recentEncounter: encounters[0],
      });
    }
    return map;
  }, [availablePatients]);

  // Sample Rx-IDs with patient metadata for hackathon demonstration
  const sampleItems = useMemo(() => {
    return (availablePatients || []).map((p) => ({
      rxId: p.sampleRxId,
      name: p.name,
      condition: p.primaryConditions[0],
      abha: p.abha,
    }));
  }, [availablePatients]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchTerm.trim());
  };

  const handleSelectSample = (sample: string) => {
    setSearchTerm(sample);
    setActiveQuery(sample);
  };

  // Perform search matching
  let searchResult:
    | {
        type: 'rx-id';
        rxId: string;
        medication: FhirMedicationRequest;
        encounter?: FhirEncounter;
        patient: FhirPatient;
      }
    | {
        type: 'abha';
        patient: FhirPatient;
        recentEncounter?: FhirEncounter;
      }
    | { type: 'not-found'; query: string }
    | null = null;

  if (activeQuery) {
    // 1. Check for Rx-ID match across all indexed records
    const matchedRecord = allIndexedRecords.find((rec) =>
      matchesRxId(rec.rxId, activeQuery)
    );

    if (matchedRecord) {
      searchResult = {
        type: 'rx-id',
        rxId: matchedRecord.rxId,
        medication: matchedRecord.medication,
        encounter: matchedRecord.encounter,
        patient: matchedRecord.patient,
      };
    } else {
      // 2. Check for ABHA number match
      let matchedAbhaRecord: { patient: FhirPatient; recentEncounter?: FhirEncounter } | undefined;

      for (const [abhaId, entry] of patientEncounterMap.entries()) {
        if (matchesAbha(abhaId, activeQuery)) {
          matchedAbhaRecord = entry;
          break;
        }
      }

      if (matchedAbhaRecord) {
        searchResult = {
          type: 'abha',
          patient: matchedAbhaRecord.patient,
          recentEncounter: matchedAbhaRecord.recentEncounter,
        };
      } else {
        searchResult = {
          type: 'not-found',
          query: activeQuery,
        };
      }
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto py-6">
      {/* Clinician Hero */}
      <div className="text-center mb-8 max-w-2xl">
        <div className="flex items-center justify-center mb-3">
          <span className="eyebrow-pill">
            <span className="eyebrow-dot" />
            Clinician Point of Care
          </span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-normal text-ink mb-3">
          Find a prescription, <span className="italic">instantly</span>
        </h1>
        <p className="text-sm sm:text-base text-ink-soft leading-relaxed">
          Look up prescription codes or patient health IDs to review prescriptions and records.
        </p>
      </div>

      {/* Prominent Search Bar (64px tall, mono text) */}
      <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl mb-4">
        <div className="relative flex items-center">
          <Search className="absolute left-6 h-6 w-6 text-ink-soft/70 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter Prescription Code (e.g. FRT-SS-1809-PRIY) or Health ID (91-2345-6789-0123)"
            aria-label="Clinician search query"
            className="h-16 w-full rounded-full border-2 border-hairline bg-card pl-16 pr-24 font-mono text-base tracking-wide text-ink shadow-elevated transition-all placeholder:text-ink-soft/50 placeholder:font-sans focus:border-moss-500 focus:outline-none focus:ring-4 focus:ring-moss-500/20"
          />
          <div className="absolute right-4 flex items-center gap-2">
            <button
              type="submit"
              className="flex h-10 items-center gap-1.5 rounded-full bg-moss-600 px-4 text-xs font-semibold text-paper hover:bg-moss-500 transition-colors shadow-sm"
            >
              <span>Search</span>
              <CornerDownLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </form>

      {/* Quick Test Chips for Evaluators & Judges */}
      <div className="w-full max-w-3xl mb-8">
        <div className="flex items-center justify-center gap-1.5 mb-2.5 text-xs text-ink-soft font-medium">
          <Sparkles className="h-3.5 w-3.5 text-moss-600" />
          <span>Quick Test Samples across 6 Patients & Clinical Domains:</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {sampleItems.map((item) => (
            <button
              key={item.rxId}
              type="button"
              onClick={() => handleSelectSample(item.rxId)}
              className="group flex items-center gap-1.5 rounded-full border border-hairline bg-paper-2 px-3 py-1 font-mono text-xs text-ink hover:border-moss-500 hover:bg-moss-100/50 transition-all shadow-2xs"
            >
              <span className="font-semibold text-moss-700">{item.rxId}</span>
              <span className="font-sans text-[11px] text-ink-soft group-hover:text-ink">
                ({item.name.split(' ')[0]} · {item.condition})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div className="w-full">
        {searchResult?.type === 'rx-id' && (
          <PrescriptionCard
            medication={searchResult.medication}
            encounter={searchResult.encounter}
            patient={searchResult.patient}
            rxId={searchResult.rxId}
            onInspect={(res) => setSelectedResource(res)}
          />
        )}

        {searchResult?.type === 'abha' && (
          <div className="flex flex-col gap-6 w-full animate-fade-up">
            <div className="rounded-20 border border-hairline bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <span className="eyebrow-pill text-[10px]">
                  <span className="eyebrow-dot" />
                  ABHA Demographic Match
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedResource(searchResult?.type === 'abha' ? searchResult.patient : null)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper-2 px-3 py-1 text-xs text-ink hover:bg-paper-2"
                >
                  <FileCode className="h-3.5 w-3.5 text-moss-600" />
                  <span>Inspect Patient FHIR</span>
                </button>
              </div>

              {(() => {
                const pat = searchResult.patient;
                const name = pat.name?.[0]?.text || 'Patient';
                const initials = name
                  .split(' ')
                  .filter(Boolean)
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                const abhaNum = pat.identifier?.find((i) => i.system === 'https://healthid.ndhm.gov.in')?.value || 'ABHA';
                const gender = pat.gender ? pat.gender.charAt(0).toUpperCase() + pat.gender.slice(1) : 'Unknown';
                let age: number | string = 50;
                if (pat.birthDate) {
                  const birthYear = new Date(pat.birthDate).getFullYear();
                  if (!isNaN(birthYear)) {
                    age = new Date().getFullYear() - birthYear;
                  }
                }
                const city = pat.address?.[0]?.city || 'India';
                const state = pat.address?.[0]?.state || '';

                return (
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-600 font-serif text-2xl text-paper">
                      {initials}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-2xl text-ink">
                          {name}
                        </h3>
                        <Badge variant="verified">Verified</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                        <span>{age} years · {gender}</span>
                        <span>•</span>
                        <span className="font-mono font-medium text-ink">
                          {abhaNum}
                        </span>
                        <span>•</span>
                        <span>{city}{state ? `, ${state}` : ''}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Most recent encounter */}
            {searchResult.recentEncounter && (
              <div className="rounded-20 border border-hairline bg-card p-6 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <span className="eyebrow-pill text-[10px]">
                    <span className="eyebrow-dot" />
                    Most Recent Encounter
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedResource(searchResult?.type === 'abha' ? (searchResult.recentEncounter ?? null) : null)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper-2 px-3 py-1 text-xs text-ink"
                  >
                    <FileCode className="h-3.5 w-3.5 text-moss-600" />
                    <span>Inspect Encounter FHIR</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-base text-ink">
                    {searchResult.recentEncounter.serviceProvider?.display || 'Healthcare Facility'}
                  </h4>
                  <div className="flex flex-col gap-1 text-xs text-ink-soft">
                    <span className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      Attending: {searchResult.recentEncounter.participant?.[0]?.individual?.display || 'Medical Officer'}
                    </span>
                    <span className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      Status: {searchResult.recentEncounter.status || 'Finished'} (Ambulatory)
                    </span>
                    <span className="font-mono">
                      Date: {searchResult.recentEncounter.period?.start ? new Date(searchResult.recentEncounter.period.start).toLocaleDateString('en-GB') : 'Recorded'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {searchResult?.type === 'not-found' && (
          <div className="flex flex-col items-center justify-center rounded-28 border border-hairline bg-card p-12 text-center shadow-soft">
            <div className="h-14 w-14 rounded-full bg-paper-2 border border-hairline flex items-center justify-center text-ink-soft mb-4">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-2xl text-ink mb-2">
              No matching record for <span className="font-mono text-moss-600">"{searchResult.query}"</span>
            </h3>
            <p className="max-w-md text-sm text-ink-soft mb-6 leading-relaxed">
              Ensure the Rx-ID is typed correctly, or click one of the quick test sample chips above. Spacing, hyphens, and lowercase letters are automatically handled.
            </p>
            {sampleItems.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectSample(sampleItems[0].rxId)}
                className="rounded-full bg-moss-600 px-5 py-2 text-xs font-semibold text-paper hover:bg-moss-500 shadow-sm"
              >
                Try Sample: {sampleItems[0].rxId}
              </button>
            )}
          </div>
        )}

        {/* Initial Empty State before search */}
        {!searchResult && (
          <div className="rounded-28 border border-hairline bg-card p-10 text-center shadow-soft">
            <h3 className="font-serif text-2xl text-ink mb-2">
              Enter a Prescription ID or Patient ABHA
            </h3>
            <p className="text-sm text-ink-soft max-w-lg mx-auto mb-6">
              When a patient presents an Rx-ID verbally or from their digital locker, enter it above to securely verify the prescription and encounter context.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
              {sampleItems.slice(0, 3).map((item) => (
                <div
                  key={item.rxId}
                  onClick={() => handleSelectSample(item.rxId)}
                  className="rounded-xl border border-hairline bg-paper-2/70 p-3.5 hover:border-moss-500/50 hover:bg-moss-50/40 cursor-pointer transition-all"
                >
                  <span className="font-mono text-xs font-bold text-moss-700 block mb-1">
                    {item.rxId}
                  </span>
                  <span className="text-[11px] text-ink-soft block">
                    {item.name} · {item.condition}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mandatory Non-Goal Footer Disclaimer */}
      <footer className="mt-16 w-full border-t border-hairline pt-6 text-center">
        <p className="text-xs text-ink-soft/80 flex items-center justify-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-stone-400" />
          Demo only: Rx-ID lookup is not access control. Production sharing would use ABDM consent artefacts, short expiry and audit logs.
        </p>
      </footer>
    </div>
  );
};
