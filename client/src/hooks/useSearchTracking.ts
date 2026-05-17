import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Custom hook to track search queries with actual response time measurement.
 * Fires once per unique query after debounce, recording the real elapsed time.
 *
 * @param query       - The search query to track
 * @param resultCount - Number of results returned (0 while loading)
 * @param isLoading   - Whether the search is still in progress
 * @param debounceMs  - Debounce delay in milliseconds (default: 800ms)
 */
export function useSearchTracking(
  query: string,
  resultCount: number = 0,
  isLoading: boolean = false,
  debounceMs: number = 800
) {
  const lastTrackedQuery = useRef<string>('');
  const searchStartTime = useRef<number>(0);
  const pendingQuery = useRef<string>('');
  const trackSearchMutation = trpc.analytics.trackSearch.useMutation();

  // Record start time when query changes
  useEffect(() => {
    if (query && query.trim().length >= 2) {
      searchStartTime.current = Date.now();
      pendingQuery.current = query.trim();
    }
  }, [query]);

  // Record analytics when loading finishes and we have results
  useEffect(() => {
    if (isLoading) return;
    if (!pendingQuery.current || pendingQuery.current.length < 2) return;
    if (pendingQuery.current === lastTrackedQuery.current) return;

    const trimmedQuery = pendingQuery.current;
    const responseTime = searchStartTime.current > 0
      ? Date.now() - searchStartTime.current
      : 0;

    const timer = setTimeout(() => {
      lastTrackedQuery.current = trimmedQuery;
      trackSearchMutation.mutate({
        query: trimmedQuery,
        resultCount,
        responseTime,
      });
    }, debounceMs);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, resultCount]);
}
