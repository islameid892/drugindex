'use client';

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const [showResults, setShowResults] = useState(false);
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
    { scientificName: scientificName || "", tradeNames: tradeName ? [tradeName] : [], query: indicationInput || "", limit: 100 },
    { enabled: step === 2 && showIndicationDropdown }
  );

  const searchQuery = trpc.advancedSearch.search.useQuery(
    { scientificName, tradeNames: tradeName ? [tradeName] : [], indications },
    { enabled: step === 2 && (scientificName.length > 0 || tradeName.length > 0) && indications.length > 0 }
  );

  const handleSelectScientificName = (name: string) => {
    setScientificName(name);
    setScientificNameInput("");
    setShowScientificDropdown(false);
    setStep(2);
  };

  const handleSelectTradeName = (name: string) => {
    setTradeName(name);
    setTradeNameInput("");
    setShowTradeNameDropdown(false);
    setStep(2);
  };

  const handleSelectIndication = (indication: string) => {
    setIndications(prev => 
      prev.includes(indication) ? prev.filter(i => i !== indication) : [...prev, indication]
    );
  };

  const handleSearch = async () => {
    if (searchQuery.data) {
      setResults(searchQuery.data.codes || []);
    }
  };

  const handleClose = () => {
    setStep(1);
    setScientificName("");
    setTradeName("");
    setIndications([]);
    setScientificNameInput("");
    setTradeNameInput("");
    setIndicationInput("");
    setExpandedCodes(new Set());
    setResults([]);
    onClose();
  };

  const toggleBranch = (code: string) => {
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
      <DialogContent className="max-w-6xl max-h-[95vh] w-[95vw] flex flex-col">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Advanced Search</DialogTitle>
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
              Step {step} of 2
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
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
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-[100] max-h-64 overflow-y-auto">
                      {scientificNameSuggestions.isLoading && (
                        <div className="p-3 text-center text-gray-500 text-sm">Loading...</div>
                      )}
                      {scientificNameSuggestions.data && scientificNameSuggestions.data.length > 0 && (
                        <div className="divide-y">
                          {scientificNameSuggestions.data.map((item: any) => (
                            <button
                              key={item.name}
                              onClick={() => handleSelectScientificName(item.name)}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm flex items-center justify-between"
                            >
                              <span className="font-medium">{item.name}</span>
                              <span className="text-gray-500 text-xs">{item.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
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
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                  <h3 className="font-semibold text-sm">Trade Name <span className="text-gray-500">(Optional)</span></h3>
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
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-[100] max-h-64 overflow-y-auto">
                      {tradeNameSuggestions.isLoading && (
                        <div className="p-3 text-center text-gray-500 text-sm">Loading...</div>
                      )}
                      {tradeNameSuggestions.data && tradeNameSuggestions.data.length > 0 && (
                        <div className="divide-y">
                          {tradeNameSuggestions.data.map((item: any) => {
                            const tradeName = typeof item === 'string' ? item : item.name || item;
                            return (
                            <button
                              key={tradeName}
                              onClick={() => handleSelectTradeName(tradeName)}
                              className="w-full text-left px-4 py-2 hover:bg-purple-50 text-sm"
                            >
                              {tradeName}
                            </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {tradeName && (
                  <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-xs flex items-center justify-between">
                    <span>✓ Selected: <strong>{tradeName}</strong></span>
                    <button onClick={() => { setTradeName(""); setTradeNameInput(""); }} className="text-purple-700 hover:text-purple-900">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                Fill in either Scientific Name or Trade Name to continue
              </div>
            </div>
          )}

          {/* Step 2: Indications & Results */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Indications Selection */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                  <h3 className="font-semibold text-sm">Select Indications</h3>
                </div>
                
                <Popover open={showIndicationDropdown} onOpenChange={setShowIndicationDropdown}>
                  <PopoverTrigger asChild>
                    <Input
                      placeholder="Search indications..."
                      value={indicationInput}
                      onChange={e => setIndicationInput(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 z-[200]" align="start">
                    <div className="max-h-96 overflow-y-auto">
                      {indicationsSuggestions.isLoading && (
                        <div className="p-3 text-center text-gray-500 text-sm">Loading...</div>
                      )}
                      {indicationsSuggestions.data && indicationsSuggestions.data.length > 0 && (
                        <div className="divide-y">
                          {indicationsSuggestions.data.map((item: any) => (
                            <button
                              key={item}
                              onClick={() => handleSelectIndication(item)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                            >
                              <Checkbox 
                                checked={indications.includes(item)}
                                onChange={() => {}}
                              />
                              <span>{item}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {indications.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {indications.map(ind => (
                      <div key={ind} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-2">
                        <span>{ind}</span>
                        <button onClick={() => setIndications(prev => prev.filter(i => i !== ind))} className="hover:text-green-900">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3">ICD-10 Codes ({results.length})</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {results.map((code: any) => (
                      <div key={code.code} className="border rounded-lg p-3">
                        <button
                          onClick={() => toggleBranch(code.code)}
                          className="w-full text-left flex items-center justify-between hover:bg-gray-50 p-2 rounded"
                        >
                          <div>
                            <div className="font-semibold text-sm">{code.code}</div>
                            <div className="text-xs text-gray-600">{code.name}</div>
                          </div>
                          {expandedCodes.has(code.code) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        
                        {expandedCodes.has(code.code) && code.branches && code.branches.length > 0 && (
                          <div className="mt-2 ml-4 space-y-1 border-l-2 border-gray-300 pl-3">
                            {code.branches.map((branch: any) => (
                              <div key={branch.code} className="text-xs">
                                <div className="font-medium text-gray-700">{branch.code}</div>
                                <div className="text-gray-600">{branch.name}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  ← Back
                </Button>
                <Button 
                  onClick={handleSearch}
                  disabled={indications.length === 0 || searchQuery.isLoading}
                  className="flex-1"
                >
                  {searchQuery.isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Search
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="border-t pt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
