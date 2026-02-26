import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Search, X, Loader2, ArrowRight } from "lucide-react";

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Custom debounce hook for better performance
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function AdvancedSearchModal({ isOpen, onClose }: AdvancedSearchModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [scientificName, setScientificName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [indications, setIndications] = useState<string[]>([]);
  
  const [scientificNameInput, setScientificNameInput] = useState("");
  const [tradeNameInput, setTradeNameInput] = useState("");
  const [indicationInput, setIndicationInput] = useState("");
  
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<any[]>([]);
  const [showScientificDropdown, setShowScientificDropdown] = useState(false);
  const [showTradeNameDropdown, setShowTradeNameDropdown] = useState(false);
  const [showIndicationDropdown, setShowIndicationDropdown] = useState(false);

  // Debounce inputs for better performance (300ms delay)
  const debouncedScientificNameInput = useDebounce(scientificNameInput, 300);
  const debouncedTradeNameInput = useDebounce(tradeNameInput, 300);
  const debouncedIndicationInput = useDebounce(indicationInput, 300);

  // API Queries with debounced inputs
  const scientificNameSuggestions = trpc.advancedSearch.scientificNameSuggestions.useQuery(
    { query: debouncedScientificNameInput, limit: 8 },
    { 
      enabled: debouncedScientificNameInput.length > 0,
      staleTime: 30000, // Cache for 30 seconds
      gcTime: 60000, // Keep in cache for 1 minute
    }
  );

  const tradeNameSuggestions = trpc.advancedSearch.tradeNameSuggestions.useQuery(
    { scientificName: scientificName || "", query: debouncedTradeNameInput, limit: 10 },
    { 
      enabled: debouncedTradeNameInput.length > 0,
      staleTime: 30000,
      gcTime: 60000,
    }
  );

  const indicationsSuggestions = trpc.advancedSearch.indicationsSuggestions.useQuery(
    { scientificName: scientificName || "", tradeNames: tradeName ? [tradeName] : [], query: debouncedIndicationInput || "", limit: 50 },
    { 
      enabled: step === 2 && (scientificName.length > 0 || tradeName.length > 0),
      staleTime: 30000,
      gcTime: 60000,
    }
  );

  const searchQuery = trpc.advancedSearch.search.useQuery(
    { scientificName, tradeNames: tradeName ? [tradeName] : [], indications },
    { 
      enabled: step === 2 && (scientificName.length > 0 || tradeName.length > 0) && indications.length > 0,
      staleTime: 30000,
      gcTime: 60000,
    }
  );

  // Update results when search query completes
  useEffect(() => {
    if (searchQuery.data?.codes) {
      setResults(searchQuery.data.codes);
    }
  }, [searchQuery.data]);

  const handleSelectScientificName = (name: string) => {
    setScientificName(name);
    setScientificNameInput("");
    setShowScientificDropdown(false);
    setIndications([]);
    setStep(2);
  };

  const handleSelectTradeName = (name: string) => {
    setTradeName(name);
    setTradeNameInput("");
    setShowTradeNameDropdown(false);
    setIndications([]);
    setStep(2);
  };

  const handleToggleIndication = (indication: string) => {
    setIndications(prev =>
      prev.includes(indication) ? prev.filter(i => i !== indication) : [...prev, indication]
    );
  };

  const handleClose = () => {
    setStep(1);
    setScientificName("");
    setTradeName("");
    setIndications([]);
    setScientificNameInput("");
    setTradeNameInput("");
    setIndicationInput("");
    setResults([]);
    setExpandedCodes(new Set());
    setShowScientificDropdown(false);
    setShowTradeNameDropdown(false);
    setShowIndicationDropdown(false);
    onClose();
  };

  const toggleBranches = (code: string) => {
    const newExpanded = new Set(expandedCodes);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedCodes(newExpanded);
  };

  const handleBack = () => {
    setStep(1);
    setIndications([]);
    setIndicationInput("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-none overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4 pt-4 px-8">
          <div className="flex items-center justify-between w-full">
            <DialogTitle className="text-3xl font-bold">Advanced Search</DialogTitle>
            <span className="text-sm font-semibold bg-blue-100 text-blue-700 px-4 py-2 rounded-full">
              Step {step} of 2
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Step 1: Scientific Name & Trade Name */}
          {step === 1 && (
            <div className="space-y-8">
              {/* Scientific Name Field */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
                  <h3 className="font-semibold text-lg">Scientific Name</h3>
                </div>
                
                <div className="relative">
                  <Input
                    placeholder="Type scientific name..."
                    value={scientificNameInput}
                    onChange={e => {
                      setScientificNameInput(e.target.value);
                      setShowScientificDropdown(true);
                    }}
                    onFocus={() => setShowScientificDropdown(true)}
                    className="h-10 text-sm"
                  />
                  
                  {/* Scientific Name Suggestions Dropdown */}
                  {showScientificDropdown && debouncedScientificNameInput.length > 0 && scientificName.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-[500px] overflow-y-auto">
                      {scientificNameSuggestions.isLoading && (
                        <div className="px-3 py-3 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      )}
                      {scientificNameSuggestions.data?.length === 0 && !scientificNameSuggestions.isLoading && (
                        <div className="px-3 py-3 text-sm text-gray-500 text-center">No results found</div>
                      )}
                      {scientificNameSuggestions.data?.map(item => (
                        <button
                          key={item.name}
                          onClick={() => handleSelectScientificName(item.name)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 text-sm flex justify-between items-center transition-colors"
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded">{item.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {scientificName && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm flex items-center justify-between">
                    <span>✓ Selected: <strong>{scientificName}</strong></span>
                    <button onClick={() => { setScientificName(""); setScientificNameInput(""); }} className="text-green-700 hover:text-green-900">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Trade Name Field */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                  <h3 className="font-semibold text-lg">Trade Name <span className="text-gray-500 font-normal">(Optional)</span></h3>
                </div>

                <div className="relative">
                  <Input
                    placeholder="Type trade name..."
                    value={tradeNameInput}
                    onChange={e => {
                      setTradeNameInput(e.target.value);
                      setShowTradeNameDropdown(true);
                    }}
                    onFocus={() => setShowTradeNameDropdown(true)}
                    className="h-10 text-sm"
                  />

                  {/* Trade Name Suggestions Dropdown */}
                  {showTradeNameDropdown && debouncedTradeNameInput.length > 0 && tradeName.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-[500px] overflow-y-auto">
                      {tradeNameSuggestions.isLoading && (
                        <div className="px-3 py-3 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      )}
                      {tradeNameSuggestions.data?.length === 0 && !tradeNameSuggestions.isLoading && (
                        <div className="px-3 py-3 text-sm text-gray-500 text-center">No results found</div>
                      )}
                      {tradeNameSuggestions.data?.map(item => (
                        <button
                          key={item.name}
                          onClick={() => handleSelectTradeName(item.name)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 text-sm transition-colors"
                        >
                          <span className="font-medium">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {tradeName && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm flex items-center justify-between">
                    <span>✓ Selected: <strong>{tradeName}</strong></span>
                    <button onClick={() => { setTradeName(""); setTradeNameInput(""); }} className="text-green-700 hover:text-green-900">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Info message */}
              {!scientificName && !tradeName && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                  Fill in either Scientific Name or Trade Name to continue
                </div>
              )}
            </div>
          )}

          {/* Step 2: Indications */}
          {step === 2 && (scientificName || tradeName) && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">3</div>
                <h3 className="font-semibold text-lg">Select Indications</h3>
              </div>

              <div className="relative mb-3">
                <Input
                  placeholder="Search indications..."
                  value={indicationInput}
                  onChange={e => {
                    setIndicationInput(e.target.value);
                    setShowIndicationDropdown(true);
                  }}
                  onFocus={() => setShowIndicationDropdown(true)}
                  onBlur={() => setTimeout(() => setShowIndicationDropdown(false), 200)}
                  className="h-10 text-sm"
                />

                {/* Indications Suggestions Dropdown */}
                {showIndicationDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-[600px] overflow-y-auto">
                    {indicationsSuggestions.isLoading && (
                      <div className="px-3 py-3 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    )}
                    {!indicationsSuggestions.isLoading && indicationsSuggestions.data?.length === 0 && (
                      <div className="px-3 py-3 text-sm text-gray-500 text-center">No results found</div>
                    )}
                    {indicationsSuggestions.data && indicationsSuggestions.data.map(item => (
                      <button
                        key={item.indication}
                        onClick={() => {
                          handleToggleIndication(item.indication);
                          setIndicationInput("");
                          setShowIndicationDropdown(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-green-50 border-b last:border-b-0 text-sm transition-colors"
                      >
                        {item.indication}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Indications */}
              {indications.length > 0 && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
                  <div className="text-sm font-semibold text-green-900 mb-2">Selected Indications ({indications.length}):</div>
                  <div className="flex flex-wrap gap-2">
                    {indications.map(indication => (
                      <div key={indication} className="bg-green-200 text-green-900 px-3 py-1.5 rounded text-sm flex items-center gap-2">
                        {indication}
                        <button onClick={() => handleToggleIndication(indication)} className="hover:text-green-700">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {searchQuery.data?.codes && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold text-base mb-4">ICD-10 Codes ({results.length})</h4>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {results.map((result: any) => {
                      const isNonCovered = result.isCovered === false || result.coverage === 'non-covered';
                      const bgColor = isNonCovered ? 'bg-red-50 hover:bg-red-100 border-red-200' : 'bg-gray-50 hover:bg-gray-100';
                      const textColor = isNonCovered ? 'text-red-700' : 'text-gray-600';
                      return (
                      <div key={result.code} className={`border rounded-lg p-4 ${bgColor} transition-colors`}>
                        <button
                          onClick={() => toggleBranches(result.code)}
                          className="w-full flex items-center justify-between p-2 rounded"
                        >
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <div className="font-semibold text-base">{result.code}</div>
                              {isNonCovered && (
                                <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs font-semibold rounded">NOT COVERED</span>
                              )}
                            </div>
                            <div className={`text-sm ${textColor} mt-1`}>{result.name}</div>
                          </div>
                          {expandedCodes.has(result.code) ? (
                            <ChevronUp className={`h-5 w-5 ${isNonCovered ? 'text-red-500' : 'text-gray-500'}`} />
                          ) : (
                            <ChevronDown className={`h-5 w-5 ${isNonCovered ? 'text-red-500' : 'text-gray-500'}`} />
                          )}
                        </button>

                        {/* Branches */}
                        {expandedCodes.has(result.code) && result.branches && result.branches.length > 0 && (
                          <div className={`mt-3 ml-4 space-y-2 border-l-2 ${isNonCovered ? 'border-red-300' : 'border-blue-300'} pl-4`}>
                            {Array.isArray(result.branches) && result.branches.map((branch: any) => {
                              const branchNonCovered = branch.isCovered === false || branch.coverage === 'non-covered';
                              return (
                              <div key={branch.code} className={`text-sm py-1 ${branchNonCovered ? 'bg-red-50 p-2 rounded' : ''}`}>
                                <div className={`font-medium ${branchNonCovered ? 'text-red-700' : 'text-blue-700'}`}>{branch.code}</div>
                                <div className={`mt-0.5 ${branchNonCovered ? 'text-red-600' : 'text-gray-600'}`}>{branch.description || branch.name || 'No description'}</div>
                              </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="border-t p-6 flex justify-between gap-3">
          {step === 2 && (
            <Button variant="outline" onClick={handleBack} className="text-base px-6 py-2">
              ← Back
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={handleClose} className="text-base px-6 py-2">
            Close
          </Button>
          {step === 1 && (scientificName || tradeName) && (
            <Button onClick={() => setStep(2)} className="text-base px-6 py-2 bg-blue-600 hover:bg-blue-700">
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {step === 2 && indications.length > 0 && (
            <Button onClick={() => {}} disabled={searchQuery.isLoading} className="text-base px-6 py-2 bg-green-600 hover:bg-green-700">
              {searchQuery.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Search
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
