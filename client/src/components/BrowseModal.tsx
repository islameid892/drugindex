"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { X, Search, ChevronDown, ChevronRight, Pill, Activity, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

type BrowseType = "drugs" | "conditions" | "codes" | "non-covered";

interface BrowseModalProps {
  isOpen: boolean;
  type: BrowseType;
  onClose?: () => void;
}

let onClose: (() => void) | undefined;

// ─── Drug Browse ───────────────────────────────────────────────────────────────

function DrugBrowse() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("A");
  const [expandedDrugs, setExpandedDrugs] = useState<Set<number>>(new Set());
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

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

  const toggleDrug = (idx: number) => {
    setExpandedDrugs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleCode = (key: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleViewAllDrugs = (scientificName: string) => {
    onClose?.();
    // Navigate to a new page showing all drugs with this scientific name
    setLocation(`/browse-scientific-name?name=${encodeURIComponent(scientificName)}`);
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

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
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
          const isExpanded = expandedDrugs.has(idx);
          return (
            <div key={idx} className="border border-border rounded-lg overflow-hidden bg-card hover:border-sky-300 transition-colors">
              {/* Collapsed Header - Always Visible */}
              <button
                onClick={() => toggleDrug(idx)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Pill className="h-5 w-5 text-sky-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-bold text-sm text-foreground truncate">{drug.tradeName}</p>
                    <p className="text-xs text-sky-600 dark:text-sky-400 truncate">{drug.scientificName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewAllDrugs(drug.scientificName);
                    }}
                    className="p-1.5 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-lg transition-colors"
                    title={`View all drugs with ${drug.scientificName}`}
                  >
                    <ExternalLink className="h-4 w-4 text-sky-600" />
                  </button>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-border bg-muted/30 divide-y divide-border/50">
                  {drug.indications.map((ind, iIdx) => (
                    <div key={iIdx} className="px-4 py-3">
                      <p className="text-sm font-semibold text-foreground mb-2">{ind.indication}</p>
                      <div className="space-y-1.5">
                        {ind.codes.map((code, cIdx) => {
                          const key = `${idx}-${iIdx}-${cIdx}`;
                          const isCodeExpanded = expandedCodes.has(key);
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
                                    {isCodeExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  </span>
                                )}
                              </button>
                              {isCodeExpanded && code.branches.length > 0 && (
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
            placeholder="Search by condition (e.g. Diabetes, Hypertension...)"
            className="w-full pl-9 pr-4 py-3 text-base border border-border rounded-xl bg-muted/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        {data && (
          <p className="text-xs text-muted-foreground mt-2">
            Found <span className="font-semibold text-emerald-600">{data.total.toLocaleString()}</span> results
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

        {!isLoading && data?.results.map((condition, idx) => (
          <div key={idx} className="border border-border rounded-xl overflow-hidden bg-card">
            <div className="bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 border-b border-border">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-foreground text-sm">{condition.condition}</h3>
                </div>
              </div>
            </div>

            <div className="divide-y divide-border/50">
              {condition.scientificNames && condition.scientificNames.length > 0 && (
                <div className="px-4 py-3">
                  <button
                    onClick={() => toggleSection(`sci-${idx}`)}
                    className="flex items-center gap-2 w-full text-left mb-2"
                  >
                    <span className="text-xs font-semibold text-foreground">Scientific Names</span>
                    {expandedSections.has(`sci-${idx}`) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                  {expandedSections.has(`sci-${idx}`) && (
                    <div className="space-y-1 ml-4">
                      {condition.scientificNames.map((name, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{name}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {condition.tradeNames && condition.tradeNames.length > 0 && (
                <div className="px-4 py-3">
                  <button
                    onClick={() => toggleSection(`trade-${idx}`)}
                    className="flex items-center gap-2 w-full text-left mb-2"
                  >
                    <span className="text-xs font-semibold text-foreground">Trade Names</span>
                    {expandedSections.has(`trade-${idx}`) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </button>
                  {expandedSections.has(`trade-${idx}`) && (
                    <div className="space-y-1 ml-4">
                      {condition.tradeNames.map((name, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{name}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {condition.codes && condition.codes.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-foreground mb-2">ICD-10 Codes</p>
                  <div className="space-y-1.5">
                    {condition.codes.map((code, cIdx) => {
                      const key = `${idx}-${cIdx}`;
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
                              {code.branches?.map((branch: any, bIdx: number) => (                                <div key={bIdx} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
                                  branch.isNonCovered ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/30"
                                }`}>
                                  <span className={`font-mono font-bold flex-shrink-0 ${
                                    branch.isNonCovered ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
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
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Code Browse ──────────────────────────────────────────────────────────────

function CodeBrowse() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("A");
  const [expandedCodes, setExpandedCodes] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query || "A"), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const { data, isLoading } = trpc.data.browseCodes.useQuery(
    { query: debouncedQuery, limit: 20 },
    { staleTime: 30000 }
  );

  const toggleCode = (idx: number) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
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
            placeholder="Search by code (e.g. E11, J01, M19...)"
            className="w-full pl-9 pr-4 py-3 text-base border border-border rounded-xl bg-muted/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        {data && (
          <p className="text-xs text-muted-foreground mt-2">
            Found <span className="font-semibold text-purple-600">{data.total.toLocaleString()}</span> results
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}

        {!isLoading && data?.results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No codes found</p>
            <p className="text-sm mt-1">Try a different code</p>
          </div>
        )}

        {!isLoading && data?.results.map((code: any, idx: number) => {
          const isExpanded = expandedCodes.has(idx);
          return (
            <button
              key={idx}
              onClick={() => toggleCode(idx)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                code.isNonCovered
                  ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/50"
                  : "bg-muted/50 border-border hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-mono text-sm font-bold px-3 py-1 rounded flex-shrink-0 ${
                  code.isNonCovered
                    ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                    : "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                }`}>
                  {code.code}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{code.description}</p>
                  {code.isNonCovered && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">Non-Covered</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <span>{code.branchCount}</span>
                  {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
              </div>

              {isExpanded && code.branchCount > 0 && (
                <div className="mt-3 ml-4 space-y-1 border-l-2 border-purple-200 dark:border-purple-800 pl-3">
                  {code.branches?.map((branch: any, bIdx: number) => (
                    <div key={bIdx} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${
                      branch.isNonCovered ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/30"
                    }`}>
                      <span className={`font-mono font-bold flex-shrink-0 ${
                        branch.isNonCovered ? "text-red-600 dark:text-red-400" : "text-purple-600 dark:text-purple-400"
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
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Non-Covered Browse ───────────────────────────────────────────────────────

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

  const { data, isLoading } = trpc.data.browseNonCovered.useQuery(
    { query: debouncedQuery, limit: 50 },
    { staleTime: 30000 }
  );

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
        {data && (
          <p className="text-xs text-muted-foreground mt-2">
            Found <span className="font-semibold text-red-600">{data.total.toLocaleString()}</span> non-covered codes
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          </div>
        )}

        {!isLoading && data?.results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No non-covered codes found</p>
            <p className="text-sm mt-1">Try a different search</p>
          </div>
        )}

        {!isLoading && data?.results.map((code: any, idx: number) => (
          <div
            key={idx}
            className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-700"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold px-3 py-1 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 flex-shrink-0">
                {code.code}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">{code.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

export default function BrowseModal({ isOpen, type, onClose }: BrowseModalProps) {
  if (!isOpen) return null;

  const getTitle = () => {
    switch (type) {
      case "drugs": return "Search Drugs";
      case "conditions": return "Find Conditions";
      case "codes": return "Browse Codes";
      case "non-covered": return "Non-Covered Codes";
    }
  };

  const getContent = () => {
    switch (type) {
      case "drugs": return <DrugBrowse />;
      case "conditions": return <ConditionBrowse />;
      case "codes": return <CodeBrowse />;
      case "non-covered": return <NonCoveredBrowse />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:w-full sm:max-w-2xl h-[90vh] sm:h-[85vh] bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
          <h2 className="text-lg font-bold text-foreground">{getTitle()}</h2>
          <button
            onClick={() => onClose?.()}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {getContent()}
        </div>
      </div>
    </div>
  );
}
