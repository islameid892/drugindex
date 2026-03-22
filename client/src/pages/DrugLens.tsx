import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { LayoutGrid, List, Search, X, ChevronLeft, ChevronRight, ExternalLink, Shuffle, AlertTriangle, Baby, Pill, Activity, Zap } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Drug {
  id: number;
  scientificName: string;
  tradeName: string;
  price: string | null;
  pharmacologicalAction: string | null;
  blackBoxWarning: string | null;
  uses: string | null;
  pregnancyCategory: string | null;
  standardDose: string | null;
  adjustedDose: string | null;
  neonatalDose: string | null;
  doseSource: string | null;
  contraindicatedInteractions: string | null;
  majorInteractions: string | null;
  moderateInteractions: string | null;
  minorInteractions: string | null;
}

type FilterType = "both" | "trade" | "scientific";
type ViewMode = "card" | "list";

// ─── Pregnancy Category Badge ─────────────────────────────────────────────────
function PregnancyBadge({ category }: { category: string | null }) {
  if (!category) return null;
  const cat = category.trim().toUpperCase();
  const colors: Record<string, string> = {
    A: "bg-green-100 text-green-700 border-green-300",
    B: "bg-blue-100 text-blue-700 border-blue-300",
    C: "bg-yellow-100 text-yellow-700 border-yellow-300",
    D: "bg-orange-100 text-orange-700 border-orange-300",
    X: "bg-red-100 text-red-700 border-red-300",
  };
  const letter = cat.charAt(0);
  const colorClass = colors[letter] || "bg-gray-100 text-gray-700 border-gray-300";
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-bold ${colorClass}`}>
      {letter}
    </span>
  );
}

// ─── Drug Card ────────────────────────────────────────────────────────────────
function DrugCard({ drug, onViewDetails, onViewAlternatives }: {
  drug: Drug;
  onViewDetails: (drug: Drug) => void;
  onViewAlternatives: (drug: Drug) => void;
}) {
  const googleImageUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(drug.tradeName + " medication pill")}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Card Header - Blue */}
      <div className="bg-[#0066cc] px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-lg leading-tight tracking-wide">
            {drug.tradeName.toUpperCase()}
          </h3>
          <p className="text-blue-200 text-xs mt-0.5">({drug.scientificName})</p>
        </div>
        {drug.price && (
          <span className="bg-white text-[#0066cc] text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
            SAR {drug.price}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4">
        {/* Image + Action + Dose Row */}
        <div className="flex gap-3 mb-3">
          {/* Drug Image (Google link) */}
          <a
            href={googleImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-20 h-20 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 transition-colors group"
            title="Search image on Google"
          >
            <div className="text-center">
              <Pill className="h-6 w-6 text-gray-300 group-hover:text-blue-400 mx-auto mb-1" />
              <span className="text-xs text-gray-400 group-hover:text-blue-400">Image</span>
            </div>
          </a>

          {/* Pharmacological Action + Dose */}
          <div className="flex-1 min-w-0">
            {drug.pharmacologicalAction && (
              <div className="mb-2">
                <span className="text-xs font-semibold text-gray-600">Pharmacological Action: </span>
                <span className="text-xs text-gray-700 line-clamp-2">{drug.pharmacologicalAction}</span>
              </div>
            )}
            {drug.standardDose && (
              <div className="flex items-start gap-1.5">
                <Activity className="h-3.5 w-3.5 text-[#0066cc] mt-0.5 flex-shrink-0" />
                <span className="text-xs text-gray-700 line-clamp-2">
                  <span className="font-semibold">Standard Dose: </span>
                  {drug.standardDose}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Alternatives Button */}
        <button
          onClick={() => onViewAlternatives(drug)}
          className="w-full text-[#0066cc] border border-[#0066cc] rounded-lg py-1.5 text-xs font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 mb-3"
        >
          <Shuffle className="h-3.5 w-3.5" />
          Alternatives ↗
        </button>

        {/* Quick Info */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">Quick Info:</p>
          <div className="grid grid-cols-3 gap-2">
            {/* Uses */}
            <div className="flex flex-col items-center gap-1">
              <Pill className="h-4 w-4 text-[#0066cc]" />
              <span className="text-xs text-gray-500 text-center leading-tight line-clamp-2">
                {drug.uses ? drug.uses.split(/[,;]/)[0].trim() : "—"}
              </span>
            </div>
            {/* Interactions */}
            <div className="flex flex-col items-center gap-1">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-gray-500 text-center">
                {drug.contraindicatedInteractions ? "Contraindicated" :
                  drug.majorInteractions ? "Major" :
                  drug.moderateInteractions ? "Moderate" : "Minor"}
              </span>
            </div>
            {/* Pregnancy */}
            <div className="flex flex-col items-center gap-1">
              <Baby className="h-4 w-4 text-purple-500" />
              <PregnancyBadge category={drug.pregnancyCategory} />
            </div>
          </div>
        </div>

        {/* View Details Button */}
        <button
          onClick={() => onViewDetails(drug)}
          className="w-full mt-3 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg py-2 text-sm font-semibold transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

// ─── Drug Detail Modal ────────────────────────────────────────────────────────
function DrugDetailModal({ drug, onClose }: { drug: Drug; onClose: () => void }) {
  const sections = [
    { label: "Scientific Name", value: drug.scientificName, icon: <Pill className="h-4 w-4" /> },
    { label: "Price (SAR)", value: drug.price, icon: null },
    { label: "Pharmacological Action", value: drug.pharmacologicalAction, icon: null },
    { label: "Black Box Warning", value: drug.blackBoxWarning, icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
    { label: "Uses (Approved + Off-label)", value: drug.uses, icon: null },
    { label: "Pregnancy Category (FDA)", value: drug.pregnancyCategory, icon: <Baby className="h-4 w-4" /> },
    { label: "Standard Dose", value: drug.standardDose, icon: null },
    { label: "Adjusted Dose (Renal/Hepatic)", value: drug.adjustedDose, icon: null },
    { label: "Neonatal Dose (NeoFax/BNF)", value: drug.neonatalDose, icon: null },
    { label: "Dose Source", value: drug.doseSource, icon: null },
    { label: "Contraindicated Interactions", value: drug.contraindicatedInteractions, icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
    { label: "Major Interactions", value: drug.majorInteractions, icon: <Zap className="h-4 w-4 text-orange-500" /> },
    { label: "Moderate Interactions", value: drug.moderateInteractions, icon: null },
    { label: "Minor Interactions", value: drug.minorInteractions, icon: null },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="bg-[#0066cc] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-xl">{drug.tradeName.toUpperCase()}</h2>
            <p className="text-blue-200 text-sm">({drug.scientificName})</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="space-y-4">
            {sections.map(({ label, value, icon }) => value ? (
              <div key={label} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  {icon}
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</span>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{value}</p>
              </div>
            ) : null)}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <a
            href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(drug.tradeName + " medication")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-medium transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Search Image
          </a>
          <button onClick={onClose} className="flex-1 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-lg py-2 text-sm font-semibold transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Alternatives Modal ───────────────────────────────────────────────────────
function AlternativesModal({ drug, onClose, onSelectDrug }: {
  drug: Drug;
  onClose: () => void;
  onSelectDrug: (drug: Drug) => void;
}) {
  const { data: alternatives, isLoading } = trpc.drugLens.getAlternatives.useQuery({
    scientificName: drug.scientificName,
    excludeId: drug.id,
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-[#0066cc] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Alternatives</h2>
            <p className="text-blue-200 text-sm">Based on: {drug.scientificName}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200"><X className="h-6 w-6" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066cc]" />
            </div>
          ) : !alternatives || alternatives.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No alternatives found</p>
          ) : (
            <div className="space-y-2">
              {alternatives.map((alt: { id: number; tradeName: string; scientificName: string; price: string | null }) => (
                <button
                  key={alt.id}
                  onClick={() => { onSelectDrug(alt as Drug); onClose(); }}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-[#0066cc] hover:bg-blue-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-[#0066cc] text-sm">{alt.tradeName.toUpperCase()}</p>
                    <p className="text-xs text-gray-500">{alt.scientificName}</p>
                  </div>
                  {alt.price && <span className="text-xs font-semibold text-gray-600">SAR {alt.price}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DrugLens() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("both");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [page, setPage] = useState(1);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [alternativesDrug, setAlternativesDrug] = useState<Drug | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 12;

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset page on query change
  useEffect(() => { setPage(1); }, [debouncedQuery, filterType]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Autocomplete
  const { data: suggestions } = trpc.drugLens.autocomplete.useQuery(
    { query, filterBy: filterType },
    { enabled: query.length >= 2 }
  );

  // Main search
  const { data: searchResult, isLoading } = trpc.drugLens.search.useQuery(
    { query: debouncedQuery, filterBy: filterType, page, limit: ITEMS_PER_PAGE },
    {}
  );

  // Stats
  const { data: stats } = trpc.drugLens.getStats.useQuery();

  const drugs: Drug[] = (searchResult?.results as Drug[]) ?? [];
  const totalCount = searchResult?.total ?? 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const filterLabel = filterType === "trade" ? "Trade Name" : filterType === "scientific" ? "Scientific Name" : "All Names";

  const handleSelectSuggestion = useCallback((s: { id: number; tradeName: string; scientificName: string }) => {
    setQuery(filterType === "scientific" ? s.scientificName : s.tradeName);
    setShowAutocomplete(false);
  }, [filterType]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Sticky Top Nav Bar ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-[#0066cc] to-[#0044aa] rounded-xl flex items-center justify-center shadow-md">
                <Search className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-gray-900 text-lg tracking-tight">Drug Lens</span>
                <span className="text-xs text-gray-400 block leading-none">Comprehensive Drug Reference</span>
              </div>
            </div>
            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm text-gray-500 hover:text-[#0066cc] transition-colors font-medium">← Home</Link>
              <span className="text-sm text-[#0066cc] font-bold border-b-2 border-[#0066cc] pb-0.5">Drug Database</span>
            </div>
            {/* Stats pill */}
            {stats && (
              <div className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
                <Pill className="h-3.5 w-3.5 text-[#0066cc]" />
                <span className="font-bold text-[#0066cc]">{stats.total.toLocaleString()}</span>
                <span className="text-gray-500 hidden sm:inline">drugs</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Cinematic Hero Header ───────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #001a3d 0%, #003380 30%, #0055cc 60%, #0077ff 80%, #00aaff 100%)",
          minHeight: "280px",
        }}
      >
        {/* Animated grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glowing orbs */}
        <div className="absolute top-[-60px] left-[-60px] w-64 h-64 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #00ccff 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-40px] right-[-40px] w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #0044ff 0%, transparent 70%)" }} />
        <div className="absolute top-[30%] right-[20%] w-40 h-40 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }} />

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          {/* Badge */}
          <div className="flex justify-center mb-5">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
              <Activity className="h-3.5 w-3.5" />
              {stats ? `${stats.total.toLocaleString()} Drugs in Database` : "Comprehensive Drug Reference"}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-center text-white font-extrabold text-3xl sm:text-4xl md:text-5xl mb-2 tracking-tight">
            Drug <span className="text-[#66ccff]">Lens</span>
          </h1>
          <p className="text-center text-blue-200 text-sm sm:text-base mb-8 max-w-xl mx-auto">
            Search trade names, scientific names, doses, interactions & more
          </p>

          {/* ── Search Row ── */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3" ref={searchRef}>
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="flex items-center bg-white rounded-2xl px-4 py-3 gap-2 shadow-xl shadow-black/20">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowAutocomplete(true); }}
                  onFocus={() => query.length >= 2 && setShowAutocomplete(true)}
                  placeholder="Search for drugs by trade or scientific name..."
                  className="flex-1 outline-none text-sm text-gray-800 placeholder-gray-400 bg-transparent min-w-0"
                />
                {query && (
                  <button onClick={() => { setQuery(""); setShowAutocomplete(false); }} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {/* Autocomplete Dropdown */}
              {showAutocomplete && suggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                  {suggestions.map((s: { id: number; tradeName: string; scientificName: string }) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
                      onMouseDown={e => { e.preventDefault(); handleSelectSuggestion(s); }}
                    >
                      <Search className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-gray-800">{s.tradeName}</span>
                        <span className="text-xs text-gray-400 ml-2">{s.scientificName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter + View Toggle Row on mobile, inline on desktop */}
            <div className="flex gap-2 sm:gap-3 flex-shrink-0">
              {/* Filter Dropdown */}
              <div className="relative flex-1 sm:flex-none" ref={filterRef}>
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-white/15 backdrop-blur border border-white/30 hover:bg-white/25 rounded-2xl text-sm font-semibold text-white transition-colors whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Filter:</span>
                  <span>{filterLabel}</span>
                  <svg className={`h-4 w-4 transition-transform flex-shrink-0 ${showFilterDropdown ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showFilterDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 min-w-[180px]">
                    {(["both", "trade", "scientific"] as FilterType[]).map(ft => (
                      <button
                        key={ft}
                        onClick={() => { setFilterType(ft); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors ${filterType === ft ? "text-[#0066cc] font-bold bg-blue-50" : "text-gray-700"}`}
                      >
                        {filterType === ft && <span className="text-[#0066cc]">✓</span>}
                        {ft === "both" ? "All Names" : ft === "trade" ? "Trade Name" : "Scientific Name"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-white/15 backdrop-blur border border-white/30 rounded-2xl overflow-hidden flex-shrink-0">
                <button
                  onClick={() => setViewMode("card")}
                  className={`flex items-center gap-1.5 px-3 py-3 text-sm font-semibold transition-colors ${
                    viewMode === "card" ? "bg-white text-[#0066cc]" : "text-white hover:bg-white/10"
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden lg:inline">Cards</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-3 text-sm font-semibold transition-colors ${
                    viewMode === "list" ? "bg-white text-[#0066cc]" : "text-white hover:bg-white/10"
                  }`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden lg:inline">List</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 40 C360 0 1080 0 1440 40 L1440 40 L0 40 Z" fill="#f9fafb" />
          </svg>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Results count */}
        {debouncedQuery && (
          <p className="text-sm text-gray-500 mb-4">
            {isLoading ? "Searching..." : `${totalCount.toLocaleString()} results for "${debouncedQuery}"`}
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0066cc]" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && drugs.length === 0 && debouncedQuery && (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No drugs found for "{debouncedQuery}"</p>
            <p className="text-gray-400 text-sm mt-1">Try a different name or filter</p>
          </div>
        )}

        {/* Welcome state */}
        {!isLoading && drugs.length === 0 && !debouncedQuery && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-[#0066cc]" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Search Drug Lens</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Search by trade name or scientific name to find detailed drug information including doses, interactions, and pregnancy categories.
            </p>
            {stats && (
              <p className="text-[#0066cc] font-semibold mt-4">{stats.total.toLocaleString()} drugs available</p>
            )}
          </div>
        )}

        {/* ── Card View ─────────────────────────────────────────────────── */}
        {!isLoading && drugs.length > 0 && viewMode === "card" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {drugs.map(drug => (
              <DrugCard
                key={drug.id}
                drug={drug}
                onViewDetails={setSelectedDrug}
                onViewAlternatives={setAlternativesDrug}
              />
            ))}
          </div>
        )}

        {/* ── List View ─────────────────────────────────────────────────── */}
        {!isLoading && drugs.length > 0 && viewMode === "list" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Image</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trade Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Scientific Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price (SAR)</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Pharmacological Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Standard Dose</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alternatives</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Info</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drugs.map((drug, idx) => (
                    <tr key={drug.id} className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${idx % 2 === 1 ? "bg-blue-50/30" : "bg-white"}`}>
                      {/* Image */}
                      <td className="px-4 py-3">
                        <a
                          href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(drug.tradeName + " medication")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-12 h-12 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors"
                        >
                          <Pill className="h-5 w-5 text-gray-400" />
                        </a>
                      </td>
                      {/* Trade Name */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#0066cc] text-sm">{drug.tradeName.toUpperCase()}</span>
                      </td>
                      {/* Scientific Name */}
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[120px]">
                        <span className="line-clamp-2">{drug.scientificName}</span>
                      </td>
                      {/* Price */}
                      <td className="px-4 py-3 text-gray-700 text-xs font-medium whitespace-nowrap">
                        {drug.price ? `SAR ${drug.price}` : "—"}
                      </td>
                      {/* Pharmacological Action */}
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[180px]">
                        <span className="line-clamp-2">{drug.pharmacologicalAction || "—"}</span>
                      </td>
                      {/* Standard Dose */}
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px]">
                        <span className="line-clamp-2">{drug.standardDose || "—"}</span>
                      </td>
                      {/* Alternatives */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setAlternativesDrug(drug)}
                          className="text-[#0066cc] text-xs font-semibold hover:underline"
                        >
                          Alternatives
                        </button>
                      </td>
                      {/* Quick Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-center">
                            <Pill className="h-4 w-4 text-[#0066cc]" />
                            <span className="text-xs text-gray-400">Uses</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <Zap className="h-4 w-4 text-orange-500" />
                            <span className="text-xs text-gray-400">Inter.</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <PregnancyBadge category={drug.pregnancyCategory} />
                            <span className="text-xs text-gray-400">Preg.</span>
                          </div>
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedDrug(drug)}
                          className="bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}, showing {ITEMS_PER_PAGE} per page
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${pageNum === page ? "bg-[#0066cc] text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {selectedDrug && (
        <DrugDetailModal drug={selectedDrug} onClose={() => setSelectedDrug(null)} />
      )}
      {alternativesDrug && (
        <AlternativesModal
          drug={alternativesDrug}
          onClose={() => setAlternativesDrug(null)}
          onSelectDrug={setSelectedDrug}
        />
      )}
    </div>
  );
}
