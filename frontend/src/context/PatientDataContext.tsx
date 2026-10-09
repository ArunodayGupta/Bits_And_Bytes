import React, { useState, useCallback, useMemo } from 'react';
import type {
  FhirBundle,
  FhirPatient,
  FhirResource,
  TimelineEventType,
} from '@/lib/fhir/types';
import { fetchPatientData } from '@/lib/fhir/fetchPatientData';
import { buildTimeline } from '@/lib/fhir/buildTimeline';
import { injectRxIdsIntoBundle } from '@/lib/rxId';
import offlineBundleData from '@/data/op-consultation.json';
import {
  PatientDataContext,
  type DataSourceType,
  type SourceStatusState,
  type PatientDataContextValue,
} from './contextDefinition';

export type { DataSourceType, SourceStatusState, PatientDataContextValue } from './contextDefinition';

// Initial offline bootstrap to ensure zero flash on initial render
const initialRaw = offlineBundleData as unknown as FhirBundle;
const initialPrepared = injectRxIdsIntoBundle(initialRaw);
const initialPatient =
  (initialPrepared.bundle.entry?.find((e) => e.resource.resourceType === 'Patient')?.resource as FhirPatient) ||
  null;

export function PatientDataProvider({ children }: { children: React.ReactNode }) {
  const [source, setSourceState] = useState<DataSourceType>('offline');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusState, setStatusState] = useState<SourceStatusState>('offline');
  const [statusText, setStatusText] = useState<string>('Source: Offline bundle');
  const [rawBundle, setRawBundle] = useState<FhirBundle | null>(initialRaw);
  const [bundle, setBundle] = useState<FhirBundle | null>(initialPrepared.bundle);
  const [patient, setPatient] = useState<FhirPatient | null>(initialPatient);
  const [selectedResource, setSelectedResource] = useState<FhirResource | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | TimelineEventType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const clearToast = useCallback(() => setToastMessage(null), []);

  const loadData = useCallback(async (requestedSource: DataSourceType) => {
    setIsLoading(true);
    let didFallback = false;

    try {
      const fetchedBundle = await fetchPatientData(requestedSource, () => {
        didFallback = true;
      });

      // Inject deterministic speakable Rx-IDs into all MedicationRequests
      const { bundle: preparedBundle } = injectRxIdsIntoBundle(fetchedBundle);

      setRawBundle(fetchedBundle);
      setBundle(preparedBundle);

      // Extract Patient resource
      const patientEntry = preparedBundle.entry?.find(
        (e) => e.resource.resourceType === 'Patient'
      );
      if (patientEntry) {
        setPatient(patientEntry.resource as FhirPatient);
      }

      const totalResources = preparedBundle.entry?.length ?? 0;

      if (requestedSource === 'live') {
        if (didFallback) {
          setStatusState('fallback');
          setStatusText('Live failed, using offline');
          setToastMessage('Live server unavailable, showing offline bundle.');
        } else {
          setStatusState('live');
          setStatusText(`Source: Live HAPI (${totalResources} resources)`);
        }
      } else {
        setStatusState('offline');
        setStatusText('Source: Offline bundle');
      }
    } catch (err) {
      console.error('Critical loading error:', err);
      setStatusState('fallback');
      setStatusText('Live failed, using offline');
      setToastMessage('Live server unavailable, showing offline bundle.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSource = useCallback(
    (newSource: DataSourceType) => {
      setSourceState(newSource);
      void loadData(newSource);
    },
    [loadData]
  );

  const reload = useCallback(async () => {
    await loadData(source);
  }, [loadData, source]);

  // Derived timeline groups
  const timelineGroups = useMemo(() => {
    if (!bundle) return [];
    return buildTimeline(bundle);
  }, [bundle]);

  // Filtered timeline based on active filter chip and search query
  const filteredTimelineGroups = useMemo(() => {
    if (!timelineGroups.length) return [];
    const lowerQuery = searchQuery.trim().toLowerCase();

    return timelineGroups
      .map((group) => {
        const filteredEvents = group.events.filter((ev) => {
          // Filter by category
          if (activeFilter !== 'all' && ev.type !== activeFilter) {
            return false;
          }

          // Filter by search query
          if (!lowerQuery) return true;

          const matchesTitle = ev.title.toLowerCase().includes(lowerQuery);
          const matchesSubtitle = ev.subtitle?.toLowerCase().includes(lowerQuery);
          const matchesHospital = ev.hospital?.toLowerCase().includes(lowerQuery);
          const matchesDoctor = ev.doctor?.toLowerCase().includes(lowerQuery);
          const matchesRx = ev.rxId?.toLowerCase().includes(lowerQuery);
          const matchesBadge = ev.badge?.toLowerCase().includes(lowerQuery);

          return (
            matchesTitle ||
            matchesSubtitle ||
            matchesHospital ||
            matchesDoctor ||
            matchesRx ||
            matchesBadge
          );
        });

        return {
          ...group,
          events: filteredEvents,
        };
      })
      .filter((group) => group.events.length > 0);
  }, [timelineGroups, activeFilter, searchQuery]);

  const value: PatientDataContextValue = {
    source,
    setSource,
    isLoading,
    statusState,
    statusText,
    rawBundle,
    bundle,
    patient,
    timelineGroups,
    filteredTimelineGroups,
    selectedResource,
    setSelectedResource,
    activeFilter,
    setActiveFilter,
    searchQuery,
    setSearchQuery,
    toastMessage,
    clearToast,
    reload,
  };

  return (
    <PatientDataContext.Provider value={value}>
      {children}
    </PatientDataContext.Provider>
  );
}
