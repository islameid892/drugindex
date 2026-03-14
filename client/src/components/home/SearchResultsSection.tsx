import { SearchResultCard } from "@/components/SearchResultCard";
import { Loader2, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface SearchResultsSectionProps {
  query: string;
  searchLoading: boolean;
  groupedResults: any[];
  paginatedResults: any[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  searchResponse?: any; // Full response with medications, conditions, codes
}

type ResultType = 'medications' | 'conditions' | 'codes';

export function SearchResultsSection({
  query,
  searchLoading,
  groupedResults,
  paginatedResults,
  currentPage,
  totalPages,
  onPageChange,
  searchResponse,
}: SearchResultsSectionProps) {
  const [activeTab, setActiveTab] = useState<ResultType>('medications');

  // Use the full searchResponse if available, otherwise fall back to groupedResults
  const categorizedResults = useMemo(() => {
    if (searchResponse && typeof searchResponse === 'object') {
      return {
        medications: searchResponse.medications || [],
        conditions: searchResponse.conditions || [],
        codes: searchResponse.codes || [],
      };
    }
    
    // Fallback: all results in groupedResults are medications
    return {
      medications: groupedResults,
      conditions: [],
      codes: [],
    };
  }, [searchResponse, groupedResults]);

  // Get results for active tab
  const tabResults = useMemo(() => {
    const results = categorizedResults[activeTab];
    const startIndex = (currentPage - 1) * 10;
    const endIndex = startIndex + 10;
    return results.slice(startIndex, endIndex);
  }, [categorizedResults, activeTab, currentPage]);

  const tabTotalPages = useMemo(() => {
    return Math.ceil(categorizedResults[activeTab].length / 10);
  }, [categorizedResults, activeTab]);

  // Get total results count
  const totalResults = useMemo(() => {
    return (categorizedResults.medications?.length || 0) + 
           (categorizedResults.conditions?.length || 0) + 
           (categorizedResults.codes?.length || 0);
  }, [categorizedResults]);

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
              <>Found <span className="font-semibold text-sky-600 dark:text-sky-400">{totalResults}</span> results for "<span className="font-semibold">{query}</span>"</>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      {!searchLoading && (
        <Tabs value={activeTab} onValueChange={(val) => {
          setActiveTab(val as ResultType);
          onPageChange(1);
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-2 bg-muted p-1 rounded-lg">
            <TabsTrigger value="medications" className="relative">
              <span>Medications</span>
              {categorizedResults.medications.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {categorizedResults.medications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="conditions" className="relative">
              <span>Conditions</span>
              {categorizedResults.conditions.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {categorizedResults.conditions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="codes" className="relative">
              <span>ICD-10 Codes</span>
              {categorizedResults.codes.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {categorizedResults.codes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Results Content */}
      {searchLoading && totalResults === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : tabResults.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tabResults.map((item: any, index: number) => {
              // For medications, use SearchResultCard directly
              if (activeTab === 'medications') {
                return <SearchResultCard key={index} data={item} />;
              }
              
              // For conditions and codes, we need to convert them to medication-like format
              // or create custom display components
              // For now, just show a placeholder
              return (
                <div key={index} className="rounded-lg border border-border p-4 bg-card">
                  <h3 className="font-semibold text-foreground mb-2">
                    {activeTab === 'conditions' ? item.indication : item.code}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === 'conditions' 
                      ? `${item.codes?.length || 0} codes | ${item.tradeNames?.length || 0} medications`
                      : item.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {tabTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-6">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {tabTotalPages}
              </span>
              <button
                onClick={() => onPageChange(Math.min(tabTotalPages, currentPage + 1))}
                disabled={currentPage === tabTotalPages}
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
          <h3 className="text-lg font-semibold text-foreground mb-2">No results in this category</h3>
          <p className="text-muted-foreground">Try a different search term or check another tab</p>
        </div>
      )}
    </div>
  );
}
