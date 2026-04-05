import { trpc } from '@/lib/trpc';

export function useHomeStats() {
  // Load stats from API
  const statsQuery = trpc.data.stats.useQuery(undefined, { staleTime: 60000 });
  
  const stats = {
    medications: statsQuery.data?.totalDrugEntries ?? 0,
    conditions: statsQuery.data?.uniqueIndications ?? 0,
    codes: (statsQuery.data?.totalCodes ?? 0) + (statsQuery.data?.totalBranches ?? 0),
  };

  const loading = statsQuery.isLoading && !statsQuery.data;

  return {
    stats,
    loading,
  };
}
