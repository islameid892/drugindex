import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2, ChevronLeft, ChevronRight, Copy, Check, AlertTriangle } from "lucide-react";

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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-none overflow-hidden flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border/50 px-8 py-8 bg-gradient-to-r from-sky-50/50 to-blue-50/30 dark:from-sky-950/30 dark:to-blue-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {step === 2 && (
                <button 
                  onClick={() => {
                    setStep(1);
                    setResults([]);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-2"
                  title="Back to search"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg">
                <Search className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Advanced Search</h1>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors p-2">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {step === 1 ? (
            /* Step 1: Search Criteria */
            <div className="max-w-3xl space-y-8">
              {/* Scientific Name */}
              <div>
                <label className="block text-lg font-bold text-foreground mb-4">Scientific Name</label>
                <div className="relative">
                  <Input
                    placeholder="Enter scientific name..."
                    value={scientificNameInput}
                    onChange={e => {
                      setScientificNameInput(e.target.value);
                      setShowScientificDropdown(true);
                    }}
                    onFocus={() => setShowScientificDropdown(true)}
                    className="h-14 text-base border-2 border-border rounded-xl focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all placeholder:text-base"
                  />
                  
                  {showScientificDropdown && debouncedScientificNameInput.length > 0 && scientificName.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border-2 border-border rounded-xl shadow-xl z-50 max-h-[400px] overflow-y-auto">
                      {scientificNameSuggestions.isLoading && (
                        <div className="px-6 py-6 text-base text-muted-foreground text-center flex items-center justify-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Loading...
                        </div>
                      )}
                      {scientificNameSuggestions.data?.length === 0 && !scientificNameSuggestions.isLoading && (
                        <div className="px-6 py-6 text-base text-muted-foreground text-center">No results found</div>
                      )}
                      {scientificNameSuggestions.data?.map(item => (
                        <button
                          key={item.name}
                          onClick={() => handleSelectScientificName(item.name)}
                          className="w-full text-left px-6 py-4 hover:bg-muted border-b border-border/30 last:border-b-0 text-base transition-colors flex justify-between items-center"
                        >
                          <span className="font-semibold text-foreground">{item.name}</span>
                          <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-lg">{item.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {scientificName && (
                  <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between">
                    <span className="text-base text-emerald-700 dark:text-emerald-300"><strong>{scientificName}</strong></span>
                    <button onClick={() => { setScientificName(""); setScientificNameInput(""); }} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Trade Name */}
              <div>
                <label className="block text-lg font-bold text-foreground mb-4">Trade Name <span className="font-normal text-muted-foreground text-base">(Optional)</span></label>
                <div className="relative">
                  <Input
                    placeholder="Enter trade name..."
                    value={tradeNameInput}
                    onChange={e => {
                      setTradeNameInput(e.target.value);
                      setShowTradeNameDropdown(true);
                    }}
                    onFocus={() => setShowTradeNameDropdown(true)}
                    className="h-14 text-base border-2 border-border rounded-xl focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all placeholder:text-base"
                  />

                  {showTradeNameDropdown && debouncedTradeNameInput.length > 0 && tradeName.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border-2 border-border rounded-xl shadow-xl z-50 max-h-[400px] overflow-y-auto">
                      {tradeNameSuggestions.isLoading && (
                        <div className="px-6 py-6 text-base text-muted-foreground text-center flex items-center justify-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Loading...
                        </div>
                      )}
                      {tradeNameSuggestions.data?.length === 0 && !tradeNameSuggestions.isLoading && (
                        <div className="px-6 py-6 text-base text-muted-foreground text-center">No results found</div>
                      )}
                      {tradeNameSuggestions.data?.map(item => (
                        <button
                          key={item.name}
                          onClick={() => handleSelectTradeName(item.name)}
                          className="w-full text-left px-6 py-4 hover:bg-muted border-b border-border/30 last:border-b-0 text-base transition-colors"
                        >
                          <span className="font-semibold text-foreground">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {tradeName && (
                  <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between">
                    <span className="text-base text-emerald-700 dark:text-emerald-300"><strong>{tradeName}</strong></span>
                    <button onClick={() => { setTradeName(""); setTradeNameInput(""); }} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Next Button */}
              <div className="pt-4">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!scientificName && !tradeName}
                  className="w-full h-14 bg-sky-600 hover:bg-sky-700 text-white font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Next: Select Indications
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ) : (
            /* Step 2: Indications */
            <div className="max-w-3xl">
              <div className="mb-8">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-sky-600 hover:text-sky-700 font-semibold text-lg mb-6"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Back
                </button>
                <h2 className="text-3xl font-bold text-foreground mb-3">Select Indications</h2>
                <p className="text-lg text-muted-foreground">Choose indications to search for related ICD-10 codes</p>
              </div>

              <div className="space-y-4 mb-8">
                <Input
                  placeholder="Search indications..."
                  value={indicationInput}
                  onChange={e => {
                    setIndicationInput(e.target.value);
                    setShowIndicationDropdown(true);
                  }}
                  onFocus={() => setShowIndicationDropdown(true)}
                  className="h-14 text-base border-2 border-border rounded-xl focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all placeholder:text-base"
                />

                {showIndicationDropdown && indicationsSuggestions.data && (
                  <div className="bg-card border-2 border-border rounded-xl shadow-lg max-h-[400px] overflow-y-auto">
                    {indicationsSuggestions.data.map((item: any) => {
                      const indicationText = typeof item === 'string' ? item : item.indication;
                      return (
                        <button
                          key={indicationText}
                          onClick={() => handleToggleIndication(indicationText)}
                          className="w-full text-left px-6 py-4 hover:bg-muted border-b border-border/30 last:border-b-0 text-base transition-colors flex items-center gap-4"
                        >
                          <input
                            type="checkbox"
                            checked={indications.includes(indicationText)}
                            readOnly
                            className="w-5 h-5 cursor-pointer"
                          />
                          <span className="text-foreground font-medium">{indicationText}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {indications.length > 0 && (
                <div className="mb-8">
                  <p className="text-lg font-bold text-foreground mb-4">Selected Indications:</p>
                  <div className="flex flex-wrap gap-3">
                    {indications.map(indication => (
                      <div key={indication} className="px-4 py-2 bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-lg text-base font-semibold flex items-center gap-2">
                        {indication}
                        <button onClick={() => handleToggleIndication(indication)} className="hover:text-sky-900 dark:hover:text-sky-200">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => searchMutation.mutate({ scientificName, tradeNames: tradeName ? [tradeName] : [], indications })}
                disabled={searchMutation.isPending}
                className="w-full h-14 bg-sky-600 hover:bg-sky-700 text-white font-bold text-lg rounded-xl transition-all"
              >
                {searchMutation.isPending ? "Searching..." : "Search"}
              </Button>

              {results.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-2xl font-bold text-foreground">Results ({results.length})</h3>
                  {results.map((code, idx) => {
                    const isUCode = code.code.startsWith('U');
                    return (
                    <div key={idx} className={`p-6 border-2 rounded-xl ${isUCode ? 'border-orange-400 bg-orange-50/50 dark:bg-orange-950/20' : 'border-border bg-card'}`}>
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold text-lg ${isUCode ? 'text-orange-700 dark:text-orange-400' : 'text-foreground'}`}>{code.code}</p>
                            {isUCode && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-orange-200 dark:bg-orange-900/50 rounded-md">
                                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">Please read note</span>
                              </div>
                            )}
                          </div>
                          <p className="text-base text-muted-foreground mt-1">{code.description}</p>
                        </div>
                        {code.branches && code.branches.length > 0 && (
                          <button
                            onClick={() => toggleBranches(code.code)}
                            className="text-sky-600 hover:text-sky-700 font-semibold text-base whitespace-nowrap"
                          >
                            {expandedCodes.has(code.code) ? "Hide" : "Show"} Branches
                          </button>
                        )}
                      </div>
                      {expandedCodes.has(code.code) && code.branches && (
                        <div className="mt-4 space-y-3 border-t-2 border-border/30 pt-4">
                          {isUCode && (
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 border-l-4 border-orange-500 rounded-md mb-3">
                              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                                ⚠️ Note: "U" codes are not allowed to be used as primary/Principal Diagnosis.
                              </p>
                            </div>
                          )}
                          {code.branches.map((branch: any, bIdx: number) => (
                            <div key={bIdx} className="flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <span className="inline-block px-3 py-1.5 bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 rounded-lg font-bold text-base">
                                  {branch.code}
                                </span>
                                <p className="text-base text-muted-foreground mt-2">{branch.description}</p>
                              </div>
                              <button
                                onClick={() => handleCopyCode(branch.code)}
                                className="flex-shrink-0 p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground mt-1"
                                title="Copy code"
                              >
                                {copiedCode === branch.code ? (
                                  <Check className="h-5 w-5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
