import { useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Loader2, AlertCircle, Pill, Filter } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function BrowseByScientificName() {
  const [, params] = useRoute("/browse/scientific-name/:scientificName");
  const scientificName = params?.scientificName ? decodeURIComponent(params.scientificName) : "";
  const [customConcentration, setCustomConcentration] = useState<string>("");

  const { data: drugs, isLoading, error } = trpc.data.medications.search.useQuery(
    { query: scientificName, limit: 1000 },
    { enabled: !!scientificName }
  );

  // Filter to show only drugs with exact scientific name match, remove duplicates, and sort alphabetically
  const filteredDrugs = (() => {
    let filtered = drugs?.filter(
      (drug) => drug.scientificName.toUpperCase() === scientificName.toUpperCase()
    ) || [];
    
    // Remove duplicate trade names - keep only first occurrence
    const seen = new Set<string>();
    let unique = filtered.filter(drug => {
      const tradeName = drug.tradeName.toUpperCase();
      if (seen.has(tradeName)) return false;
      seen.add(tradeName);
      return true;
    });
    
    // Apply concentration filter: exact match on the number entered by user
    if (customConcentration.trim() !== "") {
      const targetConc = parseFloat(customConcentration);
      if (!isNaN(targetConc)) {
        unique = unique.filter(drug => {
          // Extract all numbers from trade name
          const matches = drug.tradeName.match(/(\d+(?:\.\d+)?)/g);
          if (!matches) return false;
          // Check if any number in the trade name exactly matches the target
          return matches.some(m => parseFloat(m) === targetConc);
        });
      }
    }
    
    // Sort alphabetically by trade name
    return unique.sort((a, b) => a.tradeName.localeCompare(b.tradeName));
  })();

  if (!scientificName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-sky-50/30 dark:to-sky-950/10 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-6">
              <ChevronLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <div className="rounded-2xl border border-border/50 bg-card p-8 text-center shadow-sm">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">No Scientific Name Selected</h1>
            <p className="text-muted-foreground">Please select a scientific name from Browse Drugs.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-sky-50/30 dark:to-sky-950/10 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 mb-8">
            <ChevronLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <Pill className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent mb-2">
                {scientificName}
              </h1>
              <p className="text-muted-foreground">
                {filteredDrugs.length} trade name{filteredDrugs.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>
          
          {/* Custom Concentration Filter Input */}
          <div className="mt-6">
            <label className="block text-sm font-semibold text-foreground mb-2">
              Filter by Concentration
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Enter concentration (e.g., 500)"
                value={customConcentration}
                onChange={(e) => setCustomConcentration(e.target.value)}
                className="h-11 text-base border-2 border-sky-300/50 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all bg-sky-50/30 dark:bg-sky-950/20"
              />
              {customConcentration && (
                <button
                  onClick={() => setCustomConcentration("")}
                  className="px-4 py-2.5 text-sm font-semibold bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {customConcentration && (
              <p className="text-xs text-muted-foreground mt-2">
                Showing {filteredDrugs.length} result{filteredDrugs.length !== 1 ? "s" : ""} matching concentration {customConcentration}
              </p>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-sky-600 animate-spin" />
            <span className="ml-3 text-muted-foreground">Loading medications...</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200/50 bg-red-50 dark:bg-red-950/20 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-300">Error Loading Medications</h3>
                <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error?.message || "An error occurred"}</p>
              </div>
            </div>
          </div>
        ) : filteredDrugs.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-8 text-center shadow-sm">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Medications Found</h3>
            <p className="text-muted-foreground">No medications found with this scientific name.</p>
          </div>
        ) : (
          /* Trade Names Grid */
          <div className="space-y-2">
            {filteredDrugs.map((drug, idx) => (
              <div
                key={idx}
                className="group relative rounded-lg border-2 border-transparent bg-gradient-to-r from-sky-100/60 via-blue-50/40 to-cyan-100/50 dark:from-sky-900/30 dark:via-blue-900/20 dark:to-cyan-900/20 p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:border-sky-400/70 dark:hover:border-sky-500/70 overflow-hidden"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-sky-400/0 via-blue-400/0 to-cyan-400/0 group-hover:from-sky-400/8 group-hover:via-blue-400/8 group-hover:to-cyan-400/8 transition-all duration-300 pointer-events-none" />
                
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-500 via-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Content */}
                <div className="relative flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-foreground truncate group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">
                    {drug.tradeName}
                  </h3>
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
