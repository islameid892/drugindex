import { trpc } from '@/lib/trpc';
import { useState, useEffect } from 'react';

// Default stats to show while loading
const DEFAULT_STATS = {
  medications: 56388,
  conditions: 808,
  codes: 38853,
};

export function useHomeStats() {
  const [cachedStats, setCachedStats] = useState(() => {
    // Try to load from localStorage
    try {
      const cached = localStorage.getItem('homeStats');
      return cached ? JSON.parse(cached) : DEFAULT_STATS;
    } catch {
      return DEFAULT_STATS;
    }
  });

  // Load stats from API
  const statsQuery = trpc.data.stats.useQuery(undefined, { 
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Update cached stats when new data arrives
  useEffect(() => {
    if (statsQuery.data) {
      const newStats = {
        medications: statsQuery.data.totalDrugEntries ?? DEFAULT_STATS.medications,
        conditions: statsQuery.data.uniqueIndications ?? DEFAULT_STATS.conditions,
        codes: (statsQuery.data.totalCodes ?? 0) + (statsQuery.data.totalBranches ?? 0),
      };
      setCachedStats(newStats);
      // Persist to localStorage
      try {
        localStorage.setItem('homeStats', JSON.stringify(newStats));
      } catch {
        // Silently fail if localStorage is not available
      }
    }
  }, [statsQuery.data]);
  
  const stats = {
    medications: statsQuery.data?.totalDrugEntries ?? cachedStats.medications,
    conditions: statsQuery.data?.uniqueIndications ?? cachedStats.conditions,
    codes: (statsQuery.data?.totalCodes ?? 0) + (statsQuery.data?.totalBranches ?? 0) || cachedStats.codes,
  };

  // Show loading only if we don't have any data at all
  const loading = statsQuery.isLoading && !statsQuery.data && !cachedStats;
  const isStale = statsQuery.isLoading && !statsQuery.data && cachedStats;

  return {
    stats,
    loading,
    isStale, // Indicate if we're showing cached data
    error: statsQuery.error,
  };
}
