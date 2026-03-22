import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  AlertTriangle,
  ExternalLink,
  ArrowLeft,
  Pill,
  RefreshCw,
  X,
  Info,
  Zap,
  Baby,
  Syringe,
  Shuffle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";

type FilterBy = "both" | "trade" | "scientific";
type ViewMode = "card" | "list";

interface Drug {
  id: number;
  tradeName: string;
  scientificName: string;
  price: string | null;
  pharmacologicalAction: string | null;
  uses: string | null;
  pregnancyCategory: string | null;
  standardDose: string | null;
  blackBoxWarning: string | null;
}

interface DrugDetail extends Drug {
  adjustedDose: string | null;
  neonatalDose: string | null;
  doseSource: string | null;
  contraindicatedInteractions: string | null;
  majorInteractions: string | null;
  moderateInteractions: string | null;
  minorInteractions: string | null;
}

// Pregnancy category color
function pregnancyCategoryBadge(cat: string | null) {
  if (!cat) return null;
  const colors: Record<string, string> = {
    A: "bg-green-100 text-green-800 border-green-200",
    B: "bg-blue-100 text-blue-800 border-blue-200",
    C: "bg-yellow-100 text-yellow-800 border-yellow-200",
    D: "bg-orange-100 text-orange-800 border-orange-200",
    X: "bg-red-100 text-red-800 border-red-200",
  };
  const letter = cat.trim().charAt(0).toUpperCase();
  const colorClass = colors[letter] || "bg-gray-100 text-gray-800 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
      Cat. {cat}
    </span>
  );
}

