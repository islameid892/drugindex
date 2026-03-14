import { useState, useEffect, useRef, useMemo } from 'react';
import { trpc } from '@/lib/trpc';

const ITEMS_PER_PAGE = 10;

/** Safely extract the medications array from whatever shape tRPC/superjson returns */
function extractMedications(data: unknown): any[] {
  if (!data || typeof data !== 'object') return [];
  const d = data as Record<string, any>;

  // After superjson deserialization: { medications: [...], conditions: [...], codes: [...] }
  if (Array.isArray(d.medications)) return d.medications;

  // Fallback: raw tRPC shape { json: { medications: [...] } }
  if (d.json && typeof d.json === 'object' && Array.isArray((d.json as any).medications)) {
    return (d.json as any).medications;
  }

  // If the data itself is an array, return it
  if (Array.isArray(data)) return data;

  return [];
}

export function useHomeSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(['Panadol', 'Diabetes', 'Hypertension', 'Aspirin', 'Ibuprofen']);
  const [trendingSearches] = useState<string[]>(['Panadol', 'Diabetes', 'Hypertension', 'Aspirin', 'E11', 'Metformin', 'Lisinopril']);
  const lastTrackedQuery = useRef('');

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset page when query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  // Grouped search from API
  const searchQuery = trpc.data.searchGrouped.useQuery(
    { query: debouncedQuery.trim(), limit: 200 },
    {
      enabled: debouncedQuery.trim().length >= 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );

  const searchLoading = searchQuery.isFetching;
  const rawData = searchQuery.data;

  // Extract medications safely
  const groupedResults = useMemo((): any[] => {
    return extractMedications(rawData);
  }, [rawData]);

  // Paginate
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return groupedResults.slice(start, start + ITEMS_PER_PAGE);
  }, [groupedResults, currentPage]);

  const totalPages = Math.ceil(groupedResults.length / ITEMS_PER_PAGE);

  // Track search mutation
  const trackSearchMutation = trpc.analytics.trackSearch.useMutation();

  // Auto-scroll to results
  useEffect(() => {
    if (query.trim().length > 0) {
      const timer = setTimeout(() => {
        const el = document.querySelector('[data-search-results]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [query]);

  // Track search analytics
  useEffect(() => {
    if (!query || query.trim().length < 2) return;
    const trimmedQuery = query.trim();
    if (trimmedQuery === lastTrackedQuery.current) return;

    const timer = setTimeout(() => {
      lastTrackedQuery.current = trimmedQuery;
      trackSearchMutation.mutate({
        query: trimmedQuery,
        resultCount: groupedResults.length,
        responseTime: 0,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [query, groupedResults.length]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setShowSuggestions(val.trim().length > 0);
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    if (!recentSearches.includes(suggestion)) {
      setRecentSearches([suggestion, ...recentSearches.slice(0, 4)]);
    }
  };

  return {
    query,
    setQuery: handleQueryChange,
    debouncedQuery,
    currentPage,
    setCurrentPage,
    showSuggestions,
    setShowSuggestions,
    recentSearches,
    trendingSearches,
    searchLoading,
    groupedResults,
    paginatedResults,
    totalPages,
    handleSuggestionSelect,
    searchResponse: rawData,
  };
}
