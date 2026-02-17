import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ArrowLeft, Search } from "lucide-react";
import { matchesSearchQuery } from '@/lib/arabicSearch';

interface BrowseModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'drugs' | 'conditions' | 'codes' | 'non-covered';
  data: any[];
  nonCoveredData?: any[];
  treeData?: any[];
}

type ViewMode = 'list' | 'details';

export default function BrowseModal({ isOpen, onClose, type, data, nonCoveredData = [], treeData = [] }: BrowseModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLetters, setExpandedLetters] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    data.forEach((item: any) => {
      if (item.scientificName) {
        ingredients.add(item.scientificName);
      }
    });
    return Array.from(ingredients).sort();
  }, [data, type]);

  // Get unique conditions
  const uniqueConditions = useMemo(() => {
    if (type !== 'conditions') return [];
    
    const conditions = new Set<string>();
    data.forEach((item: any) => {
      if (item.indication) {
        conditions.add(item.indication);
      }
    });
    return Array.from(conditions).sort();
  }, [data, type]);

  // Get unique codes
  const uniqueCodes = useMemo(() => {
    if (type !== 'codes') return [];
    
    const codes = new Set<string>();
    data.forEach((item: any) => {
      if (item.icdCodes && Array.isArray(item.icdCodes)) {
        item.icdCodes.forEach((code: string) => {
          codes.add(code);
        });
      }
    });
    return Array.from(codes).sort();
  }, [data, type]);

  // Get non-covered codes
  const nonCoveredCodes = useMemo(() => {
    if (type !== 'non-covered') return [];
    
    const codes = new Set<string>();
    nonCoveredData.forEach((item: any) => {
      if (item.code) {
        codes.add(item.code);
      }
    });
    return Array.from(codes).sort();
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

  // Get code name from tree data
  const getCodeName = useCallback((code: string): string => {
    for (const treeItem of treeData) {
      if (treeItem.code === code) {
        return treeItem.description || treeItem.indication || code;
      }
    }
    return code;
  }, [treeData]);

  // Get branch name from tree data
  const getBranchName = useCallback((branchCode: string): string => {
    for (const treeItem of treeData) {
      if (treeItem.code === branchCode) {
        return treeItem.description || branchCode;
      }
    }
    return branchCode;
  }, [treeData]);

  // Get related data for the selected item
  const relatedData = useMemo(() => {
    const result = {
      drugs: [] as string[],
      conditions: [] as string[],
      codes: [] as string[],
      branches: [] as string[]
    };

    if (type === 'drugs') {
      // Find all drugs with this scientific name
      data.forEach((item: any) => {
        if (item.scientificName === selectedItem) {
          result.drugs.push(...(item.tradeNames || []));
          if (item.indication) result.conditions.push(item.indication);
          if (item.icdCodes) result.codes.push(...item.icdCodes);
        }
      });
      
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
      result.codes = Array.from(new Set(result.codes));
    } else if (type === 'conditions') {
      // Find all drugs with this condition
      if (selectedItem) {
        data.forEach((item: any) => {
          if (item.indication === selectedItem) {
            result.drugs.push(...(item.tradeNames || []));
            if (item.scientificName) result.conditions.push(item.scientificName);
            if (item.icdCodes) result.codes.push(...item.icdCodes);
          }
        });
        
        // Also check tree data for matching description
        treeData.forEach((treeItem: any) => {
          if (treeItem.description && treeItem.description.toLowerCase().includes(selectedItem.toLowerCase())) {
            result.codes.push(treeItem.code);
            if (treeItem.branches) {
              treeItem.branches.forEach((branch: any) => {
                const branchStr = typeof branch === 'string' ? branch : (branch?.code || '');
                if (branchStr) result.branches.push(branchStr);
              });
            }
          }
        });
      }
      
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
      result.codes = Array.from(new Set(result.codes));
      result.branches = Array.from(new Set(result.branches));
    } else if (type === 'codes') {
      // Find code info from tree
      treeData.forEach((treeItem: any) => {
        if (treeItem.code === selectedItem) {
          if (treeItem.indication) result.conditions.push(treeItem.indication);
          if (treeItem.branches) {
            treeItem.branches.forEach((branch: any) => {
              const branchStr = typeof branch === 'string' ? branch : (branch?.code || '');
              if (branchStr) result.branches.push(branchStr);
            });
          }
        }
      });
      
      // Find all drugs with this code
      data.forEach((item: any) => {
        if (item.icdCodes && item.icdCodes.includes(selectedItem)) {
          result.drugs.push(...(item.tradeNames || []));
          if (item.scientificName) result.conditions.push(item.scientificName);
        }
      });
      
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
      result.branches = Array.from(new Set(result.branches));
    } else if (type === 'non-covered') {
      // Find non-covered code info
      nonCoveredData.forEach((item: any) => {
        if (item.code === selectedItem) {
          if (item.indication) result.conditions.push(item.indication);
          if (item.branches) {
            item.branches.forEach((branch: any) => {
              const branchStr = typeof branch === 'string' ? branch : (branch?.code || '');
              if (branchStr) result.branches.push(branchStr);
            });
          }
        }
      });
      
      // Try to find related drugs from main data
      data.forEach((drug: any) => {
        if (drug.icdCodes && drug.icdCodes.includes(selectedItem)) {
          result.drugs.push(...(drug.tradeNames || []));
          if (drug.scientificName) result.conditions.push(drug.scientificName);
        }
      });
      
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
      result.branches = Array.from(new Set(result.branches));
    }
    
    return result;
  }, [selectedItem, type, data, nonCoveredData, treeData]);

  const getTitle = () => {
    switch (type) {
      case 'drugs': return 'Search Active Ingredients';
      case 'conditions': return 'Search Conditions';
      case 'codes': return 'Search ICD-10 Codes';
      case 'non-covered': return 'Non-Covered Codes';
      default: return 'Browse';
    }
  };

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
                  {relatedData.codes.map((code: string, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-green-50 text-green-900 border border-green-200">
                      <div className="flex-1">
                        <div className="font-mono font-bold text-sm">{code}</div>
                        <div className="text-xs text-green-700 mt-1">{getCodeName(code)}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBranch(code)}
                        className="ml-2 h-8 w-8 p-0 hover:bg-green-100"
                      >
                        {expandedBranches.has(code) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
                {/* Display branches for expanded codes */}
                {Array.from(expandedBranches).map(expandedCode => {
                   // Find branches for this code from treeData
                   const codeItem = treeData.find((item: any) => item.code === expandedCode);
                   if (!codeItem || !codeItem.branches || codeItem.branches.length === 0) return null;
                   
                   return (
                     <div key={`branches-${expandedCode}`} className="mt-2 ml-4 space-y-1 border-l-2 border-green-200 pl-2">
                       <div className="text-xs font-semibold text-slate-500 mb-1">Branches for {expandedCode}:</div>
                       {codeItem.branches.map((branch: any, bIdx: number) => {
                         const branchCode = typeof branch === 'string' ? branch : branch.code;
                         const branchName = typeof branch === 'string' ? getBranchName(branch) : (branch.description || branchCode);
                         return (
                           <div key={bIdx} className="text-sm p-1.5 rounded bg-white border border-slate-100 shadow-sm">
                             <span className="font-mono font-bold text-xs mr-2">{branchCode}</span>
                             <span className="text-slate-700 text-xs">{branchName}</span>
                           </div>
                         );
                       })}
                     </div>
                   );
                })}
              </div>
            )}

            {/* 1. Indication with Code (for drugs) */}
            {type === 'drugs' && relatedData.conditions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-sm text-slate-700">Indication</h3>
                <div className="space-y-2">
                  {relatedData.conditions.map((condition: string, idx: number) => {
                    const relatedCode = relatedData.codes[idx] || '';
                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between p-2 rounded bg-green-50 text-green-900 border border-green-200">
                          <div className="flex-1 text-sm">{condition}</div>
                          {relatedCode && (
                            <div className="flex items-center gap-2 ml-2">
                              <span className="font-mono font-bold text-sm">{relatedCode}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleBranch(relatedCode)}
                                className="h-7 w-7 p-0 hover:bg-green-100 transition-colors"
                              >
                                {expandedBranches.has(relatedCode) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                        {expandedBranches.has(relatedCode) && (
                          <div className="mt-2 ml-2 space-y-1 border-l-2 border-green-200 pl-2">
                            {(() => {
                              const codeItem = treeData.find((item: any) => item.code === relatedCode);
                              if (!codeItem || !codeItem.branches || codeItem.branches.length === 0) {
                                return <div className="text-xs text-slate-500">No branches</div>;
                              }
                              return codeItem.branches.map((branch: any, bIdx: number) => {
                                const branchCode = typeof branch === 'string' ? branch : branch.code;
                                const branchName = typeof branch === 'string' ? getBranchName(branch) : (branch.description || branchCode);
                                return (
                                  <div key={bIdx} className="text-sm p-1.5 rounded bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                    <span className="font-mono font-bold text-xs mr-2 text-green-700">{branchCode}</span>
                                    <span className="text-slate-700 text-xs">{branchName}</span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
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
                </div>
              </div>
            )}

            {/* 2. Scientific Names */}
            {relatedData.conditions.length > 0 && (type === 'conditions' || type === 'codes' || type === 'non-covered') && (
              <div>
                <h3 className="font-semibold mb-3 text-sm text-slate-700">Scientific Names ({relatedData.conditions.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {relatedData.conditions.map((condition: string, idx: number) => (
                    <div key={idx} className="text-sm p-2 rounded bg-blue-50 text-blue-900 border border-blue-200">
                      {condition}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Related Trade Names (renamed from Related Medications) */}
            {relatedData.drugs.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-sm text-slate-700">Related Trade Names ({relatedData.drugs.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {relatedData.drugs.map((drug: string, idx: number) => (
                    <div key={idx} className="text-sm p-2 rounded bg-amber-50 text-amber-900 border border-amber-200">
                      {drug}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Code Branches with Expansion */}
            {relatedData.branches.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-sm text-slate-700">Code Branches ({relatedData.branches.length})</h3>
                <div className="space-y-2">
                  {relatedData.branches.map((branch: string, idx: number) => (
                    <div key={idx} className="border rounded overflow-hidden">
                      <button
                        onClick={() => toggleBranch(branch)}
                        className="w-full px-3 py-2 text-left hover:bg-purple-50 transition-colors flex items-center justify-between bg-purple-50 text-purple-900 border border-purple-200"
                      >
                        <div className="flex-1 text-left">
                          <div className="font-mono text-sm font-bold">{branch}</div>
                          <div className="text-xs text-purple-700 mt-1">{getBranchName(branch)}</div>
                        </div>
                        {expandedBranches.has(branch) ? (
                          <ChevronUp className="h-4 w-4 ml-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 ml-2" />
                        )}
                      </button>
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
          {filteredLetters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No results found
            </div>
          ) : (
            filteredLetters.map((letter) => (
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
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
