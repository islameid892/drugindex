import { useState } from "react";
import { ChevronDown, ChevronUp, ShieldCheck, ShieldX, ShieldAlert, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BranchInfo {
  branchCode: string;
  branchDescription: string;
  isNonCovered: boolean;
}

interface CodeInfo {
  id: number;
  code: string;
  description: string;
  branchCount: number;
  isNonCovered: boolean;
  branches: BranchInfo[];
}

interface IndicationGroup {
  indication: string;
  codes: CodeInfo[];
  coverageStatus: "COVERED" | "NON-COVERED" | "PARTIAL";
}

interface GroupedDrugResult {
  scientificName: string;
  tradeNames: string[];
  indications: IndicationGroup[];
  overallCoverage: "COVERED" | "NON-COVERED" | "PARTIAL";
  totalTradeNames: number;
}

interface SearchResultCardProps {
  data: GroupedDrugResult;
}

function CoverageIcon({ status }: { status: "COVERED" | "NON-COVERED" | "PARTIAL" }) {
  if (status === "COVERED") return <ShieldCheck className="h-4 w-4 text-emerald-500" />;
  if (status === "NON-COVERED") return <ShieldX className="h-4 w-4 text-red-500" />;
  return <ShieldAlert className="h-4 w-4 text-amber-500" />;
}

function CoverageBadge({ status }: { status: "COVERED" | "NON-COVERED" | "PARTIAL" }) {
  const styles = {
    "COVERED": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
    "NON-COVERED": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700",
    "PARTIAL": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}>
      <CoverageIcon status={status} />
      {status}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-1 p-0.5 rounded hover:bg-muted transition-colors opacity-60 hover:opacity-100"
      title="Copy code"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function CodeBlock({ code }: { code: CodeInfo }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/70 transition-colors text-left gap-2"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`font-mono font-bold text-sm flex-shrink-0 px-2 py-0.5 rounded ${
            code.isNonCovered
              ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
              : "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
          }`}>
            {code.code}
          </span>
          <CopyButton text={code.code} />
          <span className="text-xs text-muted-foreground truncate">{code.description}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {code.isNonCovered && (
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">Non-Covered</span>
          )}
          {code.branchCount > 0 && (
            <span className="text-xs text-muted-foreground">{code.branchCount} branches</span>
          )}
          {code.branches.length > 0 && (
            expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && code.branches.length > 0 && (
        <div className="divide-y divide-border/40">
          {code.branches.map((branch, i) => (
            <div key={i} className={`flex items-center gap-2 px-4 py-1.5 text-xs ${
              branch.isNonCovered ? "bg-red-50/50 dark:bg-red-950/20" : "bg-background"
            }`}>
              <span className={`font-mono font-semibold flex-shrink-0 ${
                branch.isNonCovered ? "text-red-600 dark:text-red-400" : "text-sky-600 dark:text-sky-400"
              }`}>
                {branch.branchCode}
              </span>
              <CopyButton text={branch.branchCode} />
              <span className="text-muted-foreground truncate">{branch.branchDescription}</span>
              {branch.isNonCovered && (
                <span className="ml-auto text-red-500 font-medium flex-shrink-0">✗</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IndicationSection({ indication }: { indication: IndicationGroup }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left gap-3"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-semibold text-foreground truncate">{indication.indication}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CoverageBadge status={indication.coverageStatus} />
          <span className="text-xs text-muted-foreground">{indication.codes.length} code{indication.codes.length !== 1 ? "s" : ""}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 py-3 space-y-2 bg-background/50">
          {indication.codes.length > 0 ? (
            indication.codes.map((code, i) => (
              <CodeBlock key={i} code={code} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground italic">No ICD-10 codes linked</p>
          )}
        </div>
      )}
    </div>
  );
}

export function SearchResultCard({ data }: SearchResultCardProps) {
  const [tradeNamesExpanded, setTradeNamesExpanded] = useState(false);
  const [indicationsExpanded, setIndicationsExpanded] = useState(false);

  const visibleTradeNames = tradeNamesExpanded ? data.tradeNames : data.tradeNames.slice(0, 4);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Card Header: Scientific Name + Coverage */}
      <div className="px-5 py-4 border-b border-border/50 bg-gradient-to-r from-sky-50/50 to-background dark:from-sky-950/20 dark:to-background">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-foreground leading-tight">{data.scientificName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Scientific Name (Active Ingredient)</p>
          </div>
          <CoverageBadge status={data.overallCoverage} />
        </div>
      </div>

      {/* Trade Names Section */}
      <div className="px-5 py-3 border-b border-border/40">
        <button
          onClick={() => setTradeNamesExpanded(!tradeNamesExpanded)}
          className="w-full flex items-center justify-between gap-2 text-left group"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trade Names</span>
            <Badge variant="secondary" className="text-xs">{data.totalTradeNames}</Badge>
          </div>
          {tradeNamesExpanded
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          }
        </button>
        <div className="mt-3 flex flex-wrap gap-2">
          {visibleTradeNames.map((name, i) => (
            <span key={i} className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-sky-100/80 to-blue-100/60 dark:from-sky-900/40 dark:to-blue-900/30 text-sky-800 dark:text-sky-200 text-xs rounded-full border border-sky-300/60 dark:border-sky-700/50 font-semibold shadow-sm hover:shadow-md transition-all hover:border-sky-400/80 dark:hover:border-sky-600/70">
              {name}
            </span>
          ))}
          {!tradeNamesExpanded && data.tradeNames.length > 4 && (
            <button
              onClick={() => setTradeNamesExpanded(true)}
              className="inline-flex items-center px-3 py-1.5 bg-muted/70 dark:bg-muted/40 text-muted-foreground text-xs rounded-full border border-border hover:bg-muted/90 dark:hover:bg-muted/60 transition-all font-semibold"
            >
              +{data.tradeNames.length - 4} more
            </button>
          )}
        </div>
      </div>

      {/* Indications + Codes Section */}
      <div className="px-5 py-3">
        <button
          onClick={() => setIndicationsExpanded(!indicationsExpanded)}
          className="w-full flex items-center justify-between gap-2 text-left group mb-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diagnoses & Codes</span>
            <Badge variant="secondary" className="text-xs">{data.indications.length}</Badge>
          </div>
          {indicationsExpanded
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          }
        </button>
        {indicationsExpanded && (
          <div className="space-y-2">
            {data.indications.map((ind, i) => (
              <IndicationSection key={i} indication={ind} />
            ))}
          </div>
        )}
        {!indicationsExpanded && (
          <div className="flex flex-wrap gap-1.5">
            {data.indications.slice(0, 3).map((ind, i) => (
              <span key={i} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md truncate max-w-[180px]">
                {ind.indication}
              </span>
            ))}
            {data.indications.length > 3 && (
              <button
                onClick={() => setIndicationsExpanded(true)}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
              >
                +{data.indications.length - 3} more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
