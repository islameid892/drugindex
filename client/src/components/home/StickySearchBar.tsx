import { SearchBar } from "@/components/SearchBar";
import { SearchSuggestions } from "@/components/SearchSuggestions";

interface StickySearchBarProps {
  query: string;
  onQueryChange: (val: string) => void;
  showSuggestions: boolean;
  onSuggestionsOpen: (open: boolean) => void;
  onSuggestionSelect: (suggestion: string) => void;
  recentSearches: string[];
  trendingSearches: string[];
}

export function StickySearchBar({
  query,
  onQueryChange,
  showSuggestions,
  onSuggestionsOpen,
  onSuggestionSelect,
  recentSearches,
  trendingSearches,
}: StickySearchBarProps) {
  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="max-w-2xl mx-auto">
        <SearchBar 
          value={query} 
          onChange={onQueryChange} 
          placeholder="Try 'Diabetes', 'Panadol', or 'E11'..."
          autoFocus={true}
        />
        <SearchSuggestions
          query={query}
          isOpen={showSuggestions && !query.trim()}
          onSelect={onSuggestionSelect}
          onClose={() => onSuggestionsOpen(false)}
          recentSearches={recentSearches}
          trendingSearches={trendingSearches}
        />
      </div>
    </div>
  );
}
