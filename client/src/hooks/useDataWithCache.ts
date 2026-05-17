/**
 * Custom Hook: useDataWithCache
 * Lazy loads data with IndexedDB caching
 * 
 * Usage:
 * const { data, loading, error } = useDataWithCache('mainData', '/data/main_data.json');
 */

import { useState, useCallback, useEffect } from 'react';
import { loadDataWithCache } from '@/lib/indexedDB';

interface UseDataWithCacheOptions {
  autoLoad?: boolean; // Load immediately on mount
  onError?: (error: Error) => void;
}

interface UseDataWithCacheResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  load: () => Promise<void>;
  clear: () => void;
}

export const useDataWithCache = <T = any>(
  key: string,
  url: string,
  options?: UseDataWithCacheOptions
): UseDataWithCacheResult<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (loading) return; // Prevent multiple simultaneous loads
    if (data) return; // Already loaded

    setLoading(true);
    setError(null);

    try {
      const result = await loadDataWithCache(key, url);
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      options?.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [key, url, data, loading, options]);

  const clear = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (options?.autoLoad) {
      load();
    }
  }, [load, options?.autoLoad]);

  return { data, loading, error, load, clear };
};
