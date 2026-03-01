import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { X, Search, ChevronDown, ChevronRight, Pill, Activity, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

        {!isLoading && data?.results.map((drug, idx) => (
          <div key={idx} className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="bg-sky-50 dark:bg-sky-950/50 px-4 py-3 border-b border-border">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Pill className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-foreground text-sm">{drug.tradeName}</h3>
                  <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-0.5">
                    Scientific: {drug.scientificName}
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border/50">
              {drug.indications.map((ind, iIdx) => (
                <div key={iIdx} className="px-4 py-3">
                  <p className="text-sm font-semibold text-foreground mb-2">{ind.indication}</p>
                  <div className="space-y-1.5">
                    {ind.codes.map((code, cIdx) => {
                      const key = `${idx}-${iIdx}-${cIdx}`;
                      const isExpanded = expandedCodes.has(key);
                      return (
                        <div key={cIdx}>
                          <button
                            onClick={() => code.branches.length > 0 && toggleCode(key)}
                            className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg transition-colors ${
                              code.isNonCovered
                                ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                                : "bg-muted/50 hover:bg-muted"
                            }`}
                          >
                            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                              code.isNonCovered
                                ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                : "bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300"
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
                            <div className="ml-4 mt-1 space-y-1 border-l-2 border-sky-200 dark:border-sky-800 pl-3">
                              {code.branches.map((branch, bIdx) => (
                                <div key={bIdx} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                                  branch.isNonCovered ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/30"
                                }`}>
                                  <span className={`font-mono font-bold flex-shrink-0 ${
                                    branch.isNonCovered ? "text-red-600 dark:text-red-400" : "text-sky-600 dark:text-sky-400"
                                  }`}>
                                    {branch.branchCode}
                                  </span>
                                  <span className="text-muted-foreground flex-1">{branch.branchDescription}</span>
                                  {branch.isNonCovered && (
                                    <span className="text-red-500 text-xs flex-shrink-0">✕</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {ind.codes.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No codes linked</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

        {!isLoading && data?.results.map((cond, idx) => (
          <div key={idx} className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 border-b border-border">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <h3 className="font-bold text-foreground text-sm flex-1">{cond.condition}</h3>
              </div>
            </div>

            {/* Scientific Names */}
            <div className="px-4 py-3 border-b border-border/50">
              <button
                onClick={() => toggleSection(`sci-${idx}`)}
                className="flex items-center gap-2 w-full text-left"
              >
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Scientific Names ({cond.scientificNames.length})
                </span>
                {expandedSections.has(`sci-${idx}`) ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </button>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(expandedSections.has(`sci-${idx}`) ? cond.scientificNames : cond.scientificNames.slice(0, 3)).map((name, nIdx) => (
                  <span key={nIdx} className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-lg font-medium">
                    {name}
                  </span>
                ))}
                {!expandedSections.has(`sci-${idx}`) && cond.scientificNames.length > 3 && (
                  <span className="text-xs text-muted-foreground px-2 py-1">+{cond.scientificNames.length - 3} more</span>
                )}
              </div>
            </div>

            {/* Trade Names */}
            <div className="px-4 py-3 border-b border-border/50">
              <button
                onClick={() => toggleSection(`trade-${idx}`)}
                className="flex items-center gap-2 w-full text-left"
              >
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Related Trade Names ({cond.tradeNames.length})
                </span>
                {expandedSections.has(`trade-${idx}`) ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </button>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(expandedSections.has(`trade-${idx}`) ? cond.tradeNames : cond.tradeNames.slice(0, 3)).map((name, nIdx) => (
                  <span key={nIdx} className="text-xs bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 px-2 py-1 rounded-lg">
                    {name}
                  </span>
                ))}
                {!expandedSections.has(`trade-${idx}`) && cond.tradeNames.length > 3 && (
                  <span className="text-xs text-muted-foreground px-2 py-1">+{cond.tradeNames.length - 3} more</span>
                )}
              </div>
            </div>

            {/* ICD Codes */}
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                ICD-10 Codes ({cond.codes.length})
              </p>
              <div className="space-y-1.5">
                {cond.codes.map((code, cIdx) => {
                  const key = `cond-${idx}-${cIdx}`;
                  const isExpanded = expandedCodes.has(key);
                  return (
                    <div key={cIdx}>
                      <button
                        onClick={() => code.branches.length > 0 && toggleCode(key)}
                        className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg transition-colors ${
                          code.isNonCovered
                            ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
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
        ))}
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
    subtitle: "All ICD-10 AM codes",
    iconBg: "bg-purple-500",
    icon: <Search className="h-5 w-5 text-white" />,
    component: CodesBrowse,
  },
  "non-covered": {
    title: "Non-Covered Codes",
    subtitle: "Codes not covered by insurance",
    iconBg: "bg-red-500",
    icon: <AlertTriangle className="h-5 w-5 text-white" />,
    component: NonCoveredBrowse,
  },
};

// ─── Main Modal ────────────────────────────────────────────────────────────────

export default function BrowseModal({ isOpen, type, onClose }: BrowseModalProps) {
  const config = MODAL_CONFIG[type];
  const ContentComponent = config.component;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-2xl sm:mx-4 bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ height: "90dvh", maxHeight: "90dvh" }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <div className={`w-9 h-9 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground text-base leading-tight">{config.title}</h2>
            <p className="text-xs text-muted-foreground">{config.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <ContentComponent />
        </div>
      </div>
    </div>
  );
}
