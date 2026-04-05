import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { X, Search, ChevronDown, ChevronRight, Pill, Activity, AlertTriangle, Loader2, Link as LinkIcon, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

type BrowseType = "drugs" | "conditions" | "codes" | "non-covered";

interface BrowseModalProps {
  isOpen: boolean;
  type: BrowseType;
  onClose: () => void;
}

// ─── Drug Browse ───────────────────────────────────────────────────────────────

function DrugBrowse() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("A");
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [expandedDrugs, setExpandedDrugs] = useState<Set<number>>(new Set());
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query || "A"), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const { data, isLoading } = trpc.data.browseDrugs.useQuery(
    { query: debouncedQuery, limit: 15 },
    { staleTime: 30000 }
  );

  const toggleCode = (key: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleDrug = (idx: number) => {
    setExpandedDrugs((prev: Set<number>) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleViewAlternatives = (scientificName: string) => {
    navigate(`/browse/scientific-name/${encodeURIComponent(scientificName)}`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by trade name (e.g. Panadol, Augmentin...)"
            className="w-full pl-9 pr-4 py-3 text-base border border-border rounded-xl bg-muted/40 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>
        {data && (
          <p className="text-xs text-muted-foreground mt-2">
            Found <span className="font-semibold text-sky-600">{data.total.toLocaleString()}</span> results
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
          </div>
        )}

        {!isLoading && data?.results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No drugs found</p>
            <p className="text-sm mt-1">Try a different trade name</p>
          </div>
        )}

        {!isLoading && data?.results.map((drug, idx) => {
          const isDrugExpanded = expandedDrugs.has(idx);
          return (
            <div key={idx} className="border border-border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
              {/* Header - Collapsible */}
              <button
                onClick={() => toggleDrug(idx)}
                className="w-full bg-gradient-to-r from-sky-50 to-sky-50/50 dark:from-sky-950/50 dark:to-sky-950/30 px-4 py-3.5 border-b border-border hover:from-sky-100/50 dark:hover:from-sky-950/70 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Pill className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <h3 className="font-bold text-foreground text-sm leading-tight">{drug.tradeName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{drug.scientificName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewAlternatives(drug.scientificName);
                    }}
                    className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-900/40 hover:bg-sky-200 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-400 transition-all hover:scale-110"
                    title="View all trade names with same active ingredient"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                  {isDrugExpanded ? <ChevronDown className="h-4 w-4 text-sky-600" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expandable Content */}
              {isDrugExpanded && (
                <div className="divide-y divide-border/50">
                  {/* Indications */}
                  {drug.indications && drug.indications.length > 0 && (
                    <div className="px-4 py-3.5 bg-muted/20">
                      <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider mb-2.5">
                        Indications ({drug.indications.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {drug.indications.map((ind: any, iIdx: number) => (
                          <span key={iIdx} className="text-xs bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 px-3 py-1.5 rounded-full font-medium border border-sky-200/50 dark:border-sky-800/50">
                            {ind.indication}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ICD Codes by Indication */}
                  {drug.indications && drug.indications.length > 0 && (
                    <div className="px-4 py-3.5 bg-muted/20">
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-2.5">
                        ICD-10 Codes
                      </p>
                      <div className="space-y-3">
                        {drug.indications.map((indObj: any, iIdx: number) => (
                          <div key={iIdx}>
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5">{indObj.indication}</p>
                            <div className="flex flex-wrap gap-2">
                              {indObj.codes && indObj.codes.map((codeObj: any, cIdx: number) => {
                                const isUCode = codeObj.code?.startsWith('U');
                                return (
                                  <span key={cIdx} className={`text-xs px-2.5 py-1 rounded-lg font-medium border ${isUCode ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200/50 dark:border-orange-800/50' : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/50'}`}>
                                    {codeObj.code}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Condition Browse ──────────────────────────────────────────────────────────

function ConditionBrowse() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("A");
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedConditions, setExpandedConditions] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query || "A"), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const { data, isLoading } = trpc.data.browseConditions.useQuery(
    { query: debouncedQuery, limit: 10 },
    { staleTime: 30000 }
  );

  const toggleCode = (key: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCondition = (idx: number) => {
    setExpandedConditions((prev: Set<number>) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };



  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search condition (e.g. Diabetes, Hypertension...)"
            className="w-full pl-9 pr-4 py-3 text-base border border-border rounded-xl bg-muted/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        {data && (
          <p className="text-xs text-muted-foreground mt-2">
            Found <span className="font-semibold text-emerald-600">{data.total.toLocaleString()}</span> conditions
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        )}

        {!isLoading && data?.results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No conditions found</p>
            <p className="text-sm mt-1">Try a different condition name</p>
          </div>
        )}

        {!isLoading && data?.results.map((cond, idx) => {
          const isConditionExpanded = expandedConditions.has(idx);
          return (
            <div key={idx} className="border border-border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
              {/* Header - Collapsible */}
              <button
                onClick={() => toggleCondition(idx)}
                className="w-full bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-emerald-950/50 dark:to-emerald-950/30 px-4 py-3.5 border-b border-border hover:from-emerald-100/50 dark:hover:from-emerald-950/70 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Activity className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div className="text-left min-w-0 flex-1">
                    <h3 className="font-bold text-foreground text-sm leading-tight">{cond.condition}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{cond.codes.length} codes • {cond.tradeNames.length} medications</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  {isConditionExpanded ? <ChevronDown className="h-4 w-4 text-emerald-600" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expandable Content */}
              {isConditionExpanded && (
                <div className="divide-y divide-border/50">
                  {/* Scientific Names */}
                  <div className="px-4 py-3.5 bg-muted/20">
                    <button
                      onClick={() => toggleSection(`sci-${idx}`)}
                      className="flex items-center gap-2 w-full text-left mb-2.5"
                    >
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                        Active Ingredients
                      </span>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        {cond.scientificNames.length}
                      </span>
                      <div className="flex-1" />
                      {expandedSections.has(`sci-${idx}`) ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    {expandedSections.has(`sci-${idx}`) && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {cond.scientificNames.map((name, nIdx) => (
                          <span key={nIdx} className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full font-medium border border-emerald-200/50 dark:border-emerald-800/50">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Trade Names */}
                  <div className="px-4 py-3.5 bg-muted/20">
                    <button
                      onClick={() => toggleSection(`trade-${idx}`)}
                      className="flex items-center gap-2 w-full text-left mb-2.5"
                    >
                      <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                        Trade Names
                      </span>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/50 text-xs font-bold text-sky-700 dark:text-sky-300">
                        {cond.tradeNames.length}
                      </span>
                      <div className="flex-1" />
                      {expandedSections.has(`trade-${idx}`) ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    {expandedSections.has(`trade-${idx}`) && (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {cond.tradeNames.map((name, nIdx) => (
                          <span key={nIdx} className="text-xs bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 px-3 py-1.5 rounded-full border border-sky-200/50 dark:border-sky-800/50">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ICD Codes */}
                  <div className="px-4 py-3.5">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
                      ICD-10 Codes ({cond.codes.length})
                    </p>
                    <div className="space-y-2">
                      {cond.codes.map((code, cIdx) => {
                        const key = `cond-${idx}-${cIdx}`;
                        const isExpanded = expandedCodes.has(key);
                        return (
                          <div key={cIdx}>
                            <button
                              onClick={() => code.branches.length > 0 && toggleCode(key)}
                              className={`w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-lg transition-colors ${
                                code.isNonCovered
                                  ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 hover:bg-red-100/50 dark:hover:bg-red-950/50"
                                  : "bg-muted/50 hover:bg-muted"
                              }`}
                            >
                              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                                code.isNonCovered
                                  ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                  : "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
                              }`}>
                                {code.code}
                              </span>
                              <span className="text-xs text-muted-foreground flex-1 truncate">{code.description}</span>
                              {code.isNonCovered && (
                                <span className="text-xs text-red-600 dark:text-red-400 font-medium flex-shrink-0">Non-Covered</span>
                              )}
                              {code.branches.length > 0 && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                                  <span>{code.branches.length}</span>
                                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                </span>
                              )}
                            </button>
                            {isExpanded && code.branches.length > 0 && (
                              <div className="ml-4 mt-1 space-y-1 border-l-2 border-emerald-200 dark:border-emerald-800 pl-3">
                                {code.branches.map((branch, bIdx) => (
                                  <div key={bIdx} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                                    branch.isNonCovered ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/30"
                                  }`}>
                                    <span className={`font-mono font-bold flex-shrink-0 ${
                                      branch.isNonCovered ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                                    }`}>
                                      {branch.branchCode}
                                    </span>
                                    <span className="text-muted-foreground flex-1">{branch.branchDescription}</span>
                                    {branch.isNonCovered && <span className="text-red-500 flex-shrink-0">✕</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Non-Covered Browse ────────────────────────────────────────────────────────

function NonCoveredBrowse() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const { data: allCodes, isLoading } = trpc.data.nonCoveredCodes.getAll.useQuery(undefined, {
    staleTime: 60000,
  });

  const { data: searchResults, isLoading: isSearching } = trpc.data.nonCoveredCodes.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0, staleTime: 30000 }
  );

  const displayCodes = debouncedQuery.length > 0 ? searchResults : allCodes;
  const loading = isLoading || isSearching;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search non-covered codes..."
            className="w-full pl-9 pr-4 py-3 text-base border border-border rounded-xl bg-muted/40 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        {displayCodes && (
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-semibold text-red-600">{displayCodes.length.toLocaleString()}</span> non-covered codes
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        )}

        {!loading && displayCodes?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No codes found</p>
          </div>
        )}

        {!loading && displayCodes && displayCodes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(displayCodes as Array<{ code: string; description?: string | null }>).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
              >
                <div className="flex-shrink-0 bg-red-500 rounded-lg px-2 py-1">
                  <span className="font-mono text-xs font-bold text-white">{item.code}</span>
                </div>
                <span className="text-xs text-red-700 dark:text-red-300 flex-1 leading-tight">
                  {item.description || "Non-covered code"}
                </span>
                <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Codes Browse ──────────────────────────────────────────────────────────────

function CodesBrowse() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedCodes, setExpandedCodes] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const { data: allCodes, isLoading: loadingAll } = trpc.data.codes.getAll.useQuery(
    { limit: 100 },
    { enabled: debouncedQuery.length === 0, staleTime: 60000 }
  );

  const { data: searchResults, isLoading: isSearching } = trpc.data.codes.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0, staleTime: 30000 }
  );

  const displayCodes = debouncedQuery.length > 0 ? searchResults : allCodes;
  const loading = loadingAll || isSearching;

  const toggleCode = (id: number) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search ICD-10 codes (e.g. E11, Diabetes...)"
            className="w-full pl-9 pr-4 py-3 text-base border border-border rounded-xl bg-muted/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        {displayCodes && (
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-semibold text-purple-600">{displayCodes.length.toLocaleString()}</span> codes
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}

        {!loading && displayCodes?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-medium">No codes found</p>
          </div>
        )}

        {!loading && displayCodes?.map((code: any, idx: number) => {
          const isExpanded = expandedCodes.has(code.id);
          return (
            <div key={idx} className={`border rounded-xl overflow-hidden ${
              code.isNonCovered ? "border-red-200 dark:border-red-800" : "border-border"
            }`}>
              <button
                onClick={() => code.branches?.length > 0 && toggleCode(code.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  code.isNonCovered
                    ? "bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50"
                    : "bg-card hover:bg-muted/50"
                }`}
              >
                <span className={`font-mono text-sm font-bold px-2 py-1 rounded flex-shrink-0 ${
                  code.isNonCovered
                    ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                    : "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                }`}>
                  {code.code}
                </span>
                <span className="text-sm text-foreground flex-1 text-left">{code.description}</span>
                {code.isNonCovered && (
                  <Badge variant="destructive" className="text-xs flex-shrink-0">Non-Covered</Badge>
                )}
                {code.branches?.length > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                    {code.branches.length}
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </span>
                )}
              </button>
              {isExpanded && code.branches?.length > 0 && (
                <div className="border-t border-border/50 bg-muted/20 divide-y divide-border/30">
                  {code.branches.map((branch: any, bIdx: number) => (
                    <div key={bIdx} className={`flex items-center gap-3 px-4 py-2 text-xs ${
                      branch.isNonCovered ? "bg-red-50/50 dark:bg-red-950/20" : ""
                    }`}>
                      <span className={`font-mono font-bold flex-shrink-0 ${
                        branch.isNonCovered ? "text-red-600 dark:text-red-400" : "text-purple-600 dark:text-purple-400"
                      }`}>
                        {branch.branchCode}
                      </span>
                      <span className="text-muted-foreground flex-1">{branch.branchDescription}</span>
                      {branch.isNonCovered && <span className="text-red-500 flex-shrink-0">Non-Covered</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Modal Config ──────────────────────────────────────────────────────────────

const MODAL_CONFIG = {
  drugs: {
    title: "Search Drugs",
    subtitle: "Search by trade name",
    iconBg: "bg-sky-500",
    icon: <Pill className="h-5 w-5 text-white" />,
    component: DrugBrowse,
  },
  conditions: {
    title: "Find Conditions",
    subtitle: "Search by medical condition",
    iconBg: "bg-emerald-500",
    icon: <Activity className="h-5 w-5 text-white" />,
    component: ConditionBrowse,
  },
  codes: {
    title: "Browse Codes",
    subtitle: "Search ICD-10 codes",
    iconBg: "bg-purple-500",
    icon: <Database className="h-5 w-5 text-white" />,
    component: CodesBrowse,
  },
  "non-covered": {
    title: "Non-Covered Codes",
    subtitle: "View non-covered codes",
    iconBg: "bg-red-500",
    icon: <AlertTriangle className="h-5 w-5 text-white" />,
    component: NonCoveredBrowse,
  },
};

// ─── Main Modal Component ──────────────────────────────────────────────────────

export default function BrowseModal({ isOpen, type, onClose }: BrowseModalProps) {
  const config = MODAL_CONFIG[type];
  const Component = config.component;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="w-full sm:w-full max-w-2xl h-[90vh] sm:h-[80vh] bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 sm:zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-background to-muted/30">
          <div>
            <h2 className="text-lg font-bold text-foreground">{config.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <Component />
      </div>
    </div>
  );
}

// Import Database icon
import { Database } from "lucide-react";
