import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    { limit: 5000, offset: 0 },
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

  // Get unique trade names (drugs) for drugs browse
  const uniqueDrugs = useMemo(() => {
    if (type !== 'drugs') return [];
    const drugs = new Set<string>();
    medData.forEach((item: any) => {
      if (item.tradeName) {
        drugs.add(item.tradeName);
      }
    });
    return Array.from(drugs).sort();
  }, [medData, type]);

  // Get unique conditions (indications)
  const uniqueConditions = useMemo(() => {
    if (type !== 'conditions') return [];
    const conditions = new Set<string>();
    medData.forEach((item: any) => {
      if (item.indication) {
        conditions.add(item.indication);
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
      case 'drugs': return uniqueDrugs;
      case 'conditions': return uniqueConditions;
      case 'codes': return uniqueCodes;
      case 'non-covered': return nonCoveredCodes;
      default: return [];
    }
  }, [type, uniqueDrugs, uniqueConditions, uniqueCodes, nonCoveredCodes]);

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
    const found = codesData.find((item: any) => item.code === code);
    if (found) return found.description || code;

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
      codes: [] as Array<{ code: string; description?: string }>,
      branches: [] as Array<{ branchCode: string; branchDescription: string }>
    };

    if (type === 'drugs') {
      // Find all data for this trade name
      medData.forEach((item: any) => {
        if (item.tradeName === selectedItem) {
          if (item.scientificName) result.conditions.push(item.scientificName);
          if (item.indication) result.drugs.push(item.indication);
          if (item.icdCodesRaw) {
            const codes = item.icdCodesRaw.split(',').map((c: string) => c.trim());
            codes.forEach((code: string) => {
              if (!result.codes.find(existing => existing.code === code)) {
                result.codes.push({ code, description: getCodeName(code) });
              }
            });
          }
        }
      });
      result.conditions = Array.from(new Set(result.conditions));
      result.drugs = Array.from(new Set(result.drugs));
    } else if (type === 'conditions') {
      // Find all medications with this indication
      medData.forEach((item: any) => {
        if (item.indication === selectedItem) {
          if (item.tradeName) result.drugs.push(item.tradeName);
          if (item.scientificName) result.conditions.push(item.scientificName);
          if (item.icdCodesRaw) {
            const codes = item.icdCodesRaw.split(',').map((c: string) => c.trim());
            codes.forEach((code: string) => {
              if (!result.codes.find(existing => existing.code === code)) {
                result.codes.push({ code, description: getCodeName(code) });
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
        if (item.icdCodesRaw) {
          const codes = item.icdCodesRaw.split(',').map((c: string) => c.trim());
          if (codes.includes(selectedItem)) {
            if (item.tradeName) result.drugs.push(item.tradeName);
            if (item.scientificName) result.conditions.push(item.scientificName);
          }
        }
      });
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
    } else if (type === 'non-covered') {
      // Similar to codes but for non-covered
      const ncItem = nonCoveredData.find((item: any) => item.code === selectedItem);
      if (ncItem && ncItem.branches) {
        result.branches = ncItem.branches;
      }

      medData.forEach((item: any) => {
        if (item.icdCodesRaw) {
          const codes = item.icdCodesRaw.split(',').map((c: string) => c.trim());
          if (codes.includes(selectedItem)) {
            if (item.tradeName) result.drugs.push(item.tradeName);
            if (item.scientificName) result.conditions.push(item.scientificName);
          }
        }
      });
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
    }

    return result;
  }, [type, selectedItem, medData, codesData, nonCoveredData, getCodeName]);

  const getTitle = () => {
    switch (type) {
      case 'drugs': return 'Search Drugs';
      case 'conditions': return 'Find Conditions';
      case 'codes': return 'Browse Codes';
      case 'non-covered': return 'Non-Covered Codes';
      default: return 'Browse';
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case 'drugs': return 'Search drugs...';
      case 'conditions': return 'Search conditions...';
      case 'codes': return 'Search codes...';
      case 'non-covered': return 'Search non-covered codes...';
      default: return 'Search...';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        {viewMode === 'list' ? (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            <div className="flex gap-2">
              <Input
                ref={searchInputRef}
                placeholder={getPlaceholder()}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            {isDataLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                <p className="text-sm text-muted-foreground px-2">
                  {sourceList.length} items total
                </p>

                {filteredLetters.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No results found</p>
                ) : (
                  filteredLetters.map((letter) => (
                    <div key={letter}>
                      <button
                        onClick={() => toggleLetter(letter)}
                        className="w-full px-3 py-2 text-left font-semibold bg-muted hover:bg-muted/80 rounded-md flex items-center justify-between"
                      >
                        <span>{letter} ({filteredGroups[letter].length})</span>
                        {expandedLetters.has(letter) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      {expandedLetters.has(letter) && (
                        <div className="pl-4 space-y-1 mt-1">
                          {filteredGroups[letter].map((item: string) => (
                            <button
                              key={item}
                              onClick={() => handleItemClick(item)}
                              className="w-full text-left px-3 py-2 rounded-md hover:bg-accent text-sm"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToList}
                className="p-2 hover:bg-muted rounded-md"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h3 className="font-semibold flex-1 truncate">{selectedItem}</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {relatedData.drugs.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">
                    {type === 'drugs' ? 'Indications' : 'Related Trade Names'}
                  </h4>
                  <div className="space-y-1">
                    {relatedData.drugs.map((drug: string, idx: number) => (
                      <div key={idx} className="text-sm px-3 py-1 bg-muted rounded-md">
                        {drug}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relatedData.conditions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">
                    {type === 'drugs' ? 'Scientific Names' : 'Scientific Names'}
                  </h4>
                  <div className="space-y-1">
                    {relatedData.conditions.map((cond: string, idx: number) => (
                      <div key={idx} className="text-sm px-3 py-1 bg-muted rounded-md">
                        {cond}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relatedData.codes.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">ICD-10 Codes</h4>
                  <div className="space-y-1">
                    {relatedData.codes.map((code: any, idx: number) => (
                      <div key={idx} className="text-sm px-3 py-1 bg-muted rounded-md">
                        <strong>{code.code}</strong> - {code.description || 'N/A'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relatedData.branches.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Branches</h4>
                  <div className="space-y-1">
                    {relatedData.branches.map((branch: any, idx: number) => (
                      <div key={idx}>
                        <button
                          onClick={() => toggleBranch(branch.branchCode)}
                          className="w-full text-left px-3 py-1 bg-muted rounded-md hover:bg-muted/80 text-sm flex items-center justify-between"
                        >
                          <span>{branch.branchCode}</span>
                          {expandedBranches.has(branch.branchCode) ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                        {expandedBranches.has(branch.branchCode) && (
                          <div className="text-xs text-muted-foreground px-3 py-1 ml-2 border-l-2">
                            {branch.branchDescription}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relatedData.drugs.length === 0 &&
                relatedData.conditions.length === 0 &&
                relatedData.codes.length === 0 &&
                relatedData.branches.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No related data found</p>
                )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
