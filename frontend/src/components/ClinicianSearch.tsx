import React, { useState } from 'react';
import { Search, CornerDownLeft, Sparkles, Building2, User, FileCode } from 'lucide-react';
import { usePatientData } from '@/context/usePatientData';
import { usePrescription } from '@/hooks/usePrescription';
import { PrescriptionCard } from './PrescriptionCard';
import { Badge } from '@/components/ui/badge';
import type { FhirMedicationRequest, FhirEncounter, FhirPatient } from '@/lib/fhir/types';

export const ClinicianSearch: React.FC = () => {
  const { setSelectedResource } = usePatientData();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  const { data: prescription, isLoading, error } = usePrescription(activeQuery);

  // Sample Rx-IDs with patient metadata for hackathon demonstration
  const sampleItems = [
    { rxId: 'APL-RR-1410-RAME', name: 'Ramesh Kumar', condition: 'Type 2 Diabetes', abha: '91-2345-6789-0123' }
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchTerm.trim());
  };

  const handleSelectSample = (sample: string) => {
    setSearchTerm(sample);
    setActiveQuery(sample);
  };

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
          Lookup temporary speakable Rx-IDs or verified ABHA identifiers across all demo patients to view targeted medical records without cumbersome login credentials.
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
            placeholder="Enter Rx-ID (e.g. FRT-SS-1809-PRIY) or ABHA (e.g. 91-2345-6789-0123)"
            aria-label="Clinician search query"
            className="h-16 w-full rounded-full border-2 border-hairline bg-card pl-16 pr-24 font-mono text-base tracking-wide text-ink shadow-elevated transition-all placeholder:text-ink-soft/50 placeholder:font-sans focus:border-moss-500 focus:outline-none focus:ring-4 focus:ring-moss-500/20"
          />
          <div className="absolute right-4 flex items-center gap-2">
            <button
              type="submit"
              className="flex h-10 items-center gap-1.5 rounded-full bg-moss-600 px-4 text-xs font-semibold text-white hover:bg-moss-500 transition-colors shadow-sm"
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
              <span className="font-semibold text-moss-600">{item.rxId}</span>
              <span className="font-sans text-[11px] text-ink-soft group-hover:text-ink">
                ({item.name.split(' ')[0]} · {item.condition})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Results Section */}
      <div className="w-full">
        {activeQuery && isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-8 w-8 text-moss-500 animate-pulse mb-4" />
            <p className="text-ink-soft">Searching ABDM Gateway...</p>
          </div>
        )}

        {activeQuery && !isLoading && prescription && (
          <PrescriptionCard
            prescription={prescription}
            onInspect={(res) => setSelectedResource(res)}
          />
        )}

        {activeQuery && !isLoading && !prescription && (
          <div className="flex flex-col items-center justify-center rounded-28 border border-hairline bg-card p-12 text-center shadow-soft">
            <div className="h-14 w-14 rounded-full bg-paper-2 border border-hairline flex items-center justify-center text-ink-soft mb-4">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-2xl text-ink mb-2">
              No matching record for <span className="font-mono text-moss-600">"{activeQuery}"</span>
            </h3>
            <p className="max-w-md text-sm text-ink-soft mb-6 leading-relaxed">
              Ensure the Rx-ID is typed correctly, or click one of the quick test sample chips above.
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
        {!activeQuery && (
          <div className="rounded-28 border border-hairline bg-card p-10 text-center shadow-soft">
            <h3 className="font-serif text-2xl text-ink mb-2">
              Enter a Prescription ID
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
