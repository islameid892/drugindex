import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Custom hook to track search queries across the app with debouncing
 * Ensures each complete search is logged only once, not on every keystroke
 * 
 * @param query - The search query to track
 * @param resultCount - Number of results found (optional)
 * @param debounceMs - Debounce delay in milliseconds (default: 500ms)
 */
export function useSearchTracking(
  query: string,
  resultCount: number = 0,
  debounceMs: number = 500
) {
  const lastTrackedQuery = useRef<string>('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const trackSearchMutation = trpc.analytics.trackSearch.useMutation();

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Don't track empty or very short queries
    if (!query || query.trim().length < 2) {
      return;
    }

    const trimmedQuery = query.trim();

    // Don't track if it's the same as the last tracked query
    if (trimmedQuery === lastTrackedQuery.current) {
      return;
    }

    // Set debounce timer
    debounceTimer.current = setTimeout(() => {
      lastTrackedQuery.current = trimmedQuery;
      
      // Track the search
      trackSearchMutation.mutate({
        query: trimmedQuery,
        resultCount,
        responseTime: 0,
      });
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, resultCount, debounceMs, trackSearchMutation]);
}
