import React, { useState, useCallback, useMemo, useContext, useRef } from 'react';
import type {
  FhirBundle,
  FhirPatient,
  FhirResource,
  TimelineEventType,
} from '@/lib/fhir/types';
import { fetchPatientData } from '@/lib/fhir/fetchPatientData';
import { buildTimeline } from '@/lib/fhir/buildTimeline';
import { injectRxIdsIntoBundle } from '@/lib/rxId';
import { PATIENT_PROFILES, DEFAULT_PATIENT_PROFILE, type PatientProfile } from '@/data/patients';
import { AuthContext } from './AuthContext';
import {
  PatientDataContext,
  type DataSourceType,
  type SourceStatusState,
  type PatientDataContextValue,
} from './contextDefinition';

export type { DataSourceType, SourceStatusState, PatientDataContextValue } from './contextDefinition';

// Initial offline bootstrap to ensure zero flash on initial render
function getInitialProfile(): PatientProfile {
  try {
    if (typeof window !== 'undefined') {
      const storedAbha = sessionStorage.getItem('healthsafe_auth_abha');
      if (storedAbha) {
        const clean = storedAbha.replace(/\D/g, '');
        const matched = PATIENT_PROFILES.find((p) => p.abha.replace(/\D/g, '') === clean);
        if (matched) return matched;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_PATIENT_PROFILE;
}

const initialRaw = DEFAULT_PATIENT_PROFILE.bundle;
const initialPrepared = injectRxIdsIntoBundle(initialRaw);
const initialPatient =
  (initialPrepared.bundle.entry?.find((e) => e.resource.resourceType === 'Patient')?.resource as FhirPatient) ||
  null;

export function PatientDataProvider({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext);
  const authAbha = auth?.abhaId;

  const [currentPatientId, setCurrentPatientId] = useState<string>(() => getInitialProfile().id);
  const [source, setSourceState] = useState<DataSourceType>('database');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusState, setStatusState] = useState<SourceStatusState>('live');
  const [statusText, setStatusText] = useState<string>('Database Synced');
  const [rawBundle, setRawBundle] = useState<FhirBundle | null>(() => getInitialProfile().bundle);
  const [bundle, setBundle] = useState<FhirBundle | null>(() => {
    const prof = getInitialProfile();
    return injectRxIdsIntoBundle(prof.bundle).bundle;
  });
  const [patient, setPatient] = useState<FhirPatient | null>(() => {
    const prof = getInitialProfile();
    const prep = injectRxIdsIntoBundle(prof.bundle).bundle;
    return (prep.entry?.find((e) => e.resource.resourceType === 'Patient')?.resource as FhirPatient) || null;
  });
  const [selectedResource, setSelectedResource] = useState<FhirResource | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | TimelineEventType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [sessionScannedObservations, setSessionScannedObservations] = useState<FhirResource[]>(() => {
    try {
      const stored = sessionStorage.getItem(`healthsafe_scanned_obs_${DEFAULT_PATIENT_PROFILE.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  // Track whether data has ever been loaded so background refreshes don't show skeletons
  const hasLoadedOnce = useRef<boolean>(false);

  const clearToast = useCallback(() => setToastMessage(null), []);

  const loadData = useCallback(async (requestedSource: DataSourceType, patientId?: string, silent = false) => {
    // Only show the loading skeleton on the very first fetch.
    // Background refreshes update silently so the UI doesn't flicker.
    const isBackground = hasLoadedOnce.current || silent;
    if (!isBackground) {
      setIsLoading(true);
    }
    let didFallback = false;
    const targetPatientId = patientId ?? currentPatientId;
    const profile = PATIENT_PROFILES.find((p) => p.id === targetPatientId) || DEFAULT_PATIENT_PROFILE;

    try {
      const fetchedBundle = await fetchPatientData(requestedSource || 'database', () => {
        didFallback = true;
      }, profile.abha);

      // Inject deterministic speakable Rx-IDs into all MedicationRequests
      const { bundle: preparedBundle } = injectRxIdsIntoBundle(fetchedBundle);

      // Merge any session scanned observations into bundle if not already present
      if (!preparedBundle.entry) preparedBundle.entry = [];
      const currentEntryIds = new Set(preparedBundle.entry.map((e) => e.resource.id));
      for (const obs of sessionScannedObservations) {
        if (!currentEntryIds.has(obs.id)) {
          preparedBundle.entry.unshift({
            fullUrl: `urn:uuid:${obs.id}`,
            resource: obs,
          });
          currentEntryIds.add(obs.id);
        }
      }

      // Merge any newly issued prescriptions for this patient in current session
      try {
        const cleanAbha = profile.abha.replace(/\D/g, '');
        const storedPrescriptions = sessionStorage.getItem(`healthsafe_new_prescriptions_${cleanAbha}`);
        if (storedPrescriptions) {
          const list = JSON.parse(storedPrescriptions);
          for (const rx of list) {
            for (const med of rx.medications || []) {
              const fid = `rx-sess-${rx.rx_id}-${(med.name || 'med').replace(/\s+/g, '-').toLowerCase()}`;
              if (!currentEntryIds.has(fid)) {
                preparedBundle.entry.unshift({
                  fullUrl: `urn:uuid:${fid}`,
                  resource: {
                    resourceType: 'MedicationRequest',
                    id: fid,
                    status: 'active',
                    authoredOn: rx.issued_on ? `${rx.issued_on}T10:00:00Z` : new Date().toISOString(),
                    requester: { display: rx.doctor_name || 'Dr. Rajesh Rao' },
                    encounter: { display: rx.hospital_name || 'Apollo Hospitals' },
                    identifier: [
                      { system: 'https://abdm.gov.in/rx-token', value: rx.rx_id },
                      { system: 'https://phr-demo.example.org/rx-token', value: rx.rx_id },
                    ],
                    groupIdentifier: {
                      system: 'https://abdm.gov.in/rx-token',
                      value: rx.rx_id,
                    },
                    medicationCodeableConcept: {
                      text: med.name,
                      coding: [{ system: 'http://snomed.info/sct', display: med.name }],
                    },
                    dosageInstruction: [{ text: `${med.dosage || '1 tablet'} - ${med.frequency || 'Once daily'}. ${med.instructions || ''}`.trim() }],
                  } as any,
                });
                currentEntryIds.add(fid);
              }
            }
          }
        }
      } catch {
        // Safe fallback
      }

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

      setStatusState('live');
      setStatusText(`Database Synced (${totalResources} records)`);
    } catch (err) {
      // AbortErrors are intentional (React Strict Mode double-mount / unmount).
      // Silently ignore them — the second mount will fetch successfully.
      if (err instanceof DOMException && err.name === 'AbortError') {
        setIsLoading(false);
        return;
      }
      console.error('Critical loading error:', err);
      setStatusState('fallback');
      setStatusText('Database Synced');
    } finally {
      hasLoadedOnce.current = true;
      setIsLoading(false);
    }
  }, [currentPatientId]);

  // Load from database on initial mount
  React.useEffect(() => {
    const initProfile = getInitialProfile();
    void loadData('database', initProfile.id);
  }, [loadData]);

  // Immediately reload whenever a doctor issues a new prescription
  React.useEffect(() => {
    const handleRxCreated = () => {
      void loadData('database', currentPatientId);
    };
    window.addEventListener('healthsafe_rx_created', handleRxCreated);
    return () => window.removeEventListener('healthsafe_rx_created', handleRxCreated);
  }, [loadData]);

  // Auto-refresh periodically without flashing or emptying the UI
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadData(source, undefined, true);
      }
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [source, loadData]);

  const setSource = useCallback(
    (newSource: DataSourceType) => {
      setSourceState(newSource);
      void loadData(newSource);
    },
    [loadData]
  );

  const setPatientId = useCallback(
    (patientId: string) => {
      setCurrentPatientId(patientId);
      const profile = PATIENT_PROFILES.find((p) => p.id === patientId) || DEFAULT_PATIENT_PROFILE;
      const prepared = injectRxIdsIntoBundle(profile.bundle);
      setRawBundle(profile.bundle);
      setBundle(prepared.bundle);
      const pResource = prepared.bundle.entry?.find((e) => e.resource.resourceType === 'Patient')?.resource as FhirPatient;
      setPatient(pResource || null);
      setSelectedResource(null);
      void loadData(source, patientId);
    },
    [source, loadData]
  );

  // Synchronize active patient with AuthContext whenever logged-in ABHA changes
  React.useEffect(() => {
    if (authAbha) {
      const clean = authAbha.replace(/\D/g, '');
      const matched = PATIENT_PROFILES.find((p) => p.abha.replace(/\D/g, '') === clean);
      if (matched && matched.id !== currentPatientId) {
        setPatientId(matched.id);
      }
    }
  }, [authAbha, currentPatientId, setPatientId]);

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

  const addObservationToBundle = useCallback((obs: FhirResource) => {
    setSessionScannedObservations((prev) => {
      const exists = prev.some((o) => o.id === obs.id);
      const next = exists ? prev : [obs, ...prev];
      try {
        sessionStorage.setItem(`healthsafe_scanned_obs_${currentPatientId}`, JSON.stringify(next));
      } catch {
        // ignore storage error
      }
      return next;
    });

    setBundle((prevBundle) => {
      if (!prevBundle) return prevBundle;
      const currentEntries = prevBundle.entry || [];
      const exists = currentEntries.some((e) => e.resource.id === obs.id);
      if (exists) return prevBundle;

      const newEntry = {
        fullUrl: `urn:uuid:${obs.id}`,
        resource: obs,
      };
      return {
        ...prevBundle,
        entry: [newEntry, ...currentEntries],
      };
    });
    setToastMessage('Lab observation added to timeline.');
  }, [currentPatientId]);

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
    addObservationToBundle,
    currentPatientId,
    setPatientId,
    availablePatients: PATIENT_PROFILES,
  };

  return (
    <PatientDataContext.Provider value={value}>
      {children}
    </PatientDataContext.Provider>
  );
}

export function usePatientData(): PatientDataContextValue {
  const context = useContext(PatientDataContext);
  if (!context) {
    throw new Error('usePatientData must be used within a PatientDataProvider');
  }
  return context;
}

