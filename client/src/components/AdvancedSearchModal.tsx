import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Search, X, Loader2 } from "lucide-react";

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  code: string;
  description: string;
  branches: Array<{ code: string; description: string }>;
  relatedMedications: string[];
}

interface SearchState {
  scientificName: string;
  tradeNames: string[];
  indications: string[];
}

export function AdvancedSearchModal({ isOpen, onClose }: AdvancedSearchModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [searchState, setSearchState] = useState<SearchState>({
    scientificName: "",
    tradeNames: [],
    indications: [],
  });

  // Autocomplete states
  const [scientificNameInput, setScientificNameInput] = useState("");
  const [tradeNameInput, setTradeNameInput] = useState("");
  const [indicationInput, setIndicationInput] = useState("");

  const [showScientificDropdown, setShowScientificDropdown] = useState(false);
  const [showTradeNameDropdown, setShowTradeNameDropdown] = useState(false);
  const [showIndicationDropdown, setShowIndicationDropdown] = useState(false);

  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<SearchResult[]>([]);

  // Refs for click-outside detection
  const scientificRef = useRef<HTMLDivElement>(null);
  const tradeNameRef = useRef<HTMLDivElement>(null);
  const indicationRef = useRef<HTMLDivElement>(null);

  // API queries
  const scientificNameSuggestions = trpc.advancedSearch.scientificNameSuggestions.useQuery(
    { query: scientificNameInput, limit: 8 },
    { enabled: scientificNameInput.length > 0 && step === 1 }
  );

  const tradeNameSuggestions = trpc.advancedSearch.tradeNameSuggestions.useQuery(
    { scientificName: searchState.scientificName, query: tradeNameInput, limit: 10 },
    { enabled: searchState.scientificName.length > 0 && step === 2 }
  );

  const indicationsSuggestions = trpc.advancedSearch.indicationsSuggestions.useQuery(
    {
      scientificName: searchState.scientificName,
      tradeNames: searchState.tradeNames,
      query: indicationInput,
      limit: 10,
    },
    { enabled: searchState.scientificName.length > 0 && step === 3 }
  );

  const [shouldSearch, setShouldSearch] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchState>({
    scientificName: "",
    tradeNames: [],
    indications: [],
  });

  const searchQuery = trpc.advancedSearch.search.useQuery(searchParams, {
    enabled: shouldSearch,
  });

  // Handle click outside dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (scientificRef.current && !scientificRef.current.contains(event.target as Node)) {
        setShowScientificDropdown(false);
      }
      if (tradeNameRef.current && !tradeNameRef.current.contains(event.target as Node)) {
        setShowTradeNameDropdown(false);
      }
      if (indicationRef.current && !indicationRef.current.contains(event.target as Node)) {
        setShowIndicationDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle scientific name selection
  const handleSelectScientificName = (name: string) => {
    setSearchState(prev => ({ ...prev, scientificName: name }));
    setScientificNameInput(name);
    setShowScientificDropdown(false);
    setStep(2);
  };

  // Handle trade name selection
  const handleSelectTradeName = (name: string) => {
    setSearchState(prev => ({
      ...prev,
      tradeNames: prev.tradeNames.includes(name)
        ? prev.tradeNames.filter(t => t !== name)
        : [...prev.tradeNames, name],
    }));
  };

  // Handle indication selection
  const handleSelectIndication = (indication: string) => {
    setSearchState(prev => ({
      ...prev,
      indications: prev.indications.includes(indication)
        ? prev.indications.filter(i => i !== indication)
        : [...prev.indications, indication],
    }));
  };

  // Handle skip trade names
  const handleSkipTradeNames = () => {
    setStep(3);
  };

  // Handle proceed to indications
  const handleProceedToIndications = () => {
    setStep(3);
  };

  // Handle proceed to results
  const handleProceedToResults = () => {
    setStep(4);
    setSearchParams(searchState);
    setShouldSearch(true);
  };

  // Update results when search completes
  useEffect(() => {
    if (searchQuery.data) {
      setResults(searchQuery.data.codes);
    }
  }, [searchQuery.data]);

  // Toggle code branches
  const toggleBranches = (code: string) => {
    const newExpanded = new Set(expandedCodes);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedCodes(newExpanded);
  };

  // Reset modal
  const handleClose = () => {
    setStep(1);
    setSearchState({ scientificName: "", tradeNames: [], indications: [] });
    setScientificNameInput("");
    setTradeNameInput("");
    setIndicationInput("");
    setResults([]);
    setExpandedCodes(new Set());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Advanced Search</DialogTitle>
        </DialogHeader>

        {/* Step 1: Scientific Name */}
        {step >= 1 && (
          <div className="space-y-4 pb-4 border-b">
            <div>
              <h3 className="font-semibold text-lg mb-2">Step 1: Scientific Name</h3>
              <div ref={scientificRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search scientific name..."
                    value={scientificNameInput}
                    onChange={e => {
                      setScientificNameInput(e.target.value);
                      setShowScientificDropdown(true);
                    }}
                    onFocus={() => setShowScientificDropdown(true)}
                    className="pl-10"
                  />
                </div>

                {/* Scientific Name Dropdown */}
                {showScientificDropdown && scientificNameSuggestions.data && scientificNameSuggestions.data.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {scientificNameSuggestions.data.map(suggestion => (
                      <button
                        key={suggestion.name}
                        onClick={() => handleSelectScientificName(suggestion.name)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0 flex justify-between items-center"
                      >
                        <span>{suggestion.name}</span>
                        <span className="text-xs text-gray-500">{suggestion.count} meds</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {searchState.scientificName && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm">
                    <strong>Selected:</strong> {searchState.scientificName}
                  </p>
                </div>
              )}
            </div>

            {searchState.scientificName && (
              <Button onClick={() => setStep(2)} className="w-full">
                Next: Trade Names
              </Button>
            )}
          </div>
        )}

        {/* Step 2: Trade Names */}
        {step >= 2 && searchState.scientificName && (
          <div className="space-y-4 pb-4 border-b">
            <div>
              <h3 className="font-semibold text-lg mb-2">Step 2: Trade Names (Optional)</h3>
              <div ref={tradeNameRef} className="relative mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search trade names..."
                    value={tradeNameInput}
                    onChange={e => {
                      setTradeNameInput(e.target.value);
                      setShowTradeNameDropdown(true);
                    }}
                    onFocus={() => setShowTradeNameDropdown(true)}
                    className="pl-10"
                  />
                </div>

                {/* Trade Name Dropdown */}
                {showTradeNameDropdown && tradeNameSuggestions.data && tradeNameSuggestions.data.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {tradeNameSuggestions.data.map(suggestion => (
                      <button
                        key={suggestion.name}
                        onClick={() => handleSelectTradeName(suggestion.name)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0 flex items-center gap-2"
                      >
                        <Checkbox checked={searchState.tradeNames.includes(suggestion.name)} />
                        <span>{suggestion.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Trade Names */}
              {searchState.tradeNames.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {searchState.tradeNames.map(name => (
                    <div key={name} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {name}
                      <button onClick={() => handleSelectTradeName(name)}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleSkipTradeNames} variant="outline" className="flex-1">
                  Skip
                </Button>
                <Button onClick={handleProceedToIndications} className="flex-1">
                  Next: Indications
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Indications */}
        {step >= 3 && searchState.scientificName && (
          <div className="space-y-4 pb-4 border-b">
            <div>
              <h3 className="font-semibold text-lg mb-2">Step 3: Indications</h3>
              <div ref={indicationRef} className="relative mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search indications..."
                    value={indicationInput}
                    onChange={e => {
                      setIndicationInput(e.target.value);
                      setShowIndicationDropdown(true);
                    }}
                    onFocus={() => setShowIndicationDropdown(true)}
                    className="pl-10"
                  />
                </div>

                {/* Indications Dropdown */}
                {showIndicationDropdown && indicationsSuggestions.data && indicationsSuggestions.data.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {indicationsSuggestions.data.map(suggestion => (
                      <button
                        key={suggestion.indication}
                        onClick={() => handleSelectIndication(suggestion.indication)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0 flex items-center gap-2"
                      >
                        <Checkbox checked={searchState.indications.includes(suggestion.indication)} />
                        <span>{suggestion.indication}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Indications */}
              {searchState.indications.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {searchState.indications.map(indication => (
                    <div key={indication} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {indication}
                      <button onClick={() => handleSelectIndication(indication)}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={handleProceedToResults} className="w-full">
                Search Results
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Results: {results.length} ICD-10 Codes Found
              </h3>

              {searchQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}

              {results.length === 0 && !searchQuery.isLoading && (
                <div className="text-center py-8 text-gray-500">
                  No codes found for the selected criteria.
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map(result => (
                  <div key={result.code} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-blue-600">{result.code}</div>
                        <div className="text-sm text-gray-700">{result.description}</div>
                      </div>
                      {result.branches.length > 0 && (
                        <button
                          onClick={() => toggleBranches(result.code)}
                          className="ml-2 p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedCodes.has(result.code) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Branches */}
                    {expandedCodes.has(result.code) && result.branches.length > 0 && (
                      <div className="mt-2 ml-4 space-y-1 border-l-2 border-gray-300 pl-3">
                        {result.branches.map(branch => (
                          <div key={branch.code} className="text-sm">
                            <div className="font-medium text-gray-600">{branch.code}</div>
                            <div className="text-gray-500">{branch.description}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={() => setStep(3)} variant="outline" className="w-full">
              Back to Filters
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
