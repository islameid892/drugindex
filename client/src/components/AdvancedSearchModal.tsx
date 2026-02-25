import { useState, useEffect } from "react";
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

  // API Queries
  const scientificNameSuggestions = trpc.advancedSearch.scientificNameSuggestions.useQuery(
    { query: scientificNameInput, limit: 8 },
    { enabled: scientificNameInput.length > 0 }
  );

  const tradeNameSuggestions = trpc.advancedSearch.tradeNameSuggestions.useQuery(
    { scientificName: scientificName || "", query: tradeNameInput, limit: 10 },
    { enabled: tradeNameInput.length > 0 }
  );

  const indicationsSuggestions = trpc.advancedSearch.indicationsSuggestions.useQuery(
    { scientificName: scientificName || "", tradeNames: tradeName ? [tradeName] : [], query: indicationInput || "", limit: 50 },
    { enabled: step === 2 && (scientificName.length > 0 || tradeName.length > 0) }
  );

  const searchQuery = trpc.advancedSearch.search.useQuery(
    { scientificName, tradeNames: tradeName ? [tradeName] : [], indications },
    { enabled: step === 2 && (scientificName.length > 0 || tradeName.length > 0) && indications.length > 0 }
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Advanced Search</DialogTitle>
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
              Step {step} of 2
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Step 1: Scientific Name & Trade Name */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Scientific Name Field */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                  <h3 className="font-semibold text-sm">Scientific Name</h3>
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
                  {showScientificDropdown && scientificNameInput.length > 0 && scientificName.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                      {scientificNameSuggestions.isLoading && (
                        <div className="px-3 py-2 text-xs text-gray-500 text-center">Loading...</div>
                      )}
                      {scientificNameSuggestions.data?.length === 0 && !scientificNameSuggestions.isLoading && (
                        <div className="px-3 py-2 text-xs text-gray-500 text-center">No results found</div>
                      )}
                      {scientificNameSuggestions.data?.map(item => (
                        <button
                          key={item.name}
                          onClick={() => handleSelectScientificName(item.name)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-xs flex justify-between items-center"
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-gray-500 text-xs">{item.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {scientificName && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs flex items-center justify-between">
                    <span>✓ Selected: <strong>{scientificName}</strong></span>
                    <button onClick={() => { setScientificName(""); setScientificNameInput(""); }} className="text-green-700 hover:text-green-900">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Trade Name Field */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                  <h3 className="font-semibold text-sm">Trade Name <span className="text-gray-500 font-normal">(Optional)</span></h3>
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
                  {showTradeNameDropdown && tradeNameInput.length > 0 && tradeName.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                      {tradeNameSuggestions.isLoading && (
                        <div className="px-3 py-2 text-xs text-gray-500 text-center">Loading...</div>
                      )}
                      {tradeNameSuggestions.data?.length === 0 && !tradeNameSuggestions.isLoading && (
                        <div className="px-3 py-2 text-xs text-gray-500 text-center">No results found</div>
                      )}
                      {tradeNameSuggestions.data?.map(item => (
                        <button
                          key={item.name}
                          onClick={() => handleSelectTradeName(item.name)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 text-xs flex justify-between items-center"
                        >
                          <span className="font-medium">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {tradeName && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs flex items-center justify-between">
                    <span>✓ Selected: <strong>{tradeName}</strong></span>
                    <button onClick={() => { setTradeName(""); setTradeNameInput(""); }} className="text-green-700 hover:text-green-900">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Info message */}
              {!scientificName && !tradeName && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  Fill in either Scientific Name or Trade Name to continue
                </div>
              )}
            </div>
          )}

          {/* Step 2: Indications */}
          {step === 2 && (scientificName || tradeName) && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                <h3 className="font-semibold text-sm">Select Indications</h3>
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
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                    {indicationsSuggestions.isLoading && (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center">Loading...</div>
                    )}
                    {!indicationsSuggestions.isLoading && indicationsSuggestions.data?.length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center">No results found</div>
                    )}
                    {indicationsSuggestions.data && indicationsSuggestions.data.map(item => (
                      <button
                        key={item.indication}
                        onClick={() => {
                          handleToggleIndication(item.indication);
                          setIndicationInput("");
                          setShowIndicationDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-green-50 border-b last:border-b-0 text-xs"
                      >
                        {item.indication}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Indications */}
              {indications.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="text-xs font-semibold text-green-900 mb-2">Selected Indications ({indications.length}):</div>
                  <div className="flex flex-wrap gap-2">
                    {indications.map(indication => (
                      <div key={indication} className="bg-green-200 text-green-900 px-2 py-1 rounded text-xs flex items-center gap-1">
                        {indication}
                        <button onClick={() => handleToggleIndication(indication)} className="hover:text-green-700">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {searchQuery.data?.codes && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold text-sm mb-3">ICD-10 Codes ({results.length})</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {results.map((result: any) => (
                      <div key={result.code} className="border rounded p-3 bg-gray-50">
                        <button
                          onClick={() => toggleBranches(result.code)}
                          className="w-full flex items-center justify-between hover:bg-gray-100 p-2 rounded"
                        >
                          <div className="text-left">
                            <div className="font-semibold text-sm">{result.code}</div>
                            <div className="text-xs text-gray-600">{result.name}</div>
                          </div>
                          {expandedCodes.has(result.code) ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                        </button>

                        {/* Branches */}
                        {expandedCodes.has(result.code) && result.branches && result.branches.length > 0 && (
                          <div className="mt-2 ml-4 space-y-1 border-l-2 border-blue-200 pl-3">
                            {Array.isArray(result.branches) && result.branches.map((branch: any) => (
                              <div key={branch.code} className="text-xs">
                                <div className="font-medium text-blue-700">{branch.code}</div>
                                <div className="text-gray-600">{branch.description || branch.name || 'No description'}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="border-t p-4 flex justify-between gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={handleBack} className="text-xs">
              ← Back
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={handleClose} className="text-xs">
            Close
          </Button>
          {step === 1 && (scientificName || tradeName) && (
            <Button onClick={() => setStep(2)} className="text-xs bg-blue-600 hover:bg-blue-700">
              Next <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
          {step === 2 && indications.length > 0 && (
            <Button onClick={() => {}} disabled={searchQuery.isLoading} className="text-xs bg-green-600 hover:bg-green-700">
              {searchQuery.isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3 mr-1" />}
              Search
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
