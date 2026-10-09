import { useInfiniteQuery } from '@tanstack/react-query';
import { usePatientData } from '@/context/usePatientData';

export function useTimeline() {
    const { getDataSource, activePatientId, source, handleBackendFailure, activeFilter } = usePatientData();

    return useInfiniteQuery({
        queryKey: ['timeline', activePatientId, source, activeFilter],
        queryFn: async ({ pageParam = undefined }: { pageParam?: string }) => {
            try {
                const filter = activeFilter === 'all' ? undefined : activeFilter;
                return await getDataSource().getTimeline(activePatientId, filter, pageParam);
            } catch (err: any) {
                if (err?.code === 'NETWORK' || err?.status >= 500) {
                    handleBackendFailure();
                }
                throw err;
            }
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: undefined as string | undefined,
        staleTime: 60000,
        refetchOnWindowFocus: source !== 'offline'
    });
}
