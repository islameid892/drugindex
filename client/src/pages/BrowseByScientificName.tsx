import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, AlertCircle, Pill } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function BrowseByScientificName() {
  const [, params] = useRoute("/browse/scientific-name/:scientificName");
  const scientificName = params?.scientificName ? decodeURIComponent(params.scientificName) : "";
  
  const { data: drugs, isLoading, error } = trpc.data.medications.search.useQuery(
    { query: scientificName, limit: 1000 },
    { enabled: !!scientificName }
  );

  // Filter to show only drugs with exact scientific name match and remove duplicates
  const filteredDrugs = (() => {
    const filtered = drugs?.filter(
      (drug) => drug.scientificName.toUpperCase() === scientificName.toUpperCase()
    ) || [];
    
    // Remove duplicate trade names - keep only first occurrence
    const seen = new Set<string>();
    return filtered.filter(drug => {
      const tradeName = drug.tradeName.toUpperCase();
      if (seen.has(tradeName)) return false;
      seen.add(tradeName);
      return true;
    });
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
          <div className="space-y-3">
            {filteredDrugs.map((drug, idx) => (
              <div
                key={idx}
                className="group rounded-xl border border-border/50 bg-gradient-to-r from-card to-card/80 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:border-sky-300/50 dark:hover:border-sky-700/50"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                      {drug.tradeName}
                    </h3>
                  </div>
                  
                  {/* Price Placeholder - Reserved for future integration */}
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap bg-muted text-muted-foreground">
                      Price
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
