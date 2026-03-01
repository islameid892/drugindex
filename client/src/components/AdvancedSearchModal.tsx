import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2, ChevronLeft } from "lucide-react";

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
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

  const debouncedScientificNameInput = useDebounce(scientificNameInput, 300);
  const debouncedTradeNameInput = useDebounce(tradeNameInput, 300);
  const debouncedIndicationInput = useDebounce(indicationInput, 300);

  const scientificNameSuggestions = trpc.advancedSearch.scientificNameSuggestions.useQuery(
    { query: debouncedScientificNameInput, limit: 8 },
    { 
      enabled: debouncedScientificNameInput.length > 0,
      staleTime: 30000,
      gcTime: 60000,
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

  const searchMutation = trpc.advancedSearch.search.useMutation();

  useEffect(() => {
    if (searchMutation.data?.codes) {
      setResults(searchMutation.data.codes);
    }
  }, [searchMutation.data]);

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
      <DialogContent className="w-[95vw] h-[95vh] max-w-none overflow-hidden flex flex-col bg-background">
        {/* Simple Clean Header */}
        <div className="border-b border-border/50 px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Advanced Search</h1>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {step === 1 ? (
            /* Step 1: Simple Input Fields */
            <div className="max-w-2xl space-y-6">
              {/* Scientific Name */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">Scientific Name</label>
                <div className="relative">
                  <Input
                    placeholder="Search by scientific name..."
                    value={scientificNameInput}
                    onChange={e => {
                      setScientificNameInput(e.target.value);
                      setShowScientificDropdown(true);
                    }}
                    onFocus={() => setShowScientificDropdown(true)}
                    className="h-11 text-sm border border-border rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  />
                  
                  {showScientificDropdown && debouncedScientificNameInput.length > 0 && scientificName.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
                      {scientificNameSuggestions.isLoading && (
                        <div className="px-4 py-3 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      )}
                      {scientificNameSuggestions.data?.length === 0 && !scientificNameSuggestions.isLoading && (
                        <div className="px-4 py-3 text-sm text-muted-foreground text-center">No results</div>
                      )}
                      {scientificNameSuggestions.data?.map(item => (
                        <button
                          key={item.name}
                          onClick={() => handleSelectScientificName(item.name)}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted border-b border-border/30 last:border-b-0 text-sm transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-foreground">{item.name}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{item.count}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {scientificName && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-emerald-700 dark:text-emerald-300"><strong>{scientificName}</strong></span>
                    <button onClick={() => { setScientificName(""); setScientificNameInput(""); }} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Trade Name */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">Trade Name <span className="font-normal text-muted-foreground">(Optional)</span></label>
                <div className="relative">
                  <Input
                    placeholder="Search by trade name..."
                    value={tradeNameInput}
                    onChange={e => {
                      setTradeNameInput(e.target.value);
                      setShowTradeNameDropdown(true);
                    }}
                    onFocus={() => setShowTradeNameDropdown(true)}
                    className="h-11 text-sm border border-border rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  />

                  {showTradeNameDropdown && debouncedTradeNameInput.length > 0 && tradeName.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
                      {tradeNameSuggestions.isLoading && (
                        <div className="px-4 py-3 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </div>
                      )}
                      {tradeNameSuggestions.data?.length === 0 && !tradeNameSuggestions.isLoading && (
                        <div className="px-4 py-3 text-sm text-muted-foreground text-center">No results</div>
                      )}
                      {tradeNameSuggestions.data?.map(item => (
                        <button
                          key={item.name}
                          onClick={() => handleSelectTradeName(item.name)}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted border-b border-border/30 last:border-b-0 text-sm transition-colors"
                        >
                          <span className="font-medium text-foreground">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {tradeName && (
                  <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-emerald-700 dark:text-emerald-300"><strong>{tradeName}</strong></span>
                    <button onClick={() => { setTradeName(""); setTradeNameInput(""); }} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Next Button */}
              <div className="pt-4">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!scientificName && !tradeName}
                  className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-all"
                >
                  Next: Select Indications
                </Button>
              </div>
            </div>
          ) : (
            /* Step 2: Indications */
            <div className="max-w-2xl">
              <div className="mb-6">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sky-600 hover:text-sky-700 font-medium text-sm mb-4"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
                <h2 className="text-lg font-bold text-foreground">Select Indications</h2>
                <p className="text-sm text-muted-foreground mt-1">Choose indications to search for related ICD-10 codes</p>
              </div>

              <div className="space-y-3 mb-6">
                <Input
                  placeholder="Search indications..."
                  value={indicationInput}
                  onChange={e => {
                    setIndicationInput(e.target.value);
                    setShowIndicationDropdown(true);
                  }}
                  onFocus={() => setShowIndicationDropdown(true)}
                  className="h-11 text-sm border border-border rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                />

                {showIndicationDropdown && indicationsSuggestions.data && (
                  <div className="bg-card border border-border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                    {indicationsSuggestions.data.map((item: any) => {
                      const indicationText = typeof item === 'string' ? item : item.indication;
                      return (
                        <button
                          key={indicationText}
                          onClick={() => handleToggleIndication(indicationText)}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted border-b border-border/30 last:border-b-0 text-sm transition-colors flex items-center gap-3"
                        >
                          <input
                            type="checkbox"
                            checked={indications.includes(indicationText)}
                            readOnly
                            className="w-4 h-4"
                          />
                          <span className="text-foreground">{indicationText}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {indications.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-foreground mb-3">Selected Indications:</p>
                  <div className="flex flex-wrap gap-2">
                    {indications.map(indication => (
                      <div key={indication} className="px-3 py-1.5 bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-lg text-sm font-medium flex items-center gap-2">
                        {indication}
                        <button onClick={() => handleToggleIndication(indication)} className="hover:text-sky-900 dark:hover:text-sky-200">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => searchMutation.mutate({ scientificName, tradeNames: tradeName ? [tradeName] : [], indications })}
                disabled={searchMutation.isPending}
                className="w-full h-11 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-all"
              >
                {searchMutation.isPending ? "Searching..." : "Search"}
              </Button>

              {results.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-bold text-foreground">Results ({results.length})</h3>
                  {results.map((code, idx) => (
                    <div key={idx} className="p-4 border border-border rounded-lg bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{code.code}</p>
                          <p className="text-sm text-muted-foreground">{code.description}</p>
                        </div>
                        {code.branches && code.branches.length > 0 && (
                          <button
                            onClick={() => toggleBranches(code.code)}
                            className="text-sky-600 hover:text-sky-700"
                          >
                            {expandedCodes.has(code.code) ? "Hide" : "Show"} Branches
                          </button>
                        )}
                      </div>
                      {expandedCodes.has(code.code) && code.branches && (
                        <div className="mt-3 space-y-2 border-t border-border/30 pt-3">
                          {code.branches.map((branch: any, bIdx: number) => (
                            <div key={bIdx} className="text-sm text-muted-foreground pl-4">
                              • {branch.code}: {branch.description}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
