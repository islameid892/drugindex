import { useState, useEffect, useRef, useMemo } from 'react';
import { trpc } from '@/lib/trpc';

const ITEMS_PER_PAGE = 10;

export function useHomeSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(['Panadol', 'Diabetes', 'Hypertension', 'Aspirin', 'Ibuprofen']);
  const [trendingSearches] = useState<string[]>(['Panadol', 'Diabetes', 'Hypertension', 'Aspirin', 'E11', 'Metformin', 'Lisinopril']);
  const lastTrackedQuery = useRef('');

  // Debounce query for API calls (350ms as per optimization plan)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset page when query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  // Grouped search from API (server-side) - groups results by scientific name
  // Skip API call if query is less than 2 characters
  // Trim the query before sending to API
  const searchQuery = trpc.data.searchGrouped.useQuery(
    { query: debouncedQuery.trim(), limit: 30 },
    { 
      enabled: debouncedQuery.trim().length >= 2,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
      gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
      retry: 2,                  // Retry failed requests
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    }
  );

  const searchLoading = searchQuery.isFetching;
  const groupedResults = searchQuery.data ?? [];

  // Paginate results
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return groupedResults.slice(startIndex, endIndex);
  }, [groupedResults, currentPage]);

  const totalPages = Math.ceil(groupedResults.length / ITEMS_PER_PAGE);

  // Track search mutation
  const trackSearchMutation = trpc.analytics.trackSearch.useMutation();

  // Auto-scroll to search results on desktop when query changes
  useEffect(() => {
    if (query.trim().length > 0) {
      // Delay scroll to allow sticky search bar to render first
      const timer = setTimeout(() => {
        const resultsSection = document.querySelector('[data-search-results]');
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [query]);

  // Track search when user stops typing (debounced)
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
    }, 1000); // Reduced from 1500ms to 1000ms

    return () => clearTimeout(timer);
  }, [query, groupedResults.length]);

  const handleQueryChange = (val: string) => {
    // Preserve raw input including spaces - only trim when sending to API
    // This prevents spaces from disappearing as the user types
    setQuery(val);
    // Show suggestions only if trimmed query is not empty
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
  };
}
