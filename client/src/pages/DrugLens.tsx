import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { LayoutGrid, List, Search, X, ChevronLeft, ChevronRight, ExternalLink, AlertTriangle, Baby, Pill, Zap, SlidersHorizontal, ChevronDown } from "lucide-react";

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
    A: "bg-emerald-100 text-emerald-700 border-emerald-300",
    B: "bg-sky-100 text-sky-700 border-sky-300",
    C: "bg-amber-100 text-amber-700 border-amber-300",
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
    <div className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#c9a227]/40 hover:-translate-y-0.5">
      {/* Card Header */}
      <div
        className="px-5 py-4 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d2347 50%, #0a3d7a 100%)" }}
      >
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "linear-gradient(rgba(201,162,39,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(201,162,39,0.3) 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }}
        />
        <div className="relative z-10 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-extrabold text-lg leading-tight tracking-wide truncate">
              {drug.tradeName.toUpperCase()}
            </h3>
            <p className="text-[#c9a227]/80 text-xs mt-0.5 font-medium truncate">{drug.scientificName}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {drug.price && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #c9a227, #f0d060)", color: "#0a1628" }}
              >
                SAR {drug.price}
              </span>
            )}
            <PregnancyBadge category={drug.pregnancyCategory} />
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 space-y-3">
        {/* Image link + Action row */}
        <div className="flex gap-3">
          <a
            href={googleImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 h-14 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl flex items-center justify-center hover:from-blue-50 hover:to-blue-100 hover:border-blue-200 transition-all flex-shrink-0 group/img"
            title="Search drug image on Google"
          >
            <Pill className="h-6 w-6 text-gray-300 group-hover/img:text-[#0066cc] transition-colors" />
          </a>
          <div className="flex-1 min-w-0">
            {drug.pharmacologicalAction && (
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{drug.pharmacologicalAction}</p>
            )}
          </div>
        </div>

        {/* Standard Dose */}
        {drug.standardDose && (
          <div className="bg-blue-50 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-0.5">Standard Dose</span>
            <p className="text-xs text-blue-800 line-clamp-2 leading-relaxed">{drug.standardDose}</p>
          </div>
        )}

        {/* Black Box Warning */}
        {drug.blackBoxWarning && (
          <div className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 line-clamp-1">{drug.blackBoxWarning}</p>
          </div>
        )}

        {/* Quick Info Icons */}
        <div className="flex items-center gap-3 pt-1">
          {drug.uses && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Pill className="h-3.5 w-3.5 text-[#0066cc]" />
              <span>Uses</span>
            </div>
          )}
          {(drug.contraindicatedInteractions || drug.majorInteractions) && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Interactions</span>
            </div>
          )}
          {drug.neonatalDose && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Baby className="h-3.5 w-3.5 text-pink-400" />
              <span>Neonatal</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onViewAlternatives(drug)}
            className="flex-1 text-xs font-semibold py-2 rounded-xl border border-[#0066cc]/30 text-[#0066cc] hover:bg-blue-50 transition-colors"
          >
            Alternatives
          </button>
          <button
            onClick={() => onViewDetails(drug)}
            className="flex-1 text-xs font-bold py-2 rounded-xl text-white transition-all"
            style={{ background: "linear-gradient(135deg, #0a1628, #0d3a7a)" }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Drug Detail Modal ────────────────────────────────────────────────────────
function DrugDetailModal({ drug, onClose }: { drug: Drug; onClose: () => void }) {
  const fields: { label: string; value: string | null; icon?: React.ReactNode; danger?: boolean }[] = [
    { label: "Scientific Name", value: drug.scientificName },
    { label: "Trade Name", value: drug.tradeName },
    { label: "Price (SAR)", value: drug.price },
    { label: "Pharmacological Action", value: drug.pharmacologicalAction },
    { label: "Uses (Approved + Off-label)", value: drug.uses },
    { label: "Standard Dose", value: drug.standardDose },
    { label: "Adjusted Dose (Renal/Hepatic)", value: drug.adjustedDose },
    { label: "Neonatal Dose (NeoFax/BNF)", value: drug.neonatalDose },
    { label: "Dose Source", value: drug.doseSource },
    { label: "Pregnancy Category (FDA)", value: drug.pregnancyCategory },
    { label: "Black Box Warning", value: drug.blackBoxWarning, danger: true },
    { label: "Contraindicated Interactions", value: drug.contraindicatedInteractions, danger: true },
    { label: "Major Interactions", value: drug.majorInteractions, danger: true },
    { label: "Moderate Interactions", value: drug.moderateInteractions },
    { label: "Minor Interactions", value: drug.minorInteractions },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="px-6 py-5 flex items-start justify-between flex-shrink-0 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d2347 50%, #0a3d7a 100%)" }}
        >
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "linear-gradient(rgba(201,162,39,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(201,162,39,0.3) 1px, transparent 1px)",
              backgroundSize: "20px 20px"
            }}
          />
          <div className="relative z-10">
            <h2 className="text-white font-extrabold text-xl tracking-wide">{drug.tradeName.toUpperCase()}</h2>
            <p className="text-[#c9a227]/80 text-sm mt-0.5">{drug.scientificName}</p>
            {drug.price && (
              <span className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: "linear-gradient(135deg, #c9a227, #f0d060)", color: "#0a1628" }}>
                SAR {drug.price}
              </span>
            )}
          </div>
          <button onClick={onClose} className="relative z-10 text-white/60 hover:text-white transition-colors ml-4 flex-shrink-0">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {fields.map(({ label, value, danger }) => value ? (
            <div key={label} className={`rounded-xl p-3 ${danger ? "bg-red-50 border border-red-100" : "bg-gray-50"}`}>
              <span className={`text-xs font-bold uppercase tracking-wider block mb-1 ${danger ? "text-red-500" : "text-gray-400"}`}>
                {danger && "⚠ "}{label}
              </span>
              <p className={`text-sm leading-relaxed ${danger ? "text-red-800" : "text-gray-800"}`}>{value}</p>
            </div>
          ) : null)}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <a
            href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(drug.tradeName + " medication")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Search Image
          </a>
          <button
            onClick={onClose}
            className="flex-1 text-white rounded-xl py-2.5 text-sm font-bold transition-all"
            style={{ background: "linear-gradient(135deg, #0a1628, #0d3a7a)" }}
          >
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0a1628 0%, #0d2347 50%, #0a3d7a 100%)" }}
        >
          <div>
            <h2 className="text-white font-bold text-lg">Alternatives</h2>
            <p className="text-[#c9a227]/80 text-sm">Based on: {drug.scientificName}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X className="h-6 w-6" /></button>
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
                  className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-[#c9a227] hover:bg-amber-50/30 transition-all flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-[#0a1628] text-sm">{alt.tradeName.toUpperCase()}</p>
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
  const [hasSearched, setHasSearched] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ITEMS_PER_PAGE = 12;

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      if (query.trim().length >= 2) setHasSearched(true);
    }, 300);
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

  // Main search — only fetch when user has typed
  const { data: searchResult, isLoading } = trpc.drugLens.search.useQuery(
    { query: debouncedQuery, filterBy: filterType, page, limit: ITEMS_PER_PAGE },
    { enabled: debouncedQuery.trim().length >= 2 }
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
    setHasSearched(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [filterType]);

  const handleClearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setHasSearched(false);
    setShowAutocomplete(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Pagination pages array (max 7 visible)
  const getPaginationPages = () => {
    const maxVisible = 7;
    if (totalPages <= maxVisible) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, page - half);
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: "#f0f4f8" }}>

      {/* ── Sticky Top Nav Bar ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/10 shadow-lg"
        style={{ background: "rgba(10,22,40,0.97)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663263105436/a2JMvfTkjxD7rpSD5GgnMY/saudi-drug-lens-logo-9UC9jAWg9dSvnP8WFQhAFr.png"
                alt="Saudi Drug Lens"
                className="h-9 w-9 rounded-xl object-contain"
              />
              <div>
                <span className="font-extrabold text-white text-base tracking-tight">Saudi Drug Lens</span>
                <span className="text-[#c9a227] text-xs block leading-none font-medium">مرجع الأدوية السعودي</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-5">
                <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">← Home</Link>
                <span className="text-sm text-[#c9a227] font-bold">Drug Database</span>
              </div>
              {stats && (
                <div className="flex items-center gap-1.5 text-xs border border-[#c9a227]/30 px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(201,162,39,0.1)" }}>
                  <Pill className="h-3.5 w-3.5 text-[#c9a227]" />
                  <span className="font-bold text-[#c9a227]">{stats.total.toLocaleString()}</span>
                  <span className="text-gray-400 hidden sm:inline">drugs</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Full-Screen Luxury Hero ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #020d1f 0%, #041530 20%, #071e45 40%, #0a2d6e 60%, #0d3d8f 80%, #0a2d6e 100%)",
          minHeight: hasSearched ? "260px" : "100vh",
          transition: "min-height 0.6s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Luxury star field background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Large glowing orbs */}
          <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #1a6bff 0%, transparent 65%)" }} />
          <div className="absolute bottom-[-15%] right-[-5%] w-[600px] h-[600px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #c9a227 0%, transparent 65%)" }} />
          <div className="absolute top-[40%] right-[15%] w-[300px] h-[300px] rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #00d4ff 0%, transparent 65%)" }} />
          <div className="absolute top-[20%] left-[30%] w-[200px] h-[200px] rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 65%)" }} />

          {/* Geometric grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          {/* Gold diagonal lines */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "repeating-linear-gradient(45deg, #c9a227 0px, #c9a227 1px, transparent 1px, transparent 60px)",
            }}
          />

          {/* Floating particles (CSS dots) */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                background: i % 3 === 0 ? "#c9a227" : i % 3 === 1 ? "#4fc3f7" : "#ffffff",
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.2,
              }}
            />
          ))}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 flex flex-col items-center">

          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <div
              className="relative mb-5"
              style={{
                filter: "drop-shadow(0 0 40px rgba(201,162,39,0.4)) drop-shadow(0 0 80px rgba(13,61,143,0.6))",
              }}
            >
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663263105436/a2JMvfTkjxD7rpSD5GgnMY/saudi-drug-lens-logo-9UC9jAWg9dSvnP8WFQhAFr.png"
                alt="Saudi Drug Lens"
                className="w-36 h-36 sm:w-44 sm:h-44 object-contain"
              />
            </div>

            {/* Brand Name */}
            <div className="text-center">
              <h1 className="font-black tracking-widest uppercase leading-none"
                style={{
                  fontSize: "clamp(2rem, 6vw, 3.5rem)",
                  background: "linear-gradient(135deg, #ffffff 0%, #e8f4ff 30%, #c9a227 60%, #f0d060 80%, #c9a227 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "none",
                  letterSpacing: "0.15em",
                }}>
                Saudi Drug Lens
              </h1>
              <p className="text-[#c9a227]/70 text-base sm:text-lg mt-1 font-medium tracking-[0.2em]"
                style={{ fontFamily: "'Cairo', sans-serif" }}>
                مرجع الأدوية السعودي الشامل
              </p>
              {stats && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#c9a227]/50" />
                  <span className="text-xs text-gray-400 font-medium tracking-widest uppercase">
                    {stats.total.toLocaleString()} Drugs Available
                  </span>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#c9a227]/50" />
                </div>
              )}
            </div>
          </div>

          {/* ── Search Bar ── */}
          <div className="w-full max-w-2xl" ref={searchRef}>
            <div className="relative">
              <div
                className="flex items-center rounded-2xl px-5 py-4 gap-3 shadow-2xl"
                style={{
                  background: "rgba(255,255,255,0.97)",
                  boxShadow: "0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,162,39,0.2), inset 0 1px 0 rgba(255,255,255,0.8)",
                }}
              >
                <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowAutocomplete(true); }}
                  onFocus={() => query.length >= 2 && setShowAutocomplete(true)}
                  placeholder="Search by trade name, scientific name..."
                  className="flex-1 outline-none text-base text-gray-800 placeholder-gray-400 bg-transparent min-w-0 font-medium"
                />
                {query && (
                  <button onClick={handleClearSearch} className="text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showAutocomplete && suggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                  {suggestions.map((s: { id: number; tradeName: string; scientificName: string }) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-5 py-3 hover:bg-amber-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
                      onMouseDown={e => { e.preventDefault(); handleSelectSuggestion(s); }}
                    >
                      <Search className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-gray-800">{s.tradeName}</span>
                        <span className="text-xs text-gray-400 ml-2">{s.scientificName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Button (below search) */}
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(201,162,39,0.3)",
                    color: "#c9a227",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Filter: {filterLabel}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showFilterDropdown ? "rotate-180" : ""}`} />
                </button>
                {showFilterDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 min-w-[180px]">
                    {(["both", "trade", "scientific"] as FilterType[]).map(ft => (
                      <button
                        key={ft}
                        onClick={() => { setFilterType(ft); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-amber-50 transition-colors ${filterType === ft ? "text-[#0a1628] font-bold bg-amber-50" : "text-gray-700"}`}
                      >
                        {filterType === ft && <span className="text-[#c9a227]">✓</span>}
                        {ft === "both" ? "All Names" : ft === "trade" ? "Trade Name" : "Scientific Name"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View Toggle (only visible after search) */}
              {hasSearched && (
                <div className="flex items-center rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(201,162,39,0.3)", background: "rgba(255,255,255,0.08)" }}>
                  <button
                    onClick={() => setViewMode("card")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                      viewMode === "card" ? "bg-white text-[#0a1628]" : "text-[#c9a227] hover:bg-white/10"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                      viewMode === "list" ? "bg-white text-[#0a1628]" : "text-[#c9a227] hover:bg-white/10"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">List</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Hint text (only before search) */}
          {!hasSearched && (
            <p className="mt-6 text-gray-500 text-sm text-center tracking-wide">
              Search across <span className="text-[#c9a227] font-semibold">{stats?.total.toLocaleString() ?? "8,164"}</span> drugs — doses, interactions, pregnancy categories & more
            </p>
          )}
        </div>

        {/* Bottom wave separator (only after search) */}
        {hasSearched && (
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 40 C360 0 1080 0 1440 40 L1440 40 L0 40 Z" fill="#f0f4f8" />
            </svg>
          </div>
        )}
      </div>

      {/* ── Results Section (only after search) ────────────────────────────── */}
      {hasSearched && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Results count */}
          {debouncedQuery && (
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                {isLoading ? "Searching..." : (
                  <span>
                    <span className="font-bold text-gray-800">{totalCount.toLocaleString()}</span> results for{" "}
                    <span className="text-[#0a1628] font-semibold">"{debouncedQuery}"</span>
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
                <div className="absolute inset-0 rounded-full border-4 border-t-[#c9a227] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              </div>
              <p className="mt-4 text-gray-400 text-sm font-medium">Searching drug database...</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && drugs.length === 0 && debouncedQuery.length >= 2 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "linear-gradient(135deg, #0a1628, #0d2347)" }}>
                <Search className="h-10 w-10 text-[#c9a227]" />
              </div>
              <p className="text-gray-700 font-bold text-lg">No drugs found</p>
              <p className="text-gray-400 text-sm mt-1">Try a different name or change the filter</p>
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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #0a1628, #0d2347)" }}>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#c9a227] uppercase tracking-wide">Image</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#c9a227] uppercase tracking-wide">Trade Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#c9a227] uppercase tracking-wide">Scientific Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#c9a227] uppercase tracking-wide">Price</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#c9a227] uppercase tracking-wide">Action</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#c9a227] uppercase tracking-wide">Dose</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#c9a227] uppercase tracking-wide">Preg.</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-[#c9a227] uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drugs.map((drug, idx) => (
                      <tr key={drug.id} className={`border-b border-gray-100 hover:bg-amber-50/30 transition-colors ${idx % 2 === 1 ? "bg-gray-50/50" : "bg-white"}`}>
                        <td className="px-4 py-3">
                          <a
                            href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(drug.tradeName + " medication")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-11 h-11 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors"
                          >
                            <Pill className="h-5 w-5 text-gray-400" />
                          </a>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-extrabold text-[#0a1628] text-sm">{drug.tradeName.toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px]">
                          <span className="line-clamp-2">{drug.scientificName}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
                          {drug.price ? (
                            <span className="px-2 py-0.5 rounded-full text-[#0a1628] font-bold"
                              style={{ background: "linear-gradient(135deg, #c9a227, #f0d060)" }}>
                              SAR {drug.price}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px]">
                          <span className="line-clamp-2">{drug.pharmacologicalAction || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px]">
                          <span className="line-clamp-2">{drug.standardDose || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <PregnancyBadge category={drug.pregnancyCategory} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setAlternativesDrug(drug)}
                              className="text-[#0066cc] text-xs font-semibold hover:underline whitespace-nowrap"
                            >
                              Alt.
                            </button>
                            <button
                              onClick={() => setSelectedDrug(drug)}
                              className="text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
                              style={{ background: "linear-gradient(135deg, #0a1628, #0d3a7a)" }}
                            >
                              Details
                            </button>
                          </div>
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
            <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
              <p className="text-sm text-gray-500">
                Page <span className="font-bold text-gray-700">{page}</span> of <span className="font-bold text-gray-700">{totalPages}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Prev</span>
                </button>
                {getPaginationPages().map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                      pageNum === page
                        ? "text-white shadow-md"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                    style={pageNum === page ? { background: "linear-gradient(135deg, #0a1628, #0d3a7a)" } : {}}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </main>
      )}

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
