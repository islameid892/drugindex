import { SearchBar } from "@/components/SearchBar";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { AdvancedSearchFAB } from "@/components/AdvancedSearchFAB";
import { Stethoscope } from "lucide-react";

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
          backgroundImage: "url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663263105436/BxzzjCwZPqngcueX.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Soft radial glow top-center */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-sky-300/20 dark:bg-sky-500/10 blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative px-6 pt-12 pb-10 md:px-14 md:pt-16 md:pb-12 text-center">

        {/* Eyebrow label */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full bg-sky-600/10 dark:bg-sky-400/10 border border-sky-200 dark:border-sky-700/60">
          <Stethoscope className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span className="text-xs font-semibold tracking-widest uppercase text-sky-700 dark:text-sky-300">
            Comprehensive Medical Database
          </span>
        </div>

        {/* Main Title */}
        <h2 className="font-hero-title text-[2.6rem] sm:text-5xl md:text-[3.5rem] text-slate-900 dark:text-white mb-4">
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
        <p className="font-hero-body text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto mb-8">
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

        {/* Advanced Search Button */}
        <div className="mt-4 flex flex-col items-center gap-3">
          <AdvancedSearchFAB variant="inline" />
          {/* Drug Lens Button */}
          <a href="/drug-lens" className="group flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M8 11h6"/><path d="M11 8v6"/></svg>
            <span>Drug Lens</span>
            <span className="text-emerald-200 text-xs font-normal">Drug Reference</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
        </div>
      </div>

      {/* Browse by Category — rendered as children */}
      {children && (
        <div className="relative border-t border-sky-100 dark:border-sky-800/40 px-6 py-8 md:px-14">
          {children}
        </div>
      )}
    </div>
  );
}
