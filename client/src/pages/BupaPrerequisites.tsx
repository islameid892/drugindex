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

// Extract category from service name
function extractCategory(serviceName: string): string {
  // Common patterns for categories
  if (serviceName.includes("Medical Equipment") || serviceName.includes("Equipment")) return "Medical Equipment";
  if (serviceName.includes("Lab") || serviceName.includes("Laboratory")) return "Laboratory Tests";
  if (serviceName.includes("Physiotherapy") || serviceName.includes("Therapy")) return "Physiotherapy";
  if (serviceName.includes("Milk") || serviceName.includes("Dairy")) return "Milk & Dairy Products";
  if (serviceName.includes("Imaging") || serviceName.includes("MRI") || serviceName.includes("CT") || serviceName.includes("X-ray")) return "Imaging Services";
  if (serviceName.includes("Radiology")) return "Radiology";
  if (serviceName.includes("Surgery") || serviceName.includes("Surgical")) return "Surgical Services";
  if (serviceName.includes("Consultation") || serviceName.includes("Specialist")) return "Consultations";
  if (serviceName.includes("Procedure") || serviceName.includes("Intervention")) return "Procedures";
  
  // Default: use first few words as category
  const words = serviceName.split(" ");
  return words.slice(0, Math.min(2, words.length)).join(" ");
}

export default function BupaPrerequisites() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrerequisite, setSelectedPrerequisite] =
    useState<BupaPrerequisiteEnriched | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Use enhanced router to get data with enriched ICD codes
  const { data: allPrerequisites, isLoading } = trpc.bupaEnhanced.getAllWithCodes.useQuery();

  // Group prerequisites by category
  const groupedByCategory = useMemo(() => {
    if (!allPrerequisites) return {};
    
    const grouped: Record<string, BupaPrerequisiteEnriched[]> = {};
    
    allPrerequisites.forEach((item: BupaPrerequisiteEnriched) => {
      const category = extractCategory(item.serviceName);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    
    // Sort categories alphabetically
    return Object.keys(grouped)
      .sort()
      .reduce((acc, key) => {
        acc[key] = grouped[key].sort((a, b) => a.serviceName.localeCompare(b.serviceName));
        return acc;
      }, {} as Record<string, BupaPrerequisiteEnriched[]>);
  }, [allPrerequisites]);

  // Filter prerequisites based on search
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
      
      if (filteredItems.length > 0) {
        filtered[category] = filteredItems;
      }
    });
    
    return filtered;
  }, [groupedByCategory, searchQuery]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const parseRequirements = (text: string): string[] =>
    text.split("\n").filter((line) => line.trim().length > 0);

  const handleCopy = () => {
    if (!selectedPrerequisite) return;
    const codesText = selectedPrerequisite.enrichedCodes
      ?.map((ic: EnrichedIcdCode) => `${ic.code} - ${ic.description || ic.name || 'No description'}`)
      .join("\n") || selectedPrerequisite.icdCodes;
    const text = `${selectedPrerequisite.serviceName}\n\nICD Codes:\n${codesText}\n\nRequirements:\n${selectedPrerequisite.requirements}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
              <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="font-bold text-foreground text-base sm:text-lg">Bupa Prerequisites</h1>
            {allPrerequisites && (
              <span className="ml-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {allPrerequisites.length} services
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search by service name, ICD code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-11 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results count */}
        {searchQuery && (
          <p className="text-sm text-muted-foreground mb-4">
            {Object.values(filteredByCategory).reduce((sum, items) => sum + items.length, 0)} result
            {Object.values(filteredByCategory).reduce((sum, items) => sum + items.length, 0) !== 1 ? "s" : ""} for "{searchQuery}"
          </p>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading prerequisites...</p>
          </div>
        ) : Object.keys(filteredByCategory).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="p-4 bg-muted rounded-full">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">No results found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? `Try a different search term` : "No data available"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(filteredByCategory).map(([category, items]) => (
              <div key={category} className="border border-border rounded-lg overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-5 py-4 bg-card hover:bg-muted/50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-foreground text-base">{category}</h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {items.length} service{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                      expandedCategories.has(category) ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Category Items */}
                {expandedCategories.has(category) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-background/50 border-t border-border">
                    {items.map((item: BupaPrerequisiteEnriched) => {
                      const codes = item.enrichedCodes || [];
                      const reqCount = parseRequirements(item.requirements).length;

                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedPrerequisite(item)}
                          className="group text-left bg-card border border-border rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all duration-200"
                        >
                          {/* Service Name */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h3 className="font-semibold text-foreground text-sm leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {item.serviceName}
                            </h3>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 flex-shrink-0 mt-0.5 transition-colors" />
                          </div>

                          {/* ICD Codes with Descriptions */}
                          <div className="mb-3 space-y-1.5">
                            {codes.slice(0, 2).map((icdCode, idx) => (
                              <div
                                key={idx}
                                className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-1 rounded"
                              >
                                <span className="font-mono font-semibold">{icdCode.code}</span>
                                {(icdCode.description || icdCode.name) && (
                                  <span className="text-indigo-600 dark:text-indigo-400 ml-1">
                                    {(icdCode.description || icdCode.name || "").substring(0, 30)}
                                    {(icdCode.description || icdCode.name || "").length > 30 ? "..." : ""}
                                  </span>
                                )}
                              </div>
                            ))}
                            {codes.length > 2 && (
                              <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded block">
                                +{codes.length - 2} more code{codes.length - 2 !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {reqCount} requirement{reqCount !== 1 ? "s" : ""}
                            </span>
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              View →
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Dialog
        open={!!selectedPrerequisite}
        onOpenChange={() => setSelectedPrerequisite(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground pr-8 leading-snug">
              {selectedPrerequisite?.serviceName}
            </DialogTitle>
          </DialogHeader>

          {selectedPrerequisite && (
            <div className="space-y-6 pt-2">
              {/* ICD Codes Section with Full Details */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  ICD-10 Codes
                </p>
                <div className="space-y-2">
                  {selectedPrerequisite.enrichedCodes?.map((icdCode, idx) => (
                    <Link key={idx} href={`/code/${encodeURIComponent(icdCode.code)}`}>
                      <button
                        onClick={() => setSelectedPrerequisite(null)}
                        className="w-full text-left inline-flex items-start gap-2 text-sm bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-3 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:border-indigo-400 transition-all group"
                        title={`View ${icdCode.code} branches`}
                      >
                        <span className="font-mono font-semibold flex-shrink-0">{icdCode.code}</span>
                        {(icdCode.description || icdCode.name) && (
                          <span className="flex-1 text-indigo-600 dark:text-indigo-400">{icdCode.description || icdCode.name}</span>
                        )}
                        <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 flex-shrink-0" />
                      </button>
                    </Link>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click any code to view its ICD-10 branches
                </p>
              </div>

              {/* Requirements Section */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Requirements
                </p>
                <ul className="space-y-2">
                  {parseRequirements(selectedPrerequisite.requirements).map((req, idx) => (
                    <li key={idx} className="text-sm text-foreground flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Copy Button */}
              <Button
                onClick={handleCopy}
                variant="outline"
                className="w-full gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
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
