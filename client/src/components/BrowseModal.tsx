'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle, ArrowLeft, ChevronDown } from 'lucide-react';
import { useLocation } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef, useMemo } from 'react';

interface BrowseModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'drugs' | 'conditions' | 'codes' | 'non-covered';
  data: any[];
}

export default function BrowseModal({ isOpen, onClose, type, data }: BrowseModalProps) {
  const [initialized, setInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localData, setLocalData] = useState<any[]>([]);
  const [mainData, setMainData] = useState<any[]>([]);
  const [expandedLetters, setExpandedLetters] = useState<Set<string>>(new Set());
  const [, navigate] = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    setSearchQuery('');
    searchInputRef.current?.blur();
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  // Create code to drugs map for fast lookup
  const codeTodrugsMap = useMemo(() => {
    if (mainData.length === 0) return new Map();
    const map = new Map<string, number>();
    mainData.forEach((item) => {
      if (Array.isArray(item.icdCodes)) {
        item.icdCodes.forEach((code: string) => {
          const key = code.trim();
          map.set(key, (map.get(key) || 0) + 1);
        });
      }
    });
    return map;
  }, [mainData]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (type === 'non-covered') {
        const nonCoveredCodes = [
          'B07', 'E28.1', 'E65', 'F10', 'F10.1', 'F10.3', 'F10.5', 'F11', 'F11.5', 'F12', 'F12.0', 'F12.1', 'F12.2', 'F12.3',
          'F13', 'F13.1', 'F13.10', 'F13.2', 'F13.20', 'F13.29', 'F13.9', 'F14.5', 'F15', 'F15.1', 'F16', 'F16.0', 'F16.49',
          'F16.5', 'F17.1', 'F17.2', 'F17.3', 'F19', 'F19.0', 'F19.2', 'F19.9', 'F51.0', 'F52', 'F52.0', 'F52.1', 'F52.2',
          'F52.3', 'F52.4', 'F52.5', 'F52.6', 'F52.7', 'F52.8', 'F52.9', 'F55.4', 'F55.5', 'F64.2', 'F64.8', 'F65', 'F65.6',
          'F65.8', 'F65.9', 'F66.2', 'F66.9', 'J60', 'K29.20', 'L57.8', 'L63', 'L63.0', 'L63.1', 'L63.8', 'L64', 'L64.0',
          'L64.8', 'L64.9', 'L65', 'L65.0', 'L65.1', 'L65.2', 'L65.8', 'L65.9', 'L66', 'L66.0', 'L66.1', 'L66.2', 'L66.3',
          'L66.4', 'L66.8', 'L66.9', 'L67', 'L67.1', 'L67.8', 'L67.9', 'L68', 'L68.0', 'L68.8', 'L70', 'L70.0', 'L70.1',
          'L70.2', 'L70.3', 'L70.4', 'L70.5'
        ];
        const codes = nonCoveredCodes.map((code) => ({
          code,
          description: `${code} - Not Covered`,
          hasDrugs: codeTodrugsMap.has(code),
        }));
        setLocalData(codes);
      } else if (type === 'drugs') {
        setLocalData(data);
      } else if (type === 'conditions') {
        setLocalData(data);
      } else if (type === 'codes') {
        setLocalData(data);
      }
    }
  }, [isOpen, type, data, codeTodrugsMap]);

  useEffect(() => {
    setMainData(data);
  }, [data]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return localData;

    const query = searchQuery.toLowerCase();
    return localData.filter((item) => {
      if (type === 'drugs') {
        return (
          item.tradeNames?.some((name: string) => name.toLowerCase().includes(query)) ||
          item.scientificName?.toLowerCase().includes(query)
        );
      } else if (type === 'conditions') {
        return item.toLowerCase?.includes(query) || item.includes?.(query);
      } else if (type === 'non-covered' || type === 'codes') {
        return (
          item.code?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        );
      }
      return false;
    });
  }, [searchQuery, localData, type]);

  // Group data by first letter
  const groupedData = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredData.forEach((item) => {
      let firstLetter = '';
      if (type === 'drugs') {
        firstLetter = item.tradeNames?.[0]?.[0]?.toUpperCase() || '#';
      } else if (type === 'conditions') {
        firstLetter = item[0]?.toUpperCase() || '#';
      } else {
        firstLetter = item.code?.[0]?.toUpperCase() || '#';
      }

      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(item);
    });
    return groups;
  }, [filteredData, type]);

  const groupLetters = Object.keys(groupedData).sort();

  // When search is active, expand all letters
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedLetters(new Set(groupLetters));
    } else if (groupLetters.length > 0 && expandedLetters.size === 0) {
      setExpandedLetters(new Set([groupLetters[0]]));
    }
  }, [searchQuery]);

  const toggleLetter = (letter: string) => {
    const newExpanded = new Set(expandedLetters);
    if (newExpanded.has(letter)) {
      newExpanded.delete(letter);
    } else {
      newExpanded.add(letter);
    }
    setExpandedLetters(newExpanded);
  };

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
        return 'Browse';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-[100vh] h-screen flex flex-col w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl sm:max-h-[90vh] sm:h-auto rounded-t-3xl sm:rounded-lg fixed bottom-0 sm:fixed sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 p-0 sm:p-6">
        <DialogHeader className="pb-4 border-b flex flex-row items-center justify-between px-4 sm:px-0">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <DialogTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex-1 text-center">{getTitle()}</DialogTitle>
          <div className="w-10" />
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative mb-4 sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4 px-4 sm:px-0">
          <Search className="absolute left-7 sm:left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
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

        {/* Scrollable List with Collapse */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-0 space-y-2">
          {groupLetters.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No results found
            </div>
          ) : (
            groupLetters.map((letter) => (
              <div key={letter} className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Letter Header - Collapsible */}
                <button
                  onClick={() => toggleLetter(letter)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-primary">
                    {letter} ({groupedData[letter].length})
                  </h3>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-600 transition-transform ${
                      expandedLetters.has(letter) ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Items - Collapsible Content */}
                {expandedLetters.has(letter) && (
                  <div className="space-y-1 p-2">
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
                            if (type === 'drugs') {
                              navigate(`/drug/${encodeURIComponent(item.tradeNames?.[0])}`);
                            } else if (type === 'conditions') {
                              navigate(`/condition/${encodeURIComponent(item)}`);
                            } else if (type === 'codes') {
                              navigate(`/code/${encodeURIComponent(item.code)}`);
                            }
                            onClose();
                          }}
                        >
                          <div className="font-semibold text-base group-hover:text-primary transition-colors">
                            {isObjectItem
                              ? item.tradeNames?.[0] || item.code || String(item)
                              : String(item)}
                          </div>
                          {isObjectItem && item.scientificName && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {item.scientificName}
                            </div>
                          )}
                          {isObjectItem && item.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {item.description}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
