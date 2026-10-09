import React from 'react';
import { usePatientData } from '@/context/usePatientData';
import { Users, AlertTriangle, CheckCircle, Clock, Stethoscope } from 'lucide-react';

export const PatientSwitcher: React.FC = () => {
  const { activePatientId, setActivePatientId } = usePatientData();

  // Mocked for Phase 1 where we only have one patient (Ramesh Kumar)
  const availablePatients = [] as any[];

  if (!availablePatients || availablePatients.length <= 1) return null;

  return (
    <div className="w-full rounded-28 border border-hairline bg-card/90 p-5 shadow-soft backdrop-blur-md mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-moss-100 text-moss-600">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-serif text-lg font-medium text-ink leading-tight">
              Select Demo Patient Profile
            </h3>
            <p className="text-xs text-ink-soft">
              Switch between synthetic patients to test varied diseases, biomarkers, prescriptions & care gaps
            </p>
          </div>
        </div>

        <span className="self-start sm:self-auto rounded-full bg-paper-2 border border-hairline px-3 py-1 font-mono text-[11px] text-ink-soft">
          {availablePatients.length} Synthetic Patients Loaded
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {availablePatients.map((p) => {
          const isSelected = p.id === activePatientId;
          const statusIcon =
            p.careGapStatus === 'Controlled' ? (
              <CheckCircle className="h-3 w-3 text-emerald-600" />
            ) : p.careGapStatus === 'Severe Gap' ? (
              <AlertTriangle className="h-3 w-3 text-rose-600" />
            ) : p.careGapStatus === 'Missing Test' ? (
              <Clock className="h-3 w-3 text-amber-600" />
            ) : (
              <Stethoscope className="h-3 w-3 text-blue-600" />
            );

          const statusBadgeClass =
            p.careGapStatus === 'Controlled'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : p.careGapStatus === 'Severe Gap'
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : p.careGapStatus === 'Missing Test'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-paper-2 text-ink-soft border-hairline';

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePatientId(p.id)}
              className={`flex flex-col items-start text-left p-3.5 rounded-20 border transition-all text-sm ${
                isSelected
                  ? 'border-moss-600 bg-moss-50/70 shadow-md ring-2 ring-moss-600/20'
                  : 'border-hairline bg-paper/60 hover:border-moss-500/40 hover:bg-paper-2'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2 mb-1">
                <span className="font-serif font-medium text-ink truncate">
                  {p.name}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadgeClass}`}
                >
                  {statusIcon}
                  <span>{p.careGapStatus}</span>
                </span>
              </div>

              <div className="text-xs text-ink-soft mb-2 flex items-center gap-2">
                <span>{p.age}y · {p.gender}</span>
                <span>•</span>
                <span className="truncate">{p.facility}</span>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                {p.primaryConditions?.map((c: any) => (
                  <span
                    key={c}
                    className="rounded-md bg-paper-2 px-1.5 py-0.5 text-[10px] text-ink-soft font-medium border border-hairline/60"
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div className="mt-auto w-full pt-2 border-t border-hairline/60 flex items-center justify-between text-[11px]">
                <span className="text-ink-soft">Rx-ID:</span>
                <span className="font-mono font-medium text-ink bg-white/70 px-1.5 py-0.5 rounded border border-hairline text-[10px]">
                  {p.sampleRxId}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
