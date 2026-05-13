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
} from "lucide-react";
import { Link } from "wouter";

interface BupaPrerequisite {
  id: number;
  serviceName: string;
  icdCodes: string;
  requirements: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function BupaPrerequisites() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrerequisite, setSelectedPrerequisite] =
    useState<BupaPrerequisite | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: allPrerequisites, isLoading } = trpc.bupa.getAll.useQuery();

  const filteredPrerequisites = useMemo(() => {
    if (!allPrerequisites) return [];
    if (!searchQuery.trim()) return allPrerequisites;
    const q = searchQuery.toLowerCase().trim();
    return allPrerequisites.filter(
      (item: BupaPrerequisite) =>
        item.serviceName.toLowerCase().includes(q) ||
        item.icdCodes.toLowerCase().includes(q)
    );
  }, [allPrerequisites, searchQuery]);

  const parseRequirements = (text: string): string[] =>
    text.split("\n").filter((line) => line.trim().length > 0);

  const handleCopy = () => {
    if (!selectedPrerequisite) return;
    const text = `${selectedPrerequisite.serviceName}\n\nICD Codes: ${selectedPrerequisite.icdCodes}\n\nRequirements:\n${selectedPrerequisite.requirements}`;
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
            placeholder="Search by service name or ICD code..."
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
            {filteredPrerequisites.length} result{filteredPrerequisites.length !== 1 ? "s" : ""} for "{searchQuery}"
          </p>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-muted-foreground text-sm">Loading prerequisites...</p>
          </div>
        ) : filteredPrerequisites.length === 0 ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredPrerequisites.map((item: BupaPrerequisite) => {
              const codes = item.icdCodes
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean);
              const reqCount = parseRequirements(item.requirements).length;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedPrerequisite(item)}
                  className="group text-left bg-card border border-border rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all duration-200"
                >
                  {/* Service Name */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="font-semibold text-foreground text-base leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {item.serviceName}
                    </h3>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500 flex-shrink-0 mt-0.5 transition-colors" />
                  </div>

                  {/* ICD Codes */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {codes.slice(0, 6).map((code, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-xs font-mono font-medium bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded"
                      >
                        {code}
                      </span>
                    ))}
                    {codes.length > 6 && (
                      <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                        +{codes.length - 6} more
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {reqCount} requirement{reqCount !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      View details →
                    </span>
                  </div>
                </button>
              );
            })}
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
              {/* ICD Codes Section */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  ICD-10 Codes
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedPrerequisite.icdCodes
                    .split(",")
                    .map((c) => c.trim())
                    .filter(Boolean)
                    .map((code, idx) => (
                      <Link key={idx} href={`/code/${encodeURIComponent(code)}`}>
                        <button
                          onClick={() => setSelectedPrerequisite(null)}
                          className="inline-flex items-center gap-1 text-sm font-mono font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:border-indigo-400 transition-all"
                          title={`View ${code} branches`}
                        >
                          {code}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </button>
                      </Link>
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click any code to view its ICD-10 branches
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-border" />

              {/* Requirements Section */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Required Documents & Information
                </p>
                <div className="space-y-3">
                  {parseRequirements(selectedPrerequisite.requirements).map(
                    (req, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{req}</p>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedPrerequisite(null)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Details
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
