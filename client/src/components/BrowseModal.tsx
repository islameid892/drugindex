import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ArrowLeft, AlertCircle, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BrowseModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'drugs' | 'conditions' | 'codes' | 'non-covered';
  data: any[];
  nonCoveredData?: any[];
}

type ViewMode = 'list' | 'details';

export default function BrowseModal({ isOpen, onClose, type, data, nonCoveredData = [] }: BrowseModalProps) {
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
    
    // Extract codes from non-covered data
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
      
      // Handle numbers
      if (/^\d/.test(item)) {
        firstLetter = item[0];
      }
      
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(item);
    });
    
    return groups;
  }, [sourceList]);

  const groupLetters = Object.keys(groupedData).sort();

  // Filter data based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) {
      return groupedData;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered: { [key: string]: string[] } = {};
    
    Object.entries(groupedData).forEach(([letter, items]) => {
      const filteredItems = items.filter(item => 
        item.toLowerCase().includes(query)
      );
      if (filteredItems.length > 0) {
        filtered[letter] = filteredItems;
      }
    });
    
    return filtered;
  }, [groupedData, searchQuery]);

  const filteredLetters = Object.keys(filteredGroups).sort();

  // Auto-expand all when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedLetters(new Set(filteredLetters));
    } else if (groupLetters.length > 0) {
      // Reset to first letter when search is cleared
      setExpandedLetters(new Set([groupLetters[0]]));
    }
  }, [searchQuery]); // Only depend on searchQuery, not filteredLetters

  // Initialize with first letter expanded
  useEffect(() => {
    if (groupLetters.length > 0 && expandedLetters.size === 0) {
      setExpandedLetters(new Set([groupLetters[0]]));
    }
  }, [groupLetters]);

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

  // Get related data for selected item
  const relatedData = useMemo(() => {
    if (!selectedItem) return { drugs: [] as string[], conditions: [] as string[], codes: [] as string[] };
    
    const result = { drugs: [] as string[], conditions: [] as string[], codes: [] as string[] };
    
    if (type === 'drugs') {
      // Find all drugs with this scientific name
      data.forEach((item: any) => {
        if (item.scientificName === selectedItem) {
          result.drugs.push(...(item.tradeNames || []));
          if (item.indication) result.conditions.push(item.indication);
          result.codes.push(...(item.icdCodes || []));
        }
      });
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
      result.codes = Array.from(new Set(result.codes));
    } else if (type === 'conditions') {
      // Find all drugs with this condition
      data.forEach((item: any) => {
        if (item.indication === selectedItem) {
          result.drugs.push(...(item.tradeNames || []));
          result.codes.push(...(item.icdCodes || []));
        }
      });
      result.drugs = Array.from(new Set(result.drugs));
      result.codes = Array.from(new Set(result.codes));
    } else if (type === 'codes') {
      // Find all drugs with this code
      data.forEach((item: any) => {
        if (item.icdCodes && item.icdCodes.includes(selectedItem)) {
          result.drugs.push(...(item.tradeNames || []));
          if (item.indication) result.conditions.push(item.indication);
        }
      });
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
    } else if (type === 'non-covered') {
      // Find non-covered code info
      nonCoveredData.forEach((item: any) => {
        if (item.code === selectedItem) {
          // Try to find related drugs from main data
          data.forEach((drug: any) => {
            if (drug.icdCodes && drug.icdCodes.includes(selectedItem)) {
              result.drugs.push(...(drug.tradeNames || []));
              if (drug.indication) result.conditions.push(drug.indication);
            }
          });
        }
      });
      result.drugs = Array.from(new Set(result.drugs));
      result.conditions = Array.from(new Set(result.conditions));
    }
    
    return result;
  }, [selectedItem, type, data, nonCoveredData]);

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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-lg">{selectedItem}</DialogTitle>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-6">
              {relatedData.drugs.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Trade Names ({relatedData.drugs.length})</h3>
                  <div className="space-y-2">
                    {relatedData.drugs.map((drug, idx) => (
                      <div key={idx} className="text-sm p-2 rounded bg-blue-50 text-blue-900">
                        {drug}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {relatedData.conditions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm">Conditions / Indications ({relatedData.conditions.length})</h3>
                  <div className="space-y-2">
                    {relatedData.conditions.map((condition, idx) => (
                      <div key={idx} className="text-sm p-2 rounded bg-green-50 text-green-900">
                        {condition}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {relatedData.codes.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm">ICD-10 Codes ({relatedData.codes.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {relatedData.codes.map((code, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {code}
                      </Badge>
                    ))}
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 w-[95vw] sm:w-full">
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
        
        <ScrollArea className="flex-1">
          <div className="px-4 sm:px-6 py-3 space-y-2">
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
