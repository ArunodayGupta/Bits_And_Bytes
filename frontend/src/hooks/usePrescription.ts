import { useQuery } from '@tanstack/react-query';
import { usePatientData } from '@/context/usePatientData';
import { PrescriptionInfo } from '@/lib/data-source/types';

export function usePrescription(rxId: string) {
    const { getDataSource, source, handleBackendFailure } = usePatientData();

    return useQuery({
        queryKey: ['prescription', rxId, source],
        queryFn: async () => {
            if (!rxId) return null;
            try {
                return await getDataSource().getPrescription(rxId);
            } catch (err: any) {
                if (err?.code === 'NETWORK' || err?.status >= 500) {
                    handleBackendFailure();
                    // React Query will automatically retry unless we tell it not to, 
                    // but since handleBackendFailure changes the source to 'offline', 
                    // the queryKey changes and it immediately refetches with OfflineSource!
                }
                throw err;
            }
        },
        enabled: !!rxId,
        retry: 0,
        staleTime: 60000,
    });
}
