import { createContext } from 'react';
import type {
  FhirBundle,
  FhirPatient,
  FhirResource,
  TimelineDateGroup,
  TimelineEventType,
} from '@/lib/fhir/types';
import type { PatientProfile } from '@/data/patients';

export type DataSourceType = 'database' | 'offline' | 'live';
export type SourceStatusState = 'offline' | 'live' | 'fallback';

export interface PatientDataContextValue {
  source: DataSourceType;
  setSource: (newSource: DataSourceType) => void;
  isLoading: boolean;
  statusState: SourceStatusState;
  statusText: string;
  rawBundle: FhirBundle | null;
  bundle: FhirBundle | null;
  patient: FhirPatient | null;
  timelineGroups: TimelineDateGroup[];
  filteredTimelineGroups: TimelineDateGroup[];
  selectedResource: FhirResource | null;
  setSelectedResource: (resource: FhirResource | null) => void;
  activeFilter: 'all' | TimelineEventType;
  setActiveFilter: (filter: 'all' | TimelineEventType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toastMessage: string | null;
  clearToast: () => void;
  reload: () => Promise<void>;
  addObservationToBundle: (obs: FhirResource) => void;
  currentPatientId: string;
  setPatientId: (patientId: string) => void;
  availablePatients: PatientProfile[];
}

export const PatientDataContext = createContext<PatientDataContextValue | undefined>(undefined);
