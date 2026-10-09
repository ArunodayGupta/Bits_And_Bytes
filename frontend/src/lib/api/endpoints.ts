import { apiClient } from './client';
import {
    TimelineResponse, TimelineResponseSchema,
    PrescriptionResponse, PrescriptionResponseSchema,
    CareGapResponse, CareGapResponseSchema,
    HealthResponse, HealthResponseSchema
} from './types';
import { z } from 'zod';

export const getTimeline = (abhaId: string, filterType?: string, limit = 50, cursor?: string) => {
    const params = new URLSearchParams();
    if (filterType) params.append('filter_type', filterType);
    params.append('limit', limit.toString());
    if (cursor) params.append('cursor', cursor);

    const query = params.toString();
    return apiClient<TimelineResponse>(
        `/patient/${abhaId}/timeline${query ? `?${query}` : ''}`,
        TimelineResponseSchema
    );
};

export const getPrescription = (rxId: string) => {
    return apiClient<PrescriptionResponse>(
        `/prescription/${encodeURIComponent(rxId)}`,
        PrescriptionResponseSchema
    );
};

export const getCareGaps = (abhaId: string, asOf?: string) => {
    const query = asOf ? `?as_of=${encodeURIComponent(asOf)}` : '';
    return apiClient<CareGapResponse[]>(
        `/patient/${abhaId}/care-gaps${query}`,
        z.array(CareGapResponseSchema)
    );
};

export const getDemoBundle = () => {
    return apiClient<any>(
        `/demo/bundle`,
        z.any()
    );
};

export const getHealth = () => {
    return apiClient<HealthResponse>(
        `/health`,
        HealthResponseSchema
    );
};
