import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PatientDataSource, TimelineEvent, PrescriptionInfo, CareGapAlert } from '@/lib/data-source/types';
import { BackendSource } from '@/lib/data-source/BackendSource';
import { OfflineSource } from '@/lib/data-source/OfflineSource';
import { HapiSource } from '@/lib/data-source/HapiSource';
import * as api from '@/lib/api/endpoints';
import { config } from '@/lib/config';

export type DataSourceType = 'backend' | 'offline' | 'hapi';

interface PatientDataContextValue {
    source: DataSourceType;
    setSource: (src: DataSourceType) => void;
    activePatientId: string;
    setActivePatientId: (id: string) => void;
    getDataSource: () => PatientDataSource;
    handleBackendFailure: () => void;
    statusText: string;
    
    // UI state
    selectedResource: any | null;
    setSelectedResource: (res: any | null) => void;
    activeFilter: string;
    setActiveFilter: (filter: string) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

const PatientContext = createContext<PatientDataContextValue | undefined>(undefined);

export function PatientDataProvider({ children }: { children: React.ReactNode }) {
    const [source, setSourceState] = useState<DataSourceType>('offline');
    const [activePatientId, setActivePatientId] = useState(config.defaultAbha);
    const [isInitialized, setIsInitialized] = useState(false);
    const [hasFallenBack, setHasFallenBack] = useState(false);
    
    const [selectedResource, setSelectedResource] = useState<any | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    useEffect(() => {
        let mounted = true;
        const init = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const baseUrl = config.apiBaseUrl ? `${config.apiBaseUrl}/health` : `/api/health`;
                
                const res = await fetch(baseUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (res.ok && mounted) {
                    setSourceState('backend');
                }
            } catch (err) {
                // Silently fallback to offline
            } finally {
                if (mounted) setIsInitialized(true);
            }
        };
        init();
        return () => { mounted = false; };
    }, []);

    const getDataSource = useCallback(() => {
        if (source === 'backend') return new BackendSource();
        if (source === 'hapi') return new HapiSource();
        return new OfflineSource();
    }, [source]);

    const handleBackendFailure = useCallback(() => {
        if (source === 'backend') {
            setSourceState('offline');
            setHasFallenBack(true);
        }
    }, [source]);

    let statusText = 'Offline bundle';
    if (source === 'backend') statusText = 'Backend: connected (v1.0.0)';
    if (source === 'hapi') statusText = 'Live HAPI FHIR';
    if (hasFallenBack && source === 'offline') statusText = 'Offline bundle (Fallback)';

    if (!isInitialized) return null; // Or a loading spinner

    return (
        <PatientContext.Provider value={{
            source,
            setSource: (s) => { setSourceState(s); setHasFallenBack(false); },
            activePatientId,
            setActivePatientId,
            getDataSource,
            handleBackendFailure,
            statusText,
            selectedResource, setSelectedResource,
            activeFilter, setActiveFilter,
            searchQuery, setSearchQuery
        }}>
            {children}
        </PatientContext.Provider>
    );
}

export function usePatientData() {
    const context = useContext(PatientContext);
    if (!context) throw new Error('usePatientData must be used within PatientDataProvider');
    return context;
}
