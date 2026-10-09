import { useQuery } from '@tanstack/react-query';
import { usePatientData } from '@/context/usePatientData';

export function useCareGaps() {
    const { getDataSource, activePatientId, source, handleBackendFailure } = usePatientData();

    return useQuery({
        queryKey: ['careGaps', activePatientId, source],
        queryFn: async () => {
            try {
                return await getDataSource().getCareGaps(activePatientId);
            } catch (err: any) {
                if (err?.code === 'NETWORK' || err?.status >= 500) {
                    handleBackendFailure();
                }
                throw err;
            }
        },
        staleTime: 60000,
        refetchOnWindowFocus: source !== 'offline'
    });
}
