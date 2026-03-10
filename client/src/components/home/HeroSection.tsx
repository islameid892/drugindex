import { SearchBar } from "@/components/SearchBar";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { Sparkles } from "lucide-react";

interface HeroSectionProps {
  query: string;
  onQueryChange: (val: string) => void;
  showSuggestions: boolean;
  onSuggestionsOpen: (open: boolean) => void;
  onSuggestionSelect: (suggestion: string) => void;
  recentSearches: string[];
  trendingSearches: string[];
  children?: React.ReactNode;
}

export function HeroSection({
  query,
  onQueryChange,
  showSuggestions,
  onSuggestionsOpen,
  onSuggestionSelect,
  recentSearches,
  trendingSearches,
  children,
}: HeroSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-50 via-emerald-50 to-sky-100 dark:from-sky-950 dark:via-emerald-950 dark:to-sky-900 border border-sky-100 dark:border-sky-800 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700" id="hero-section">
      {/* Background Image - Optimized with lazy loading */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: "url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663263105436/BxzzjCwZPqngcueX.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          willChange: 'background-image',
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 dark:from-black/40 via-transparent to-sky-50/40 dark:to-sky-950/40" />
      
      {/* Content */}
      <div className="relative px-6 py-16 md:px-12 md:py-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur border border-sky-200 dark:border-sky-800 shadow-sm">
          <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">Comprehensive Medical Database</span>
        </div>
        
        <div className="space-y-4">
          <h2 className="font-display text-5xl md:text-6xl text-foreground tracking-tight">
            Find Codes & Medications
          </h2>
          <p className="font-serif-elegant text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed italic">
            Search by scientific name, trade name, indication, or ICD-10 code. Get instant access to comprehensive medical coding information.
          </p>
        </div>
        
        {/* Search Bar in Hero */}
        <div className="max-w-2xl mx-auto pt-4 relative">
          <SearchBar 
            value={query} 
            onChange={onQueryChange} 
            placeholder="Try 'Diabetes', 'Panadol', or 'E11'..."
            autoFocus={false}
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
        
        {/* Browse by Category */}
        {children}
      </div>
    </div>
  );
}
