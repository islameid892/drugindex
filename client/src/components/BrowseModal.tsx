import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useMemo, useRef } from 'react';

interface BrowseModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'drugs' | 'conditions' | 'codes' | 'non-covered';
  data: any[];
  searchQuery?: string;
}

export default function BrowseModal({ isOpen, onClose, type, data, searchQuery: initialSearchQuery = '' }: BrowseModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [localData, setLocalData] = useState<any[]>([]);
  const [mainData, setMainData] = useState<any[]>([]);
  const [, navigate] = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    setSearchQuery('');
    searchInputRef.current?.blur();
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (type === 'non-covered') {
        Promise.all([
          fetch('/data/non_covered_codes_full.json').then(r => r.json()),
          fetch('/data/main_data.json').then(r => r.json())
        ]).then(([nonCovered, main]) => {
          setLocalData(nonCovered);
          setMainData(main);
        }).catch(e => console.error('Error loading data:', e));
      } else if (data.length === 0) {
        fetch('/data/main_data.json')
          .then(r => r.json())
          .then(d => setLocalData(d))
          .catch(e => console.error('Error loading data:', e));
      } else {
        setLocalData(data);
      }
    }
  }, [isOpen, data, type]);

  // Initialize search query from props when modal opens
  useEffect(() => {
    if (isOpen && initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [isOpen, initialSearchQuery]);

  // Get title and description based on type
  const getTitle = () => {
    switch (type) {
      case 'drugs':
        return 'Search Drugs';
      case 'conditions':
        return 'Find Conditions';
      case 'codes':
        return 'Browse Codes';
      case 'non-covered':
        return 'Non-Covered Codes';
      default:
        return '';
    }
  };

  // Extract and sort data based on type
  const sortedData = useMemo(() => {
    let items: any[] = [];

    if (type === 'drugs') {
      // Extract unique drug names with their full data
      const drugMap = new Map();
      localData.forEach((item) => {
        if (item.scientificName) {
          if (!drugMap.has(item.scientificName)) {
            drugMap.set(item.scientificName, item);
          }
        }
      });
      items = Array.from(drugMap.values());
    } else if (type === 'conditions') {
      // Extract unique conditions
      const conditionSet = new Set();
      localData.forEach((item) => {
        if (item.indication) {
          conditionSet.add(item.indication);
        }
      });
      items = Array.from(conditionSet) as any[];
    } else if (type === 'codes') {
      // Extract unique codes from icdCodes array
      const codeSet = new Set();
      localData.forEach((item) => {
        if (Array.isArray(item.icdCodes)) {
          item.icdCodes.forEach((code: string) => {
            const mainCode = code.trim().substring(0, 3);
            codeSet.add(mainCode);
          });
        }
      });
      items = Array.from(codeSet) as any[];
    } else if (type === 'non-covered') {
      items = localData;
    }

    // Sort alphabetically
    return items.sort((a, b) => {
      const aStr = type === 'non-covered' ? a.code : String(a);
      const bStr = type === 'non-covered' ? b.code : String(b);
      return aStr.localeCompare(bStr);
    });
  }, [localData, type]);

  // Filter based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedData;
    }
    return sortedData.filter((item) => {
      if (type === 'non-covered') {
        return item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
               item.description.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return String(item).toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [searchQuery, sortedData, type]);

  // Group data by first letter
  const groupedData = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    filteredData.forEach((item) => {
      const firstLetter = type === 'non-covered' 
        ? item.code.charAt(0).toUpperCase()
        : String(item).charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(item);
    });
    return grouped;
  }, [filteredData, type]);

  const groupLetters = Object.keys(groupedData).sort();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-[100vh] h-screen flex flex-col w-full sm:max-w-2xl sm:max-h-[90vh] sm:h-auto rounded-t-3xl sm:rounded-lg fixed bottom-0 sm:fixed sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">{getTitle()}</DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative mb-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="search"
              placeholder={`Search ${type === 'drugs' ? 'drugs' : type === 'conditions' ? 'conditions' : type === 'non-covered' ? 'codes or descriptions' : 'codes'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 text-base h-12 rounded-xl border-2 border-primary/20 focus:border-primary"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-accent rounded-lg"
                aria-label="Clear search"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto pr-4 space-y-4">
          {groupLetters.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No results found
            </div>
          ) : (
            groupLetters.map((letter) => (
              <div key={letter}>
                <h3 className="text-sm font-semibold text-primary mb-2 sticky top-0 bg-background py-1">
                  {letter}
                </h3>
                <div className="space-y-1">
                  {groupedData[letter].map((item, idx) => {
                    if (type === 'non-covered') {
                      return (
                        <div
                          key={idx}
                          className="px-4 py-3 rounded-lg hover:bg-accent cursor-pointer transition-all active:bg-accent/70 border border-transparent hover:border-primary/20 flex items-start justify-between gap-3 group"
                          onClick={() => {
                            searchInputRef.current?.blur();
                            if (navigator.vibrate) {
                              navigator.vibrate(10);
                            }
                            navigate(`/code/${encodeURIComponent(item.code)}`);
                            onClose();
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base group-hover:text-primary transition-colors">{item.code}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!item.hasDrugs && (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Not Covered
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    }
                    const isObjectItem = typeof item === 'object' && item !== null;
                    return (
                      <div
                        key={idx}
                        className="px-4 py-3 rounded-lg hover:bg-accent cursor-pointer transition-all active:bg-accent/70 border border-transparent hover:border-primary/20 group"
                        onClick={() => {
                          searchInputRef.current?.blur();
                          if (navigator.vibrate) {
                            navigator.vibrate(10);
                          }
                          const itemStr = isObjectItem ? (item.scientificName || String(item)) : String(item);
                          if (type === 'drugs') {
                            navigate(`/drug/${encodeURIComponent(itemStr)}`);
                          } else if (type === 'conditions') {
                            navigate(`/condition/${encodeURIComponent(itemStr)}`);
                          } else if (type === 'codes') {
                            navigate(`/code/${encodeURIComponent(itemStr)}`);
                          }
                          onClose();
                        }}
                      >
                        {type === 'drugs' && isObjectItem ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-base group-hover:text-primary transition-colors">{item.scientificName || item}</div>
                            {item.atcCodes && item.atcCodes.length > 0 && (
                              <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                                <span className="font-medium">ATC:</span>
                                <span>{item.atcCodes.join(", ")}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="font-semibold text-base group-hover:text-primary transition-colors">{String(item)}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Results count */}
        <div className="text-xs sm:text-sm text-muted-foreground text-center mt-2">
          Showing {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
        </div>
      </DialogContent>
    </Dialog>
  );
}
