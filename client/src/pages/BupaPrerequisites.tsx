import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  X,
  Loader2,
  FileText,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  Tag,
  ClipboardList,
  Hash,
} from "lucide-react";
import { Link } from "wouter";

interface EnrichedIcdCode {
  code: string;
  description: string;
  name?: string;
  found?: boolean;
  branches?: Array<{ code: string; description: string }>;
}

interface BupaPrerequisiteEnriched {
  id: number;
  serviceName: string;
  icdCodes: string;
  enrichedCodes?: EnrichedIcdCode[];
  requirements: string;
  createdAt: Date;
  updatedAt: Date;
  totalCodes?: number;
  foundCodes?: number;
}

// Category color map
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "Medical Equipment": { bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800", dot: "bg-blue-500" },
  "Laboratory Tests":  { bg: "bg-violet-50 dark:bg-violet-950/40", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800", dot: "bg-violet-500" },
  "Physiotherapy":     { bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200 dark:border-teal-800", dot: "bg-teal-500" },
  "Imaging Services":  { bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
  "Radiology":         { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  "Surgical Services": { bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800", dot: "bg-red-500" },
  "Consultations":     { bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800", dot: "bg-indigo-500" },
  "Procedures":        { bg: "bg-pink-50 dark:bg-pink-950/40", text: "text-pink-700 dark:text-pink-300", border: "border-pink-200 dark:border-pink-800", dot: "bg-pink-500" },
};

function getCategoryColors(category: string) {
  return CATEGORY_COLORS[category] || {
    bg: "bg-slate-50 dark:bg-slate-800/40",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-500",
  };
}

function extractCategory(serviceName: string): string {
  if (serviceName.includes("Medical Equipment") || serviceName.includes("Equipment")) return "Medical Equipment";
  if (serviceName.includes("Lab") || serviceName.includes("Laboratory")) return "Laboratory Tests";
  if (serviceName.includes("Physiotherapy") || serviceName.includes("Therapy")) return "Physiotherapy";
  if (serviceName.includes("Milk") || serviceName.includes("Dairy")) return "Milk & Dairy Products";
  if (serviceName.includes("Imaging") || serviceName.includes("MRI") || serviceName.includes("CT") || serviceName.includes("X-ray")) return "Imaging Services";
  if (serviceName.includes("Radiology")) return "Radiology";
  if (serviceName.includes("Surgery") || serviceName.includes("Surgical")) return "Surgical Services";
  if (serviceName.includes("Consultation") || serviceName.includes("Specialist")) return "Consultations";
  if (serviceName.includes("Procedure") || serviceName.includes("Intervention")) return "Procedures";
  const words = serviceName.split(" ");
  return words.slice(0, Math.min(2, words.length)).join(" ");
}

export default function BupaPrerequisites() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrerequisite, setSelectedPrerequisite] = useState<BupaPrerequisiteEnriched | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: allPrerequisites, isLoading } = trpc.bupaEnhanced.getAllWithCodes.useQuery();

  const groupedByCategory = useMemo(() => {
    if (!allPrerequisites) return {};
    const grouped: Record<string, BupaPrerequisiteEnriched[]> = {};
    allPrerequisites.forEach((item: BupaPrerequisiteEnriched) => {
      const category = extractCategory(item.serviceName);
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });
    return Object.keys(grouped)
      .sort()
      .reduce((acc, key) => {
        acc[key] = grouped[key].sort((a, b) => a.serviceName.localeCompare(b.serviceName));
        return acc;
      }, {} as Record<string, BupaPrerequisiteEnriched[]>);
  }, [allPrerequisites]);

  const filteredByCategory = useMemo(() => {
    if (!searchQuery.trim()) return groupedByCategory;
    const q = searchQuery.toLowerCase().trim();
    const filtered: Record<string, BupaPrerequisiteEnriched[]> = {};
    Object.entries(groupedByCategory).forEach(([category, items]) => {
      const filteredItems = items.filter(
        (item: BupaPrerequisiteEnriched) =>
          item.serviceName.toLowerCase().includes(q) ||
          item.icdCodes.toLowerCase().includes(q) ||
          (item.enrichedCodes?.some(ic => ic.description?.toLowerCase().includes(q)) ?? false)
      );
      if (filteredItems.length > 0) filtered[category] = filteredItems;
    });
    return filtered;
  }, [groupedByCategory, searchQuery]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) newExpanded.delete(category);
    else newExpanded.add(category);
    setExpandedCategories(newExpanded);
  };

  const parseRequirements = (text: string): string[] =>
    text.split("\n").filter((line) => line.trim().length > 0);

  const handleCopy = () => {
    if (!selectedPrerequisite) return;
    const codesText = selectedPrerequisite.enrichedCodes
      ?.map((ic: EnrichedIcdCode) => `${ic.code} - ${ic.description || ic.name || "No description"}`)
      .join("\n") || selectedPrerequisite.icdCodes;
    const text = `${selectedPrerequisite.serviceName}\n\nICD Codes:\n${codesText}\n\nRequirements:\n${selectedPrerequisite.requirements}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalResults = Object.values(filteredByCategory).reduce((sum, items) => sum + items.length, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Back</span>
            </Button>
          </Link>

          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />

          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-sm flex-shrink-0">
              <ClipboardList className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight tracking-tight">
                Bupa Preauthorization
              </h1>
              {allPrerequisites && (
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                  {allPrerequisites.length} services · {Object.keys(groupedByCategory).length} categories
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── Search Bar ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by service name, ICD code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-12 text-sm font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm focus-visible:ring-indigo-500 placeholder:text-slate-400 placeholder:font-normal"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ── Results count ── */}
        {searchQuery && (
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{totalResults}</span>{" "}
            result{totalResults !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
          </p>
        )}

        {/* ── Content ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Loading prerequisites...</p>
          </div>
        ) : Object.keys(filteredByCategory).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-base">No results found</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                {searchQuery ? `Try a different search term` : "No data available"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(filteredByCategory).map(([category, items]) => {
              const colors = getCategoryColors(category);
              const isExpanded = expandedCategories.has(category);

              return (
                <div
                  key={category}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                      <h2 className="font-bold text-slate-800 dark:text-slate-200 text-base tracking-tight">
                        {category}
                      </h2>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
                        {items.length}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Category Items */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {items.map((item: BupaPrerequisiteEnriched) => {
                          const codes = item.enrichedCodes || [];
                          const reqCount = parseRequirements(item.requirements).length;

                          return (
                            <button
                              key={item.id}
                              onClick={() => setSelectedPrerequisite(item)}
                              className="group text-left bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:shadow-md transition-all duration-200"
                            >
                              {/* Service Name */}
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-snug group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                                  {item.serviceName}
                                </h3>
                                <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 flex-shrink-0 mt-0.5 transition-colors" />
                              </div>

                              {/* ICD Codes */}
                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {codes.slice(0, 3).map((icdCode, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 text-xs font-mono font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md"
                                  >
                                    <Hash className="h-2.5 w-2.5 opacity-70" />
                                    {icdCode.code}
                                  </span>
                                ))}
                                {codes.length > 3 && (
                                  <span className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md font-medium">
                                    +{codes.length - 3}
                                  </span>
                                )}
                              </div>

                              {/* Footer */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>{reqCount} requirement{reqCount !== 1 ? "s" : ""}</span>
                                </div>
                                <span className="text-xs text-indigo-500 dark:text-indigo-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                  View details →
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Details Modal ── */}
      <Dialog open={!!selectedPrerequisite} onOpenChange={() => setSelectedPrerequisite(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-slate-200 dark:border-slate-700 shadow-2xl">

          {/* Modal Header */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 pt-6 pb-5 rounded-t-2xl">
            <DialogHeader>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <DialogTitle className="text-white font-bold text-lg leading-snug tracking-tight">
                    {selectedPrerequisite?.serviceName}
                  </DialogTitle>
                  {selectedPrerequisite && (
                    <p className="text-indigo-200 text-sm mt-1 font-medium">
                      {selectedPrerequisite.enrichedCodes?.length || 0} ICD codes ·{" "}
                      {parseRequirements(selectedPrerequisite.requirements).length} requirements
                    </p>
                  )}
                </div>
              </div>
            </DialogHeader>
          </div>

          {selectedPrerequisite && (
            <div className="px-6 py-5 space-y-6">

              {/* ICD Codes Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    ICD-10 Codes
                  </h3>
                </div>
                <div className="space-y-2">
                  {selectedPrerequisite.enrichedCodes?.map((icdCode, idx) => (
                    <Link key={idx} href={`/code/${encodeURIComponent(icdCode.code)}`}>
                      <button
                        onClick={() => setSelectedPrerequisite(null)}
                        className="w-full text-left flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all group"
                      >
                        <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-2.5 py-1 rounded-lg flex-shrink-0">
                          {icdCode.code}
                        </span>
                        {(icdCode.description || icdCode.name) && (
                          <span className="flex-1 text-sm text-slate-600 dark:text-slate-400 font-medium">
                            {icdCode.description || icdCode.name}
                          </span>
                        )}
                        <ExternalLink className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
                      </button>
                    </Link>
                  ))}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  Click any code to view its ICD-10 branches
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 dark:border-slate-800" />

              {/* Requirements Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Requirements
                  </h3>
                </div>
                <ul className="space-y-2.5">
                  {parseRequirements(selectedPrerequisite.requirements).map((req, idx) => (
                    <li key={idx} className="flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{idx + 1}</span>
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {req}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Copy Button */}
              <Button
                onClick={handleCopy}
                variant="outline"
                className={`w-full h-11 gap-2 font-semibold rounded-xl transition-all ${
                  copied
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30 text-slate-600 dark:text-slate-400"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied to clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy All Details
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
