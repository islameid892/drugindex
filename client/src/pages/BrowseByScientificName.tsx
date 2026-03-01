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
  const [filterSameConc, setFilterSameConc] = useState(false);
  const [baseConcentration, setBaseConcentration] = useState<string | null>(null);
  const [customConcentration, setCustomConcentration] = useState<string>("");
  const [suggestedRange, setSuggestedRange] = useState<{ min: number; max: number } | null>(null);
  
  
  // Helper function to calculate AI-suggested range (±10% or ±50mg, whichever is larger)
  const calculateSuggestedRange = (conc: number) => {
    const percent10 = conc * 0.1;
    const delta = Math.max(percent10, 50);
    return {
      min: Math.max(0, conc - delta),
      max: conc + delta
    };
  };

  // Helper function to check if concentration is in range
  const isInRange = (conc: number, min: number, max: number) => {
    return conc >= min && conc <= max;
  };

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
    
    // Set base concentration from first drug and calculate range if not set
    if (unique.length > 0 && !baseConcentration) {
      const firstDrug = unique[0];
      const match = firstDrug.tradeName.match(/(\d+(?:\.\d+)?)/);
      const concentration = match ? match[1] : null;
      if (concentration) {
        setBaseConcentration(concentration);
        const concNum = parseFloat(concentration);
        setSuggestedRange(calculateSuggestedRange(concNum));
      }
    }
    
    // Apply concentration filter if enabled
    if (filterSameConc) {
      const filterValue = customConcentration || baseConcentration;
      if (filterValue) {
        unique = unique.filter(drug => {
          const match = drug.tradeName.match(/(\d+(?:\.\d+)?)/);
          const drugConc = match ? parseFloat(match[1]) : null;
          if (!drugConc) return false;
          
          // If custom input, use suggested range
          if (customConcentration && suggestedRange) {
            return isInRange(drugConc, suggestedRange.min, suggestedRange.max);
          }
          
          // Otherwise use exact match
          return drugConc === parseFloat(filterValue);
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
          
          {/* Smart Concentration Filter */}
          {baseConcentration && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFilterSameConc(!filterSameConc)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-base transition-all duration-200 ${
                    filterSameConc
                      ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg hover:shadow-xl"
                      : "bg-muted/60 text-foreground hover:bg-muted/80 border border-border/50"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  {filterSameConc ? `Showing ${filteredDrugs.length}` : `Filter`} ({baseConcentration})
                </button>
                {filterSameConc && (
                  <span className="text-sm text-muted-foreground">
                    {filteredDrugs.length} result{filteredDrugs.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              
              {/* Suggested Range Info */}
              {filterSameConc && suggestedRange && !customConcentration && (
                <div className="text-sm text-muted-foreground bg-sky-50/50 dark:bg-sky-950/20 p-3 rounded-lg border border-sky-200/30 dark:border-sky-800/30">
                  💡 AI suggests: {suggestedRange.min.toFixed(0)} - {suggestedRange.max.toFixed(0)}mg
                </div>
              )}
              
              {/* Custom Concentration Input */}
              {filterSameConc && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Enter custom concentration (e.g., 500)"
                    value={customConcentration}
                    onChange={(e) => setCustomConcentration(e.target.value)}
                    className="h-10 text-sm border-2 border-border rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                  />
                  {customConcentration && (
                    <button
                      onClick={() => setCustomConcentration("")}
                      className="px-3 py-2 text-sm font-semibold bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
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
          <div className="space-y-2.5">
            {filteredDrugs.map((drug, idx) => (
              <div
                key={idx}
                className="group relative rounded-xl border border-border/40 bg-gradient-to-br from-sky-50/40 via-card to-blue-50/30 dark:from-sky-950/20 dark:via-card dark:to-blue-950/10 p-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:border-sky-400/60 dark:hover:border-sky-600/60 overflow-hidden"
              >
                {/* Background accent */}
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500/0 via-sky-500/0 to-sky-500/0 group-hover:from-sky-500/5 group-hover:via-sky-500/5 group-hover:to-sky-500/0 transition-all duration-300 pointer-events-none" />
                
                {/* Content */}
                <div className="relative flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground truncate group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">
                    {drug.tradeName}
                  </h3>
                  <div className="flex-shrink-0 ml-3 w-2 h-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