// Drug image search link
function getDrugImageUrl(tradeName: string) {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(tradeName + " medication")}`;
}

// Drug Card Component
function DrugCard({ drug, onViewDetail }: { drug: Drug; onViewDetail: (id: number) => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-sky-200 flex flex-col overflow-hidden group">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-sky-50 to-slate-50 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-base leading-tight truncate group-hover:text-sky-700 transition-colors">
              {drug.tradeName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate font-medium">
              {drug.scientificName}
            </p>
          </div>
          {/* Drug image link */}
          <a
            href={getDrugImageUrl(drug.tradeName)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center hover:bg-sky-200 transition-colors"
            title="Search drug image"
          >
            <Pill className="h-5 w-5 text-sky-600" />
          </a>
        </div>
        {/* Price & Pregnancy */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {drug.price && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              {drug.price}
            </span>
          )}
          {pregnancyCategoryBadge(drug.pregnancyCategory)}
          {drug.blackBoxWarning && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
              <AlertTriangle className="h-3 w-3" />
              BBW
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="px-4 py-3 flex-1 space-y-2">
        {drug.pharmacologicalAction && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Action</p>
            <p className="text-xs text-slate-700 line-clamp-2">{drug.pharmacologicalAction}</p>
          </div>
        )}
        {drug.uses && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Uses</p>
            <p className="text-xs text-slate-700 line-clamp-2">{drug.uses}</p>
          </div>
        )}
        {drug.standardDose && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Std. Dose</p>
            <p className="text-xs text-slate-700 line-clamp-1">{drug.standardDose}</p>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex gap-2">
        <Button
          size="sm"
          className="flex-1 text-xs bg-sky-600 hover:bg-sky-700 text-white"
          onClick={() => onViewDetail(drug.id)}
        >
          View Details
        </Button>
        <a
          href={getDrugImageUrl(drug.tradeName)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="sm" variant="outline" className="text-xs px-2">
            <ExternalLink className="h-3 w-3" />
          </Button>
        </a>
      </div>
    </div>
  );
}

// Drug Detail Modal
function DrugDetailModal({
  drugId,
  onClose,
}: {
  drugId: number | null;
  onClose: () => void;
}) {
  const { data: drug, isLoading } = trpc.drugLens.getById.useQuery(
    { id: drugId! },
    { enabled: drugId !== null }
  );

  const { data: alternatives } = trpc.drugLens.getAlternatives.useQuery(
    { scientificName: drug?.scientificName ?? "", excludeId: drugId! },
    { enabled: !!drug?.scientificName && drugId !== null }
  );

  if (!drugId) return null;

  return (
    <Dialog open={drugId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-sky-600" />
          </div>
        ) : drug ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 pr-8">
                {drug.tradeName}
              </DialogTitle>
              <p className="text-sm text-slate-500 font-medium">{drug.scientificName}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {drug.price && (
                  <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
                    {drug.price}
                  </Badge>
                )}
                {pregnancyCategoryBadge(drug.pregnancyCategory)}
                {drug.blackBoxWarning && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Black Box Warning
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Black Box Warning */}
              {drug.blackBoxWarning && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <h4 className="font-semibold text-red-800 text-sm">Black Box Warning</h4>
                  </div>
                  <p className="text-sm text-red-700">{drug.blackBoxWarning}</p>
                </div>
              )}

              {/* Pharmacological Action */}
              {drug.pharmacologicalAction && (
                <Section icon={<Zap className="h-4 w-4" />} title="Pharmacological Action">
                  <p className="text-sm text-slate-700">{drug.pharmacologicalAction}</p>
                </Section>
              )}

              {/* Uses */}
              {drug.uses && (
                <Section icon={<Info className="h-4 w-4" />} title="Uses (Approved + Off-label)">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{drug.uses}</p>
                </Section>
              )}

              {/* Dosing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {drug.standardDose && (
                  <Section icon={<Syringe className="h-4 w-4" />} title="Standard Dose">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{drug.standardDose}</p>
                  </Section>
                )}
                {drug.adjustedDose && (
                  <Section icon={<Syringe className="h-4 w-4" />} title="Adjusted Dose (Renal/Hepatic)">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{drug.adjustedDose}</p>
                  </Section>
                )}
                {drug.neonatalDose && (
                  <Section icon={<Baby className="h-4 w-4" />} title="Neonatal Dose">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{drug.neonatalDose}</p>
                  </Section>
                )}
                {drug.doseSource && (
                  <Section icon={<Info className="h-4 w-4" />} title="Dose Source">
                    <p className="text-sm text-slate-700">{drug.doseSource}</p>
                  </Section>
                )}
              </div>

              {/* Interactions */}
              {(drug.contraindicatedInteractions || drug.majorInteractions || drug.moderateInteractions || drug.minorInteractions) && (
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                    <Shuffle className="h-4 w-4 text-orange-500" />
                    Drug Interactions
                  </h4>
                  <div className="space-y-2">
                    {drug.contraindicatedInteractions && (
                      <InteractionRow level="Contraindicated" color="red" text={drug.contraindicatedInteractions} />
                    )}
                    {drug.majorInteractions && (
                      <InteractionRow level="Major" color="orange" text={drug.majorInteractions} />
                    )}
                    {drug.moderateInteractions && (
                      <InteractionRow level="Moderate" color="yellow" text={drug.moderateInteractions} />
                    )}
                    {drug.minorInteractions && (
                      <InteractionRow level="Minor" color="green" text={drug.minorInteractions} />
                    )}
                  </div>
                </div>
              )}

              {/* Alternatives */}
              {alternatives && alternatives.length > 0 && (
                <Section icon={<Shuffle className="h-4 w-4" />} title={`Alternatives (${alternatives.length})`}>
                  <div className="flex flex-wrap gap-2">
                    {alternatives.slice(0, 10).map((alt: { id: number; tradeName: string; scientificName: string; price: string | null }) => (
                      <button
                        key={alt.id}
                        className="text-xs bg-sky-50 border border-sky-200 text-sky-700 rounded-full px-3 py-1 hover:bg-sky-100 transition-colors font-medium"
                        onClick={() => {
                          onClose();
                          setTimeout(() => {
                            // Re-open with new drug
                          }, 100);
                        }}
                      >
                        {alt.tradeName}
                        {alt.price && <span className="ml-1 text-emerald-600">({alt.price})</span>}
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {/* Image Search */}
              <div className="flex justify-end">
                <a
                  href={getDrugImageUrl(drug.tradeName)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" className="gap-2 text-xs">
                    <ExternalLink className="h-3 w-3" />
                    Search Drug Image
                  </Button>
                </a>
              </div>
            </div>
          </>
        ) : (
          <p className="text-center text-slate-500 py-8">Drug not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
      <h4 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-2 text-sky-700">
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

function InteractionRow({
  level,
  color,
  text,
}: {
  level: string;
  color: "red" | "orange" | "yellow" | "green";
  text: string;
}) {
  const colorMap = {
    red: "bg-red-50 border-red-200 text-red-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
    green: "bg-green-50 border-green-200 text-green-800",
  };
  return (
    <div className={`rounded-lg p-3 border ${colorMap[color]}`}>
      <p className="text-xs font-bold mb-1">{level}</p>
      <p className="text-xs">{text}</p>
    </div>
  );
}

// Main Drug Lens Page
export default function DrugLens() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterBy, setFilterBy] = useState<FilterBy>("both");
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [page, setPage] = useState(1);
  const [selectedDrugId, setSelectedDrugId] = useState<number | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close autocomplete on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Autocomplete query
  const { data: suggestions } = trpc.drugLens.autocomplete.useQuery(
    { query: query.trim(), filterBy, limit: 8 },
    { enabled: query.trim().length >= 2 && showAutocomplete }
  );

  // Main search query
  const { data, isLoading } = trpc.drugLens.search.useQuery({
    query: debouncedQuery,
    filterBy,
    page,
    limit: 20,
  });

  // Stats
  const { data: stats } = trpc.drugLens.getStats.useQuery();

  const filterLabels: Record<FilterBy, string> = {
    both: "All Names",
    trade: "Trade Name",
    scientific: "Scientific Name",
  };

  const handleSelectSuggestion = (drug: { id: number; tradeName: string; scientificName: string }) => {
    const name = filterBy === "scientific" ? drug.scientificName : drug.tradeName;
    setQuery(name);
    setShowAutocomplete(false);
    inputRef.current?.blur();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-sky-700">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Search className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 leading-tight">Drug Lens</h1>
                  <p className="text-xs text-slate-500 hidden sm:block">Comprehensive Drug Reference</p>
                </div>
              </div>
            </div>
            {stats && (
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 bg-sky-50 border border-sky-100 rounded-full px-3 py-1.5">
                <Pill className="h-3.5 w-3.5 text-sky-600" />
                <span className="font-semibold text-sky-700">{stats.total.toLocaleString()}</span>
                <span>drugs</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <div className="bg-gradient-to-r from-sky-600 to-sky-700 py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-1">Drug Reference Database</h2>
          <p className="text-sky-200 text-sm mb-6">
            Search {stats?.total.toLocaleString() ?? "8,000+"} medications — trade names, scientific names, dosages & interactions
          </p>

          {/* Search Bar with Filter Dropdown */}
          <div ref={searchRef} className="relative">
            <div className="flex gap-2">
              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-white/90 border-white/50 text-slate-700 hover:bg-white gap-1.5 min-w-[130px] justify-between text-sm font-medium"
                  >
                    {filterLabels[filterBy]}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onClick={() => setFilterBy("both")}>
                    All Names
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy("trade")}>
                    Trade Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy("scientific")}>
                    Scientific Name
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowAutocomplete(true);
                  }}
                  onFocus={() => query.trim().length >= 2 && setShowAutocomplete(true)}
                  placeholder={filterBy === "scientific" ? "Search by scientific name..." : filterBy === "trade" ? "Search by trade name..." : "Search any drug name..."}
                  className="pl-9 pr-9 bg-white border-white/50 text-slate-900 placeholder:text-slate-400 h-10"
                />
                {query && (
                  <button
                    onClick={() => { setQuery(""); setShowAutocomplete(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Autocomplete Dropdown */}
            {showAutocomplete && suggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                {suggestions.map((s: { id: number; tradeName: string; scientificName: string }) => (
                  <button
                    key={s.id}
                    className="w-full text-left px-4 py-2.5 hover:bg-sky-50 transition-colors flex items-center justify-between gap-3 border-b border-slate-50 last:border-0"
                    onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); handleSelectSuggestion(s); }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{s.tradeName}</p>
                      <p className="text-xs text-slate-500 truncate">{s.scientificName}</p>
                    </div>
                    <Search className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5 gap-4">
          <div className="text-sm text-slate-600">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Searching...
              </span>
            ) : data ? (
              <span>
                <span className="font-semibold text-slate-900">{data.total.toLocaleString()}</span>
                {" "}results
                {debouncedQuery && (
                  <span className="text-slate-500"> for "<span className="font-medium text-sky-600">{debouncedQuery}</span>"</span>
                )}
              </span>
            ) : null}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("card")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "card"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === "list"
                  ? "bg-white text-sky-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <RefreshCw className="h-10 w-10 animate-spin text-sky-500 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Loading drugs...</p>
            </div>
          </div>
        ) : !data || data.results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">
              {debouncedQuery ? "No drugs found" : "Start searching"}
            </h3>
            <p className="text-slate-500 text-sm max-w-sm">
              {debouncedQuery
                ? `No results for "${debouncedQuery}". Try a different name or filter.`
                : "Type a drug name above to search the database."}
            </p>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.results.map((drug: Drug) => (
              <DrugCard key={drug.id} drug={drug} onViewDetail={setSelectedDrugId} />
            ))}
          </div>
        ) : (
          // List View
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-slate-700 w-8">#</TableHead>
                  <TableHead className="font-semibold text-slate-700">Trade Name</TableHead>
                  <TableHead className="font-semibold text-slate-700 hidden md:table-cell">Scientific Name</TableHead>
                  <TableHead className="font-semibold text-slate-700 hidden lg:table-cell">Price</TableHead>
                  <TableHead className="font-semibold text-slate-700 hidden xl:table-cell">Action</TableHead>
                  <TableHead className="font-semibold text-slate-700 hidden lg:table-cell">Preg. Cat.</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((drug: Drug, idx: number) => (
                  <TableRow
                    key={drug.id}
                    className="hover:bg-sky-50/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedDrugId(drug.id)}
                  >
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {(page - 1) * 20 + idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {drug.blackBoxWarning && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-slate-900 text-sm">{drug.tradeName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-500">
                      {drug.scientificName}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {drug.price && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                          {drug.price}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-xs text-slate-500 max-w-[200px]">
                      <span className="line-clamp-1">{drug.pharmacologicalAction}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {pregnancyCategoryBadge(drug.pregnancyCategory)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2 text-sky-600 border-sky-200 hover:bg-sky-50"
                        onClick={(e) => { e.stopPropagation(); setSelectedDrugId(drug.id); }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                let pageNum: number;
                if (data.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= data.totalPages - 2) {
                  pageNum = data.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      pageNum === page
                        ? "bg-sky-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="gap-1.5"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-xs text-slate-500">
              Page {page} of {data.totalPages.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Drug Detail Modal */}
      <DrugDetailModal
        drugId={selectedDrugId}
        onClose={() => setSelectedDrugId(null)}
      />
    </div>
  );
}
