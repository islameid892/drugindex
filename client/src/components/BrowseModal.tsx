import { useEffect, useMemo, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle } from 'lucide-react';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';

interface BrowseModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'drugs' | 'conditions' | 'codes' | 'non-covered';
  data: any[];
}

export default function BrowseModal({ isOpen, onClose, type, data }: BrowseModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
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
        return 'Browse Non-Covered Codes';
      default:
        return '';
    }
  };

  // Check if code has associated drugs
  const getCodesWithDrugs = (code: string) => {
    return mainData.filter(item => 
      Array.isArray(item.icdCodes) && item.icdCodes.some((c: string) => c.trim() === code)
    );
  };

  // Extract and sort data based on type
  const sortedData = useMemo(() => {
    let items: any[] = [];

    if (type === 'drugs') {
      const drugSet = new Set();
      localData.forEach((item) => {
        if (item.scientificName) {
          drugSet.add(item.scientificName);
        }
      });
      items = Array.from(drugSet) as any[];
    } else if (type === 'conditions') {
      const conditionSet = new Set();
      localData.forEach((item) => {
        if (item.indication) {
          conditionSet.add(item.indication);
        }
      });
      items = Array.from(conditionSet) as any[];
    } else if (type === 'codes') {
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
      items = localData.map(item => ({
        code: item.code,
        description: item.description,
        hasDrugs: getCodesWithDrugs(item.code).length > 0
      }));
    }

    return items.sort((a, b) => {
      const aStr = type === 'non-covered' ? a.code : String(a);
      const bStr = type === 'non-covered' ? b.code : String(b);
      return aStr.localeCompare(bStr);
    });
  }, [localData, mainData, type]);

  // Filter based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedData;
    }
    return sortedData.filter((item) => {
      const searchStr = type === 'non-covered' 
        ? `${item.code} ${item.description}`.toLowerCase()
        : String(item).toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    });
  }, [sortedData, searchQuery, type]);

  // Group data by first letter/character
  const groupedData = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredData.forEach((item) => {
      const firstChar = type === 'non-covered' 
        ? item.code.charAt(0).toUpperCase()
        : String(item).charAt(0).toUpperCase();
      if (!groups[firstChar]) {
        groups[firstChar] = [];
      }
      groups[firstChar].push(item);
    });
    return groups;
  }, [filteredData, type]);

  const groupLetters = Object.keys(groupedData).sort();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col w-full sm:w-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{getTitle()}</DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <div className="relative">
            <Input
              ref={searchInputRef}
              type="search"
              placeholder={`Search ${type === 'drugs' ? 'drugs' : type === 'conditions' ? 'conditions' : type === 'non-covered' ? 'codes or descriptions' : 'codes'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 text-sm sm:text-base"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                          className="px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors text-sm sm:text-base active:bg-accent/70 flex items-start justify-between gap-2"
                          onClick={() => {
                            searchInputRef.current?.blur();
                            // Haptic feedback
                            if (navigator.vibrate) {
                              navigator.vibrate(10);
                            }
                            if (item.hasDrugs) {
                              navigate(`/code/${encodeURIComponent(item.code)}`);
                            } else {
                              navigate(`/code/${encodeURIComponent(item.code)}`);
                            }
                            onClose();
                          }}
                        >
                          <div className="flex-1">
                            <div className="font-semibold">{item.code}</div>
                            <div className="text-xs text-muted-foreground">{item.description}</div>
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
                    return (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors text-sm sm:text-base active:bg-accent/70"
                        onClick={() => {
                          searchInputRef.current?.blur();
                          // Haptic feedback
                          if (navigator.vibrate) {
                            navigator.vibrate(10);
                          }
                          const itemStr = String(item);
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
                        {String(item)}
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
