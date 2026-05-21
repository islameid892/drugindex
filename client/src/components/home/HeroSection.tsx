import { SearchBar } from "@/components/SearchBar";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { AdvancedSearchModal } from "@/components/AdvancedSearchModal";
import { Stethoscope, Zap } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

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
  const [advancedSearchCount, setAdvancedSearchCount] = useState(0);
  const [drugLensCount, setDrugLensCount] = useState(0);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);

  const { data: featureStats } = trpc.analytics.getAllFeatureUsageStats.useQuery(
    { days: 7 },
    { refetchInterval: 60000 }
  );

  useEffect(() => {
    if (featureStats && Array.isArray(featureStats)) {
      const advCount = featureStats.find((s: any) => s.feature === "advanced_search")?.count || 0;
      const drugCount = featureStats.find((s: any) => s.feature === "drug_lens")?.count || 0;
      setAdvancedSearchCount(advCount);
      setDrugLensCount(drugCount);
    }
  }, [featureStats]);

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-sky-100 dark:border-sky-800/60 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700"
      id="hero-section"
      style={{
        background: "linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 40%, #e0f2fe 100%)",
      }}
    >
      {/* Dark mode background */}
      <div className="absolute inset-0 hidden dark:block" style={{
        background: "linear-gradient(135deg, #0c1a2e 0%, #0a1f1a 40%, #0c1a2e 100%)",
      }} />

      {/* Subtle background image */}
      <div
        className="absolute inset-0 opacity-20 dark:opacity-10"
        style={{
          backgroundImage: "url('https://d2xsxph8kpxj0f.cloudfront.net/310519663263105436/a2JMvfTkjxD7rpSD5GgnMY/hero-bg_63ae5717.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Soft radial glow top-center */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-sky-300/20 dark:bg-sky-500/10 blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative px-6 pt-12 pb-6 md:px-14 md:pt-16 md:pb-6 text-center">

        {/* Eyebrow label */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-4 sm:mb-6 rounded-full bg-sky-600/10 dark:bg-sky-400/10 border border-sky-200 dark:border-sky-700/60">
          <Stethoscope className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="text-xs font-semibold tracking-widest uppercase text-sky-700 dark:text-sky-300">
            Comprehensive Medical Database
          </span>
        </div>

        {/* Main Title */}
        <h2 className="font-hero-title text-2xl sm:text-4xl md:text-[4rem] text-slate-900 dark:text-white mb-2 sm:mb-4">
          Find{" "}
          <span
            className="relative inline-block"
            style={{
              background: "linear-gradient(90deg, #0284c7, #059669)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Codes
          </span>
          {" & "}
          <span
            className="relative inline-block"
            style={{
              background: "linear-gradient(90deg, #059669, #0284c7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Medications
          </span>
        </h2>

        {/* Subtitle */}
        <p className="font-hero-body text-sm sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-xl mx-auto mb-4 sm:mb-8">
          Search by scientific name, trade name, indication, or ICD-10 code.
          Get instant access to comprehensive medical coding information.
        </p>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto relative">
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

        {/* Action Buttons - Advanced Search & Drug Lens */}
        <div className="mt-4 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-2 sm:px-4">
          {/* Advanced Search Button - Enhanced */}
          <div>
            <button
              onClick={() => {
                // Track feature usage (non-blocking)
                try {
                  trpc.analytics.trackFeatureUsage.useMutation().mutate({
                    featureName: "advanced_search",
                    userAgent: navigator.userAgent,
                    referrer: document.referrer,
                  }, {
                    onError: (err: any) => console.warn("Feature tracking unavailable"),
                  });
                } catch (e) {
                  // Silently fail if tracking is not available
                }
                setIsAdvancedSearchOpen(true);
              }}
              className="group relative flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-sky-500 via-blue-500 to-blue-600 hover:from-sky-600 hover:via-blue-600 hover:to-blue-700 text-white font-bold text-xs sm:text-base md:text-lg shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 hover:scale-105 w-full sm:w-auto sm:min-w-[320px] border border-sky-300/30 hover:border-sky-300/60"             title="Open Advanced Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span className="hidden sm:inline">Advanced Search</span>
              <span className="sm:hidden">Advanced</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 opacity-70 group-hover:translate-x-1 transition-transform hidden sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              {advancedSearchCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-sky-500 text-white text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shadow-lg text-[10px] sm:text-xs">
                  {advancedSearchCount > 999 ? `${(advancedSearchCount / 1000).toFixed(1)}K` : advancedSearchCount}
                </span>
              )}
            </button>
            <AdvancedSearchModal isOpen={isAdvancedSearchOpen} onClose={() => setIsAdvancedSearchOpen(false)} />
          </div>

          {/* Drug Lens Button - Enhanced */}
          <a
            href="/drug-lens"
            onClick={() => {
              // Track feature usage (non-blocking)
              try {
                trpc.analytics.trackFeatureUsage.useMutation().mutate({
                  featureName: "drug_lens",
                  userAgent: navigator.userAgent,
                  referrer: document.referrer,
                }, {
                  onError: (err: any) => console.warn("Feature tracking unavailable"),
                });
              } catch (e) {
                // Silently fail if tracking is not available
              }
            }}
            className="group relative flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-8 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600 hover:from-emerald-600 hover:via-teal-600 hover:to-green-700 text-white font-bold text-xs sm:text-base md:text-lg shadow-lg sm:shadow-xl hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 hover:scale-105 w-full sm:w-auto sm:min-w-[320px] border border-emerald-300/30 hover:border-emerald-300/60"
            title="Go to Drug Lens"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <span className="hidden sm:inline">Drug Lens</span>
            <span className="sm:hidden">Drug Lens</span>
            <span className="text-emerald-100 text-xs font-normal hidden sm:inline">Drug Reference</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 opacity-70 group-hover:translate-x-1 transition-transform hidden sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            {drugLensCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-bold rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shadow-lg text-[10px] sm:text-xs">
                {drugLensCount > 999 ? `${(drugLensCount / 1000).toFixed(1)}K` : drugLensCount}
              </span>
            )}
          </a>
        </div>
      </div>

      {/* Browse by Category — rendered as children */}
      {children && (
        <div className="relative border-t border-sky-100 dark:border-sky-800/40 px-4 py-3 sm:px-6 sm:py-4 md:px-14">
          {children}
        </div>
      )}
    </div>
  );
}
