import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ArrowLeft, Search, Loader2 } from "lucide-react";
import { matchesSearchQuery } from '@/lib/arabicSearch';
import { trpc } from '@/lib/trpc';

interface BrowseModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'drugs' | 'conditions' | 'codes' | 'non-covered';
}

type ViewMode = 'list' | 'details';

export default function BrowseModal({ isOpen, onClose, type }: BrowseModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLetters, setExpandedLetters] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch data from API when modal is open
  const medicationsQuery = trpc.data.medications.getAll.useQuery(
    { limit: 2000, offset: 0 },
    { enabled: isOpen && (type === 'drugs' || type === 'conditions'), staleTime: 300000 }
  );

  const codesQuery = trpc.data.codes.getAll.useQuery(
    { limit: 2100, offset: 0 },
    { enabled: isOpen && type === 'codes', staleTime: 300000 }
  );

  const nonCoveredQuery = trpc.data.nonCoveredCodes.getAll.useQuery(
    undefined,
    { enabled: isOpen && type === 'non-covered', staleTime: 300000 }
  );

  const medData = medicationsQuery.data ?? [];
  const codesData = codesQuery.data ?? [];
  const nonCoveredData = nonCoveredQuery.data ?? [];

  const isDataLoading = (type === 'drugs' || type === 'conditions') ? medicationsQuery.isLoading :
    type === 'codes' ? codesQuery.isLoading :
    type === 'non-covered' ? nonCoveredQuery.isLoading : false;

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setExpandedLetters(new Set());
      setViewMode('list');
      setSelectedItem(null);
      setExpandedBranches(new Set());
    }
  }, [isOpen]);

  // Get unique active ingredients (scientific names) for drugs
  const uniqueIngredients = useMemo(() => {
    if (type !== 'drugs') return [];
    const ingredients = new Set<string>();
    medData.forEach((item: any) => {
      if (item.scientificName) {
        ingredients.add(item.scientificName);
      }
    });
    return Array.from(ingredients).sort();
  }, [medData, type]);

  // Get unique conditions (indications)
  const uniqueConditions = useMemo(() => {
    if (type !== 'conditions') return [];
    const conditions = new Set<string>();
    medData.forEach((item: any) => {
      if (item.indications && Array.isArray(item.indications)) {
        item.indications.forEach((ind: string) => conditions.add(ind));
      }
    });
    return Array.from(conditions).sort();
  }, [medData, type]);

  // Get unique codes from codesData
  const uniqueCodes = useMemo(() => {
    if (type !== 'codes') return [];
    return codesData.map((item: any) => item.code).sort();
  }, [codesData, type]);

  // Get non-covered codes
  const nonCoveredCodes = useMemo(() => {
    if (type !== 'non-covered') return [];
    return nonCoveredData.map((item: any) => item.code).sort();
  }, [type, nonCoveredData]);

  // Determine which list to use
  const sourceList = useMemo(() => {
    switch (type) {
      case 'drugs': return uniqueIngredients;
      case 'conditions': return uniqueConditions;
      case 'codes': return uniqueCodes;
      case 'non-covered': return nonCoveredCodes;
      default: return [];
    }
  }, [type, uniqueIngredients, uniqueConditions, uniqueCodes, nonCoveredCodes]);

  // Group by first letter
  const groupedData = useMemo(() => {
    const groups: { [key: string]: string[] } = {};
    sourceList.forEach((item: string) => {
      let firstLetter = item[0]?.toUpperCase() || '#';
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(item);
    });
    return groups;
  }, [sourceList]);

  // Filter based on search query
  const filteredGroups = useMemo(() => {
    const filtered: { [key: string]: string[] } = {};
    Object.keys(groupedData).forEach((letter) => {
      const items = groupedData[letter].filter((item: string) =>
        matchesSearchQuery(item, searchQuery)
      );
      if (items.length > 0) {
        filtered[letter] = items;
      }
    });
    return filtered;
  }, [groupedData, searchQuery]);

  const filteredLetters = useMemo(() => {
    return Object.keys(filteredGroups).sort();
  }, [filteredGroups]);

  const toggleLetter = useCallback((letter: string) => {
    setExpandedLetters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(letter)) {
        newSet.delete(letter);
      } else {
        newSet.add(letter);
      }
      return newSet;
    });
  }, []);

  const handleItemClick = useCallback((item: string) => {
    setSelectedItem(item);
    setViewMode('details');
  }, []);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedItem(null);
    setExpandedBranches(new Set());
  }, []);

  // Get code name from codesData
  const getCodeName = useCallback((code: string): string => {
    // Search in codesData
    const found = codesData.find((item: any) => item.code === code);
    if (found) return found.description || code;

    // Search in nonCoveredData
    const ncFound = nonCoveredData.find((item: any) => item.code === code);
    if (ncFound) return ncFound.description || code;

    return code;
  }, [codesData, nonCoveredData]);

  const toggleBranch = useCallback((branchCode: string) => {
    setExpandedBranches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(branchCode)) {
        newSet.delete(branchCode);
      } else {
        newSet.add(branchCode);
      }
      return newSet;
    });
  }, []);

  // Get related data for the selected item
  const relatedData = useMemo(() => {
    const result = {
      drugs: [] as string[],
      conditions: [] as string[],
      codes: [] as Array<{ code: string; description: string; branchCount: number; isNonCovered: boolean }>,
      branches: [] as Array<{ branchCode: string; branchDescription: string }>
    };

    if (type === 'drugs') {
      // Find all data for this scientific name
      medData.forEach((item: any) => {
        if (item.scientificName === selectedItem) {
          if (item.tradeNames) result.drugs.push(...item.tradeNames);
          if (item.indications) result.conditions.push(...item.indications);
          if (item.icdCodes) {
            item.icdCodes.forEach((c: any) => {
              if (!result.codes.find(existing => existing.code === c.code)) {
                result.codes.push(c);
              }
            });
          }
        }
      });
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
    } else if (type === 'conditions') {
      // Find all medications with this indication
      medData.forEach((item: any) => {
        const hasIndication = item.indications && item.indications.some(
          (ind: string) => ind === selectedItem
        );
        if (hasIndication) {
          if (item.tradeNames) result.drugs.push(...item.tradeNames);
          if (item.scientificName) result.conditions.push(item.scientificName);
          if (item.icdCodes) {
            item.icdCodes.forEach((c: any) => {
              if (!result.codes.find(existing => existing.code === c.code)) {
                result.codes.push(c);
              }
            });
          }
        }
      });
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
    } else if (type === 'codes') {
      // Find code info from codesData
      const codeItem = codesData.find((item: any) => item.code === selectedItem);
      if (codeItem) {
        if (codeItem.branches) {
          result.branches = codeItem.branches;
        }
      }

      // Find all medications with this code
      medData.forEach((item: any) => {
        const hasCode = item.icdCodes && item.icdCodes.some(
          (c: any) => c.code === selectedItem
        );
        if (hasCode) {
          if (item.tradeNames) result.drugs.push(...item.tradeNames);
          if (item.scientificName) result.conditions.push(item.scientificName);
        }
      });
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
    } else if (type === 'non-covered') {
      // Find non-covered code info
      const ncItem = nonCoveredData.find((item: any) => item.code === selectedItem);
      if (ncItem) {
        // Try to get branches from codesData
        const codeItem = codesData.find((item: any) => item.code === selectedItem);
        if (codeItem && codeItem.branches) {
          result.branches = codeItem.branches;
        }
      }

      // Find related medications
      medData.forEach((item: any) => {
        const hasCode = item.icdCodes && item.icdCodes.some(
          (c: any) => c.code === selectedItem
        );
        if (hasCode) {
          if (item.tradeNames) result.drugs.push(...item.tradeNames);
          if (item.scientificName) result.conditions.push(item.scientificName);
        }
      });
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
    }

    return result;
  }, [selectedItem, type, medData, codesData, nonCoveredData]);

  const getTitle = () => {
    switch (type) {
      case 'drugs': return 'Search Active Ingredients';
      case 'conditions': return 'Search Conditions';
      case 'codes': return 'Search ICD-10 Codes';
      case 'non-covered': return 'Non-Covered Codes';
      default: return 'Browse';
    }
  };

  // Details view
  if (viewMode === 'details' && selectedItem) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 w-[95vw] sm:w-full">
          <DialogHeader className="px-4 sm:px-6 py-4 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-lg truncate">{selectedItem}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 h-full w-full overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 space-y-6 pr-4 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100">
            {/* 1. Indication (for conditions) - Display Related Codes */}
            {type === 'conditions' && relatedData.codes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-sm text-slate-700">Indication (Related Codes)</h3>
                <div className="space-y-2">
                  {relatedData.codes.map((codeObj, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between p-2 rounded bg-green-50 text-green-900 border border-green-200">
                        <div className="flex-1">
                          <div className="font-mono font-bold text-sm">{codeObj.code}</div>
                          <div className="text-xs text-green-700 mt-1">{codeObj.description || getCodeName(codeObj.code)}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBranch(codeObj.code)}
                          className="ml-2 h-8 w-8 p-0 hover:bg-green-100"
                        >
                          {expandedBranches.has(codeObj.code) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {/* Show branches when expanded */}
                      {expandedBranches.has(codeObj.code) && (
                        <BranchesForCode code={codeObj.code} codesData={codesData} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1. Indication with Code (for drugs) */}
            {type === 'drugs' && relatedData.conditions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-sm text-slate-700">Indication</h3>
                <div className="space-y-2">
                  {relatedData.conditions.map((condition, idx) => {
                    const relatedCode = relatedData.codes[idx];
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between p-2 rounded bg-green-50 text-green-900 border border-green-200">
                          <div className="flex-1 text-sm">{condition}</div>
                          {relatedCode && (
                            <div className="flex items-center gap-2 ml-2">
                              <span className="font-mono font-bold text-sm">{relatedCode.code}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleBranch(relatedCode.code)}
                                className="h-7 w-7 p-0 hover:bg-green-100 transition-colors"
                              >
                                {expandedBranches.has(relatedCode.code) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                        {relatedCode && expandedBranches.has(relatedCode.code) && (
                          <BranchesForCode code={relatedCode.code} codesData={codesData} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 1. Indication (for codes and non-covered) - CODE NAME */}
            {(type === 'codes' || type === 'non-covered') && (
              <div>
                <h3 className="font-semibold mb-3 text-sm text-slate-700">Indication</h3>
                <div>
                  <div className="text-sm p-2 rounded bg-green-50 text-green-900 border border-green-200">
                    {getCodeName(selectedItem)}
                  </div>
                  <div className="text-xs text-slate-500 mt-2 font-mono">
                    Code: {selectedItem}
                  </div>
                  {type === 'non-covered' && (
                    <Badge variant="destructive" className="mt-2">Not Covered</Badge>
                  )}
                </div>
              </div>
            )}

            {/* 2. Scientific Names */}
            {relatedData.conditions.length > 0 && (type === 'conditions' || type === 'codes' || type === 'non-covered') && (
              <div>
                <h3 className="font-semibold mb-3 text-sm text-slate-700">Scientific Names ({relatedData.conditions.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {relatedData.conditions.map((condition, idx) => (
                    <div key={idx} className="text-sm p-2 rounded bg-blue-50 text-blue-900 border border-blue-200">
                      {condition}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Related Trade Names */}
            {relatedData.drugs.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-sm text-slate-700">Related Trade Names ({relatedData.drugs.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {relatedData.drugs.map((drug, idx) => (
                    <div key={idx} className="text-sm p-2 rounded bg-amber-50 text-amber-900 border border-amber-200">
                      {drug}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Code Branches (for codes and non-covered types) */}
            {(type === 'codes' || type === 'non-covered') && relatedData.branches.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-sm text-slate-700">Code Branches ({relatedData.branches.length})</h3>
                <div className="space-y-1">
                  {relatedData.branches.map((branch, idx) => (
                    <div key={idx} className="text-sm p-1.5 rounded bg-purple-50 border border-purple-100">
                      <span className="font-mono font-bold text-xs mr-2 text-purple-700">{branch.branchCode}</span>
                      <span className="text-slate-700 text-xs">{branch.branchDescription}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // List view
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 w-[95vw] sm:w-full">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">{getTitle()}</DialogTitle>
        </DialogHeader>

        <div className="px-4 sm:px-6 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={`Search ${type}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-sm sm:text-base"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 h-full w-full overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-3 space-y-2 pr-4 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-slate-100">
          {isDataLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500 mb-3" />
              <p className="text-sm text-muted-foreground">Loading data...</p>
            </div>
          ) : filteredLetters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No results found
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground mb-2">
                {sourceList.length} items total
              </div>
              {filteredLetters.map((letter) => (
                <div key={letter} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleLetter(letter)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors text-left font-semibold text-sm sm:text-base"
                  >
                    <span>
                      {letter} ({filteredGroups[letter]?.length || 0})
                    </span>
                    {expandedLetters.has(letter) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {expandedLetters.has(letter) && (
                    <div className="bg-white border-t">
                      {filteredGroups[letter]?.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleItemClick(item)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-blue-50 transition-colors border-b last:border-b-0 text-sm sm:text-base group"
                        >
                          <div className="font-medium group-hover:text-blue-600 transition-colors">
                            {item}
                          </div>
                          {type === 'codes' && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {getCodeName(item) !== item ? getCodeName(item) : ''}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component to show branches for a code
function BranchesForCode({ code, codesData }: { code: string; codesData: any[] }) {
  const codeItem = codesData.find((item: any) => item.code === code);
  if (!codeItem || !codeItem.branches || codeItem.branches.length === 0) {
    return (
      <div className="mt-2 ml-4 pl-2 border-l-2 border-green-200">
        <div className="text-xs text-slate-500">No branches available</div>
      </div>
    );
  }

  return (
    <div className="mt-2 ml-4 space-y-1 border-l-2 border-green-200 pl-2">
      <div className="text-xs font-semibold text-slate-500 mb-1">Branches for {code}:</div>
      {codeItem.branches.map((branch: any, bIdx: number) => (
        <div key={bIdx} className="text-sm p-1.5 rounded bg-white border border-slate-100 shadow-sm">
          <span className="font-mono font-bold text-xs mr-2 text-green-700">{branch.branchCode}</span>
          <span className="text-slate-700 text-xs">{branch.branchDescription}</span>
        </div>
      ))}
    </div>
  );
}
