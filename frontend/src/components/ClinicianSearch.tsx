import React, { useState, useMemo } from 'react';
import { Search, CornerDownLeft, Sparkles, Building2, User, FileCode } from 'lucide-react';
import { usePatientData } from '@/context/usePatientData';
import { matchesRxId, matchesAbha } from '@/lib/normalise';
import type {
  FhirMedicationRequest,
  FhirEncounter,
  FhirBundleEntry,
  FhirIdentifier,
} from '@/lib/fhir/types';
import { PrescriptionCard } from './PrescriptionCard';
import { Badge } from '@/components/ui/badge';

export const ClinicianSearch: React.FC = () => {
  const { bundle, patient, setSelectedResource } = usePatientData();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  // Extract all medication requests with Rx-IDs for matching & samples
  const allMedications = useMemo(() => {
    if (!bundle?.entry) return [];
    return bundle.entry
      .filter((e: FhirBundleEntry) => e.resource.resourceType === 'MedicationRequest')
      .map((e: FhirBundleEntry) => e.resource as FhirMedicationRequest);
  }, [bundle]);

  // Extract all encounters
  const encounterMap = useMemo(() => {
    const map = new Map<string, FhirEncounter>();
    if (!bundle?.entry) return map;
    for (const e of bundle.entry) {
      if (e.resource.resourceType === 'Encounter') {
        const enc = e.resource as FhirEncounter;
        map.set(enc.id, enc);
        map.set(`urn:uuid:${enc.id}`, enc);
        map.set(`Encounter/${enc.id}`, enc);
      }
    }
    return map;
  }, [bundle]);

  // Most recent encounter for ABHA lookup
  const mostRecentEncounter = useMemo(() => {
    const encounters = Array.from(encounterMap.values());
    if (encounters.length === 0) return undefined;
    return encounters.sort((a, b) => {
      const dateA = a.period?.start || '';
      const dateB = b.period?.start || '';
      return dateB.localeCompare(dateA);
    })[0];
  }, [encounterMap]);

  // First two sample Rx-IDs for judges' convenience
  const sampleRxIds = useMemo(() => {
    const samples: string[] = [];
    for (const med of allMedications) {
      const rxToken = med.identifier?.find(
        (id: FhirIdentifier) => id.system === 'https://abdm.gov.in/rx-token'
      );
      if (rxToken?.value && !samples.includes(rxToken.value)) {
        samples.push(rxToken.value);
        if (samples.length >= 2) break;
      }
    }
    return samples;
  }, [allMedications]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchTerm.trim());
  };

  const handleSelectSample = (sample: string) => {
    setSearchTerm(sample);
    setActiveQuery(sample);
  };

  // Perform search matching directly
  let searchResult:
    | { type: 'rx-id'; rxId: string; medication: FhirMedicationRequest; encounter?: FhirEncounter }
    | { type: 'abha'; patient: typeof patient; recentEncounter?: FhirEncounter }
    | { type: 'not-found'; query: string }
    | null = null;

  if (activeQuery) {
    // 1. Check for Rx-ID match
    let foundMed: FhirMedicationRequest | undefined;
    let foundRxId: string | undefined;

    for (const med of allMedications) {
      const rxToken = med.identifier?.find(
        (id: FhirIdentifier) => id.system === 'https://abdm.gov.in/rx-token'
      );
      if (rxToken?.value && matchesRxId(rxToken.value, activeQuery)) {
        foundMed = med;
        foundRxId = rxToken.value;
        break;
      }
    }

    if (foundMed && foundRxId) {
      let parentEncounter: FhirEncounter | undefined;
      if (foundMed.encounter?.reference) {
        parentEncounter = encounterMap.get(foundMed.encounter.reference);
      }
      searchResult = {
        type: 'rx-id',
        rxId: foundRxId,
        medication: foundMed,
        encounter: parentEncounter,
      };
    } else {
      // 2. Check for ABHA number match
      const patientAbha = patient?.identifier?.find(
        (id: FhirIdentifier) => id.system === 'https://healthid.ndhm.gov.in'
      )?.value;

      if (patientAbha && matchesAbha(patientAbha, activeQuery)) {
        searchResult = {
          type: 'abha',
          patient,
          recentEncounter: mostRecentEncounter,
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
          Lookup temporary speakable Rx-IDs or verified ABHA identifiers to view targeted medical records without cumbersome login credentials.
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
            placeholder="Enter Rx-ID or ABHA Number (e.g. APL-RR-1410-RAME)"
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

      {/* Try a Sample Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10 text-xs text-ink-soft">
        <span className="flex items-center gap-1 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-moss-600" />
          Try sample:
        </span>
        {sampleRxIds.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => handleSelectSample(sample)}
            className="rounded-full border border-hairline bg-paper-2 px-3 py-1 font-mono text-xs text-ink hover:border-moss-500 hover:bg-moss-100/40 transition-colors"
          >
            {sample}
          </button>
        ))}
        {patient && (
          <button
            type="button"
            onClick={() => handleSelectSample('91-1234-5678-9012')}
            className="rounded-full border border-hairline bg-paper-2 px-3 py-1 font-mono text-xs text-ink hover:border-moss-500 hover:bg-moss-100/40 transition-colors"
          >
            ABHA: 91-1234-5678-9012
          </button>
        )}
      </div>

      {/* Results Section */}
      <div className="w-full">
        {searchResult?.type === 'rx-id' && (
          <PrescriptionCard
            medication={searchResult.medication}
            encounter={searchResult.encounter}
            patient={patient}
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
                {patient && (
                  <button
                    type="button"
                    onClick={() => setSelectedResource(patient)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper-2 px-3 py-1 text-xs text-ink hover:bg-paper-2"
                  >
                    <FileCode className="h-3.5 w-3.5 text-moss-600" />
                    <span>Inspect Patient FHIR</span>
                  </button>
                )}
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-moss-500 to-moss-600 font-serif text-2xl text-paper">
                  RK
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-2xl text-ink">
                      {patient?.name?.[0]?.text || 'Ramesh Kumar'}
                    </h3>
                    <Badge variant="verified">Verified</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                    <span>54 years · Male</span>
                    <span>•</span>
                    <span className="font-mono font-medium text-ink">
                      91-1234-5678-9012
                    </span>
                    <span>•</span>
                    <span>Chennai, Tamil Nadu</span>
                  </div>
                </div>
              </div>
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
                    onClick={() => setSelectedResource(searchResult.recentEncounter ?? null)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper-2 px-3 py-1 text-xs text-ink"
                  >
                    <FileCode className="h-3.5 w-3.5 text-moss-600" />
                    <span>Inspect Encounter FHIR</span>
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-base text-ink">
                    {searchResult.recentEncounter.serviceProvider?.display || 'Apollo Hospitals Chennai'}
                  </h4>
                  <div className="flex flex-col gap-1 text-xs text-ink-soft">
                    <span className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5" />
                      Attending: {searchResult.recentEncounter.participant?.[0]?.individual?.display || 'Dr. Rajesh Rao'}
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
              Ensure the Rx-ID is typed correctly, or try one of the instant sample tokens above. Spacing, hyphens, and lowercase letters are automatically handled.
            </p>
            {sampleRxIds.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectSample(sampleRxIds[0])}
                className="rounded-full bg-moss-600 px-5 py-2 text-xs font-semibold text-paper hover:bg-moss-500 shadow-sm"
              >
                Try Sample: {sampleRxIds[0]}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto text-left">
              <div className="rounded-xl border border-hairline bg-paper-2/70 p-4">
                <span className="font-mono text-xs font-bold text-moss-600 block mb-1">
                  APL-RR-1410-RAME
                </span>
                <span className="text-xs text-ink-soft">
                  Metformin 500mg by Dr. Rajesh Rao at Apollo Hospitals Chennai
                </span>
              </div>
              <div className="rounded-xl border border-hairline bg-paper-2/70 p-4">
                <span className="font-mono text-xs font-bold text-moss-600 block mb-1">
                  91-1234-5678-9012
                </span>
                <span className="text-xs text-ink-soft">
                  Ramesh Kumar verified ABHA demographics and latest consultation
                </span>
              </div>
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
