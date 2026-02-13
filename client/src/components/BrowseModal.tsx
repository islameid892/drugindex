'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ArrowLeft, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      
      if (/^\d/.test(item)) {
        firstLetter = '0-9';
      }
      
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(item);
    });
    
    return groups;
  }, [sourceList]);

  // Filter based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupedData;
    }
    
    const filtered: { [key: string]: string[] } = {};
    
    Object.entries(groupedData).forEach(([letter, items]) => {
      const filteredItems = items.filter(item =>
        matchesSearchQuery(item, searchQuery)
      );
      
      if (filteredItems.length > 0) {
        filtered[letter] = filteredItems;
      }
    });
    
    return filtered;
  }, [groupedData, searchQuery]);

  const filteredLetters = useMemo(() => {
    return Object.keys(filteredGroups).sort();
  }, [filteredGroups]);

  // Auto-expand when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedLetters(new Set(filteredLetters));
    } else {
      setExpandedLetters(new Set());
    }
  }, [searchQuery, filteredLetters]);

  const toggleLetter = (letter: string) => {
    const newExpanded = new Set(expandedLetters);
    if (newExpanded.has(letter)) {
      newExpanded.delete(letter);
    } else {
      newExpanded.add(letter);
    }
    setExpandedLetters(newExpanded);
  };

  const handleItemClick = (item: string) => {
    setSelectedItem(item);
    setViewMode('details');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedItem(null);
  };

  // Get related data based on selected item
  const relatedData = useMemo(() => {
    const result = {
      drugs: [] as string[],
      conditions: [] as string[],
      codes: [] as string[],
      branches: [] as string[]
    };
    
    if (type === 'drugs') {
      // Find all drugs with this active ingredient
      data.forEach((item: any) => {
        if (item.scientificName === selectedItem) {
          result.drugs.push(...(item.tradeNames || []));
          if (item.indication) result.conditions.push(item.indication);
          if (item.icdCodes) result.codes.push(...item.icdCodes);
        }
      });
      
      // Get branches for all codes
      if (result.codes.length > 0) {
        const uniqueCodesSet = new Set(result.codes);
        uniqueCodesSet.forEach((code: string) => {
          treeData.forEach((treeItem: any) => {
            if (treeItem.code === code && treeItem.branches) {
              result.branches.push(...treeItem.branches);
            }
          });
        });
      }
      
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
      result.codes = Array.from(new Set(result.codes));
      result.branches = Array.from(new Set(result.branches));
    } else if (type === 'conditions') {
      // Find all drugs with this condition
      data.forEach((item: any) => {
        if (item.indication === selectedItem) {
          result.drugs.push(...(item.tradeNames || []));
          if (item.scientificName) result.conditions.push(item.scientificName);
          if (item.icdCodes) result.codes.push(...item.icdCodes);
        }
      });
      
      // Get branches for all codes
      if (result.codes.length > 0) {
        const uniqueCodesSet = new Set(result.codes);
        uniqueCodesSet.forEach((code: string) => {
          treeData.forEach((treeItem: any) => {
            if (treeItem.code === code && treeItem.branches) {
              result.branches.push(...treeItem.branches);
            }
          });
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
          if (treeItem.branches) result.branches.push(...treeItem.branches);
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
          if (item.branches) result.branches.push(...item.branches);
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
          
          <ScrollArea className="flex-1 h-full w-full">
            <div className="px-4 sm:px-6 py-4 space-y-6 pr-4">
              {relatedData.drugs.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm">Trade Names ({relatedData.drugs.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {relatedData.drugs.map((drug: any, idx) => {
                      const drugText = typeof drug === 'string' ? drug : (drug?.name || drug?.code || String(drug));
                      return (
                        <div key={idx} className="text-sm p-2 rounded bg-blue-50 text-blue-900 border border-blue-200">
                          {drugText}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {relatedData.conditions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm">Conditions / Active Ingredients ({relatedData.conditions.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {relatedData.conditions.map((condition: any, idx) => {
                      const conditionText = typeof condition === 'string' ? condition : (condition?.name || condition?.code || String(condition));
                      return (
                        <div key={idx} className="text-sm p-2 rounded bg-green-50 text-green-900 border border-green-200">
                          {conditionText}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {relatedData.codes.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm">ICD-10 Codes ({relatedData.codes.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {relatedData.codes.map((code: any, idx) => {
                      const codeText = typeof code === 'string' ? code : (code?.code || String(code));
                      return (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {codeText}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {relatedData.branches.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-sm">Code Branches ({relatedData.branches.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {relatedData.branches.map((branch: any, idx) => {
                      const branchText = typeof branch === 'string' ? branch : (branch?.name || branch?.code || String(branch));
                      return (
                        <div key={idx} className="text-sm p-2 rounded bg-purple-50 text-purple-900 border border-purple-200">
                          {branchText}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
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
        
        <ScrollArea className="flex-1 h-full w-full">
          <div className="px-4 sm:px-6 py-3 space-y-2 pr-4">
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
