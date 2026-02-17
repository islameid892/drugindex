import { useEffect, useState, useRef } from "react";
import { TrendingUp, Clock, Search, X } from "lucide-react";

interface SearchSuggestionsProps {
  query: string;
  isOpen: boolean;
  onSelect: (suggestion: string) => void;
  onClose: () => void;
  recentSearches: string[];
  trendingSearches: string[];
}

export function SearchSuggestions({
  query,
  isOpen,
  onSelect,
  onClose,
  recentSearches,
  trendingSearches,
}: SearchSuggestionsProps) {
  const [filteredRecent, setFilteredRecent] = useState<string[]>([]);
  const [filteredTrending, setFilteredTrending] = useState<string[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setFilteredRecent(recentSearches.slice(0, 3));
      setFilteredTrending(trendingSearches.slice(0, 3));
      return;
    }

    const lowerQuery = query.toLowerCase();
    setFilteredRecent(
      recentSearches.filter((s) => s.toLowerCase().includes(lowerQuery)).slice(0, 3)
    );
    setFilteredTrending(
      trendingSearches.filter((s) => s.toLowerCase().includes(lowerQuery)).slice(0, 3)
    );
  }, [query, recentSearches, trendingSearches]);

  if (!isOpen || (!filteredRecent.length && !filteredTrending.length && !query.trim())) {
    return null;
  }

  return (
    <div
      ref={suggestionsRef}
      className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-40 overflow-hidden"
    >
      {/* Header with Close Button */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground">Suggestions</p>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
          aria-label="Close suggestions"
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
      </div>

      {/* Recent Searches */}
      {filteredRecent.length > 0 && (
        <div className="border-b border-border">
          <div className="px-4 py-2 bg-muted/50">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Recent
            </p>
          </div>
          <div className="divide-y divide-border">
            {filteredRecent.map((suggestion, idx) => (
              <button
                key={`recent-${idx}`}
                onClick={() => onSelect(suggestion)}
                className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3 group"
              >
                <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-sm text-foreground">{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending Searches */}
      {filteredTrending.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-muted/50">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              Trending Now
            </p>
          </div>
          <div className="divide-y divide-border">
            {filteredTrending.map((suggestion, idx) => (
              <button
                key={`trending-${idx}`}
                onClick={() => onSelect(suggestion)}
                className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center gap-3 group"
              >
                <TrendingUp className="h-4 w-4 text-sky-500 group-hover:text-sky-600 transition-colors" />
                <span className="text-sm text-foreground">{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
