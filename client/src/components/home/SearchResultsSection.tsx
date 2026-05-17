import { SearchResultCard } from "@/components/SearchResultCard";
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";

interface SearchResultsSectionProps {
  query: string;
  searchLoading: boolean;
  groupedResults: any[];
  paginatedResults: any[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  searchResponse?: any;
}

const ITEMS_PER_PAGE = 10;

export function SearchResultsSection({
  query,
  searchLoading,
  groupedResults,
  currentPage,
  onPageChange,
}: SearchResultsSectionProps) {

  const totalPages = Math.ceil(groupedResults.length / ITEMS_PER_PAGE);

  const pageResults = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return groupedResults.slice(start, start + ITEMS_PER_PAGE);
  }, [groupedResults, currentPage]);

  return (
    <div className="space-y-6" data-search-results>
      {/* Results Header */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Search Results</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {searchLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching...
              </span>
            ) : (
              <>
                Found{" "}
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  {groupedResults.length}
                </span>{" "}
                medication{groupedResults.length !== 1 ? "s" : ""} for{" "}
                <span className="font-semibold text-foreground">"{query}"</span>
              </>
            )}
          </p>
        </div>
        {totalPages > 1 && (
          <span className="text-xs text-muted-foreground font-medium hidden sm:block">
            Page {currentPage} of {totalPages}
          </span>
        )}
      </div>

      {/* Loading State */}
      {searchLoading && groupedResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
          <p className="text-muted-foreground text-sm">Searching medications...</p>
        </div>
      ) : pageResults.length > 0 ? (
        <>
          {/* Results Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {pageResults.map((item: any, index: number) => (
              <SearchResultCard key={`${item.scientificName}-${index}`} data={item} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - currentPage) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | '...')[]>((acc, p, i, arr) => {
                    if (i > 0 && typeof arr[i - 1] === 'number' && (p as number) - (arr[i - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => onPageChange(p as number)}
                        className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                          currentPage === p
                            ? "bg-sky-600 text-white shadow-sm"
                            : "border border-border bg-background hover:bg-muted text-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
              </div>

              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
            <Search className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No medications found</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Try searching with a different term — scientific name, trade name, or ICD-10 code.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
