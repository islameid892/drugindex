import { SearchResultCard } from "@/components/SearchResultCard";
import { Loader2, Search } from "lucide-react";

interface SearchResultsSectionProps {
  query: string;
  searchLoading: boolean;
  groupedResults: any[];
  paginatedResults: any[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function SearchResultsSection({
  query,
  searchLoading,
  groupedResults,
  paginatedResults,
  currentPage,
  totalPages,
  onPageChange,
}: SearchResultsSectionProps) {
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500" data-search-results>
      {/* Results Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Search Results</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {searchLoading ? (
              <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...</span>
            ) : (
              <>Found <span className="font-semibold text-sky-600 dark:text-sky-400">{groupedResults.length}</span> active ingredients for "<span className="font-semibold">{query}</span>"</>
            )}
          </p>
        </div>
      </div>

      {/* Results Content */}
      {searchLoading && groupedResults.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : paginatedResults.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginatedResults.map((item, index) => (
              <SearchResultCard key={index} data={item} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-6">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
          <p className="text-muted-foreground">Try searching with a different name, code, or diagnosis</p>
        </div>
      )}
    </div>
  );
}
