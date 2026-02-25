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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [scientificName, setScientificName] = useState("");
  const [tradeNames, setTradeNames] = useState<string[]>([]);
  const [indications, setIndications] = useState<string[]>([]);
  
  const [scientificNameInput, setScientificNameInput] = useState("");
  const [tradeNameInput, setTradeNameInput] = useState("");
  const [indicationInput, setIndicationInput] = useState("");
  
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<any[]>([]);

  // API Queries
  const scientificNameSuggestions = trpc.advancedSearch.scientificNameSuggestions.useQuery(
    { query: scientificNameInput, limit: 8 },
    { enabled: scientificNameInput.length > 0 }
  );

  const tradeNameSuggestions = trpc.advancedSearch.tradeNameSuggestions.useQuery(
    { scientificName, query: tradeNameInput, limit: 10 },
    { enabled: scientificName.length > 0 && step >= 2 }
  );

  const indicationsSuggestions = trpc.advancedSearch.indicationsSuggestions.useQuery(
    { scientificName, tradeNames, query: indicationInput, limit: 10 },
    { enabled: scientificName.length > 0 && step >= 3 }
  );

  const searchQuery = trpc.advancedSearch.search.useQuery(
    { scientificName, tradeNames, indications },
    { enabled: step === 4 && scientificName.length > 0 }
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
    setTradeNames([]);
    setIndications([]);
    setStep(2);
  };

  const handleToggleTradeName = (name: string) => {
    setTradeNames(prev => 
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  };

  const handleToggleIndication = (indication: string) => {
    setIndications(prev =>
      prev.includes(indication) ? prev.filter(i => i !== indication) : [...prev, indication]
    );
  };

  const handleClose = () => {
    setStep(1);
    setScientificName("");
    setTradeNames([]);
    setIndications([]);
    setScientificNameInput("");
    setTradeNameInput("");
    setIndicationInput("");
    setResults([]);
    setExpandedCodes(new Set());
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Advanced Search</DialogTitle>
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
              Step {step} of 4
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Step 1: Scientific Name */}
          {step >= 1 && (
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                <h3 className="font-semibold text-sm">Scientific Name</h3>
              </div>
              
              <div className="relative">
                <Input
                  placeholder="Type scientific name..."
                  value={scientificNameInput}
                  onChange={e => setScientificNameInput(e.target.value)}
                  disabled={scientificName.length > 0}
                  className="h-10 text-sm"
                />
                
                {/* Suggestions Dropdown */}
                {scientificNameInput.length > 0 && scientificName.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                    {scientificNameSuggestions.isLoading && (
                      <div className="px-3 py-2 text-xs text-gray-500 text-center">Loading...</div>
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
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                  ✓ Selected: <strong>{scientificName}</strong>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Trade Names */}
          {step >= 2 && scientificName && (
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                <h3 className="font-semibold text-sm">Trade Names <span className="text-gray-500 font-normal">(Optional)</span></h3>
              </div>

              <div className="relative mb-2">
                <Input
                  placeholder="Search trade names..."
                  value={tradeNameInput}
                  onChange={e => setTradeNameInput(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              {/* Trade Names List */}
              <div className="max-h-32 overflow-y-auto space-y-1 border rounded p-2 bg-gray-50">
                {tradeNameSuggestions.isLoading && (
                  <div className="text-xs text-gray-500 text-center py-2">Loading...</div>
                )}
                {tradeNameSuggestions.data?.map(item => (
                  <label key={item.name} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer text-xs">
                    <Checkbox
                      checked={tradeNames.includes(item.name)}
                      onChange={() => handleToggleTradeName(item.name)}
                    />
                    <span>{item.name}</span>
                  </label>
                ))}
              </div>

              {tradeNames.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tradeNames.map(name => (
                    <span key={name} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                      {name}
                      <button onClick={() => handleToggleTradeName(name)} className="hover:text-blue-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Indications */}
          {step >= 3 && scientificName && (
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                <h3 className="font-semibold text-sm">Indications</h3>
              </div>

              <div className="relative mb-2">
                <Input
                  placeholder="Search indications..."
                  value={indicationInput}
                  onChange={e => setIndicationInput(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              {/* Indications List */}
              <div className="max-h-32 overflow-y-auto space-y-1 border rounded p-2 bg-gray-50">
                {indicationsSuggestions.isLoading && (
                  <div className="text-xs text-gray-500 text-center py-2">Loading...</div>
                )}
                {indicationsSuggestions.data?.map(item => (
                  <label key={item.indication} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer text-xs">
                    <Checkbox
                      checked={indications.includes(item.indication)}
                      onChange={() => handleToggleIndication(item.indication)}
                    />
                    <span>{item.indication}</span>
                  </label>
                ))}
              </div>

              {indications.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {indications.map(ind => (
                    <span key={ind} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                      {ind}
                      <button onClick={() => handleToggleIndication(ind)} className="hover:text-green-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">4</div>
                <h3 className="font-semibold text-sm">ICD-10 Codes ({results.length})</h3>
              </div>

              {searchQuery.isLoading && (
                <div className="text-center py-4 text-xs text-gray-500">Loading results...</div>
              )}

              {results.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.map(result => (
                    <div key={result.code} className="border rounded p-2 hover:bg-gray-50">
                      <button
                        onClick={() => toggleBranches(result.code)}
                        className="w-full text-left flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-blue-600 text-sm">{result.code}</p>
                          <p className="text-xs text-gray-700 truncate">{result.description}</p>
                        </div>
                        {expandedCodes.has(result.code) ? (
                          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>

                      {expandedCodes.has(result.code) && result.branches?.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-blue-200 space-y-1">
                          {result.branches.map((branch: any) => (
                            <div key={branch.code} className="text-xs">
                              <p className="font-semibold text-blue-600">{branch.code}</p>
                              <p className="text-gray-600 truncate">{branch.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                !searchQuery.isLoading && (
                  <div className="text-center py-4 text-xs text-gray-500">No codes found</div>
                )
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="border-t pt-3 px-4 pb-3 flex gap-2 justify-between">
          {step > 1 && (
            <Button variant="outline" size="sm" onClick={() => setStep((step - 1) as 1 | 2 | 3)}>
              ← Back
            </Button>
          )}
          
          <div className="flex-1" />

          {step === 1 && scientificName && (
            <Button size="sm" onClick={() => setStep(2)}>
              Next →
            </Button>
          )}

          {step === 2 && (
            <Button size="sm" onClick={() => setStep(3)}>
              Next →
            </Button>
          )}

          {step === 3 && (
            <Button size="sm" onClick={() => setStep(4)}>
              Search
            </Button>
          )}

          {step === 4 && (
            <Button variant="outline" size="sm" onClick={() => setStep(3)}>
              Modify
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
