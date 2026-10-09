import { usePatientData } from '@/context/usePatientData';
import type { DataSourceType } from '@/context/PatientDataContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const DataSourceSelect: React.FC = () => {
  const { source, setSource, statusText } = usePatientData();

  const dotColorClass =
    source === 'backend' || source === 'hapi'
      ? 'bg-emerald-500 ring-emerald-500/30'
      : source === 'offline'
      ? 'bg-amber-500 ring-amber-500/30'
      : 'bg-stone-400 ring-stone-400/20';

  return (
    <div className="flex items-center gap-2.5">
      {/* Source Status Chip */}
      <div
        className="hidden md:inline-flex items-center gap-2 rounded-full border border-hairline bg-paper-2 px-3 py-1.5 text-xs text-ink-soft shadow-sm"
        title={statusText}
      >
        <span
          className={`h-2 w-2 rounded-full ring-2 ${dotColorClass} transition-colors`}
        />
        <span className="font-medium truncate max-w-[200px]">
          {statusText}
        </span>
      </div>

      {/* Dropdown Select */}
      <div className="w-[185px]">
        <Select
          value={source}
          onValueChange={(val) => setSource(val as DataSourceType)}
        >
          <SelectTrigger className="h-9 rounded-full bg-paper border-hairline text-xs font-medium focus:ring-teal-700">
            <SelectValue placeholder="Select Data Source" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="offline">
              <div className="flex flex-col text-left py-0.5">
                <span className="font-medium text-xs">Offline NRCeS Bundle</span>
                <span className="text-[10px] text-ink-soft">Synthetic verified dataset</span>
              </div>
            </SelectItem>
            <SelectItem value="backend">
              <div className="flex flex-col text-left py-0.5">
                <span className="font-medium text-xs">Backend Database</span>
                <span className="text-[10px] text-ink-soft">Supabase Postgres</span>
              </div>
            </SelectItem>
            <SelectItem value="hapi">
              <div className="flex flex-col text-left py-0.5">
                <span className="font-medium text-xs">Live HAPI FHIR</span>
                <span className="text-[10px] text-ink-soft">hapi.fhir.org/baseR4 query</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
