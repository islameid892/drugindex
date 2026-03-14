import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Copy,
  Check,
  Pill,
  Tag,
  Stethoscope,
  ChevronRight,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   Coverage config
───────────────────────────────────────────── */
const COVERAGE_CONFIG = {
  COVERED: {
    icon: ShieldCheck,
    label: "Covered",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50",
    headerBg: "from-emerald-50/60 via-sky-50/30 to-transparent dark:from-emerald-950/20 dark:via-sky-950/10 dark:to-transparent",
    dot: "bg-emerald-500",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  "NON-COVERED": {
    icon: ShieldX,
    label: "Non-Covered",
    pill: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50",
    headerBg: "from-red-50/50 via-orange-50/20 to-transparent dark:from-red-950/20 dark:via-orange-950/10 dark:to-transparent",
    dot: "bg-red-500",
    iconColor: "text-red-600 dark:text-red-400",
  },
  PARTIAL: {
    icon: ShieldAlert,
    label: "Partial",
    pill: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50",
    headerBg: "from-amber-50/50 via-yellow-50/20 to-transparent dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-transparent",
    dot: "bg-amber-500",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
} as const;

/* ─────────────────────────────────────────────
   Coverage pill badge
───────────────────────────────────────────── */
function CoveragePill({ status }: { status: keyof typeof COVERAGE_CONFIG }) {
  const cfg = COVERAGE_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border flex-shrink-0 ${cfg.pill}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Copy button
───────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      title="Copy code"
      className="p-1 rounded-md hover:bg-muted transition-colors opacity-0 group-hover/code:opacity-70 hover:!opacity-100 flex-shrink-0"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground" />
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────
   ICD-10 Code row (with optional branches)
───────────────────────────────────────────── */
function CodeRow({ code }: { code: CodeInfo }) {
  const [open, setOpen] = useState(false);
  const hasBranches = code.branches.length > 0;

  return (
    <div className="rounded-lg overflow-hidden border border-border/40 group/code">
      {/* Main code row */}
      <button
        onClick={() => hasBranches && setOpen(!open)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
          hasBranches ? "hover:bg-muted/60 cursor-pointer" : "cursor-default"
        } ${code.isNonCovered ? "bg-red-50/50 dark:bg-red-950/20" : "bg-muted/20"}`}
      >
        {/* Code badge */}
        <span
          className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-md flex-shrink-0 tracking-wide ${
            code.isNonCovered
              ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
              : "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
          }`}
        >
          {code.code}
        </span>
        <CopyBtn text={code.code} />
        <span className="text-xs text-foreground/70 flex-1 text-left leading-tight line-clamp-2">
          {code.description}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
          {code.isNonCovered && (
            <span className="hidden sm:inline text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-md">
              Non-Covered
            </span>
          )}
          {hasBranches && (
            <div className="flex items-center gap-0.5 text-muted-foreground">
              <span className="text-[10px] font-medium">{code.branchCount}</span>
              {open ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </div>
          )}
        </div>
      </button>

      {/* Branches */}
      {open && (
        <div className="divide-y divide-border/20 border-t border-border/30 bg-background/50">
          {code.branches.map((b, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-4 py-2 text-xs group/branch ${
                b.isNonCovered ? "bg-red-50/30 dark:bg-red-950/10" : ""
              }`}
            >
              <ChevronRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
              <span
                className={`font-mono font-semibold text-[11px] flex-shrink-0 ${
                  b.isNonCovered
                    ? "text-red-600 dark:text-red-400"
                    : "text-sky-600 dark:text-sky-400"
                }`}
              >
                {b.branchCode}
              </span>
              <CopyBtn text={b.branchCode} />
              <span className="text-muted-foreground leading-tight flex-1 line-clamp-2">
                {b.branchDescription}
              </span>
              {b.isNonCovered && (
                <span className="ml-auto text-red-500 text-[10px] font-bold flex-shrink-0">✗</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Indication accordion row
───────────────────────────────────────────── */
function IndicationRow({ indication }: { indication: IndicationGroup }) {
  const [open, setOpen] = useState(false);
  const cfg = COVERAGE_CONFIG[indication.coverageStatus];

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-200 ${
      open ? "border-border/60 shadow-sm" : "border-border/30"
    }`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
          open ? "bg-muted/40" : "bg-muted/15 hover:bg-muted/30"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className="text-sm font-semibold text-foreground leading-tight line-clamp-2 text-left">
            {indication.indication}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CoveragePill status={indication.coverageStatus} />
          <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-[11px] font-medium tabular-nums hidden sm:inline">
              {indication.codes.length} code{indication.codes.length !== 1 ? "s" : ""}
            </span>
            <span className="text-[11px] font-medium tabular-nums sm:hidden">
              {indication.codes.length}
            </span>
            {open ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-2 bg-background/50 border-t border-border/20">
          {indication.codes.length > 0 ? (
            indication.codes.map((code, i) => (
              <CodeRow key={i} code={code} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground italic py-1">
              No ICD-10 codes linked
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section header (Trade Names / Diagnoses)
───────────────────────────────────────────── */
function SectionHeader({
  icon: Icon,
  label,
  count,
  countColor,
  isOpen,
  onToggle,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  countColor: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-2 group/hdr"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${countColor}`}>
          {count}
        </span>
      </div>
      {isOpen ? (
        <ChevronUp className="h-4 w-4 text-muted-foreground group-hover/hdr:text-foreground transition-colors" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground group-hover/hdr:text-foreground transition-colors" />
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────
   Main Card
───────────────────────────────────────────── */
export function SearchResultCard({ data }: SearchResultCardProps) {
  const [tradeOpen, setTradeOpen] = useState(false);
  const [indicationsOpen, setIndicationsOpen] = useState(false);

  const cfg = COVERAGE_CONFIG[data.overallCoverage];
  const MAX_TRADE = 3;
  const visibleTrade = tradeOpen ? data.tradeNames : data.tradeNames.slice(0, MAX_TRADE);
  const hiddenTradeCount = data.tradeNames.length - MAX_TRADE;

  const MAX_PREVIEW = 3;
  const previewIndications = data.indications.slice(0, MAX_PREVIEW);

  return (
    <div className="group/card bg-card border border-border/60 rounded-2xl shadow-sm hover:shadow-md hover:border-border transition-all duration-200 overflow-hidden flex flex-col">

      {/* ── HEADER ── */}
      <div className={`px-4 sm:px-5 pt-4 sm:pt-5 pb-4 border-b border-border/30 bg-gradient-to-br ${cfg.headerBg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Drug icon */}
            <div className={`mt-0.5 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center flex-shrink-0 shadow-sm`}>
              <Pill className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-extrabold text-foreground leading-tight tracking-tight break-words">
                {data.scientificName}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold uppercase tracking-widest">
                Active Ingredient
              </p>
            </div>
          </div>
          <CoveragePill status={data.overallCoverage} />
        </div>
      </div>

      {/* ── TRADE NAMES ── */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-border/30">
        <div className="mb-2.5">
          <SectionHeader
            icon={Tag}
            label="Trade Names"
            count={data.totalTradeNames}
            countColor="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
            isOpen={tradeOpen}
            onToggle={() => setTradeOpen(!tradeOpen)}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {visibleTrade.map((name, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-800 dark:text-sky-200 text-xs font-medium border border-sky-200/70 dark:border-sky-700/40 leading-tight"
            >
              {name}
            </span>
          ))}
          {!tradeOpen && hiddenTradeCount > 0 && (
            <button
              onClick={() => setTradeOpen(true)}
              className="inline-flex items-center px-2.5 py-1 rounded-lg bg-muted/60 text-muted-foreground text-xs font-semibold border border-border/50 hover:bg-muted hover:text-foreground transition-colors"
            >
              +{hiddenTradeCount} more
            </button>
          )}
        </div>
      </div>

      {/* ── DIAGNOSES & ICD-10 CODES ── */}
      <div className="px-4 sm:px-5 py-3.5 flex-1">
        <div className="mb-2.5">
          <SectionHeader
            icon={Stethoscope}
            label="Diagnoses & ICD-10 Codes"
            count={data.indications.length}
            countColor="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            isOpen={indicationsOpen}
            onToggle={() => setIndicationsOpen(!indicationsOpen)}
          />
        </div>

        {/* Expanded: full accordion */}
        {indicationsOpen ? (
          <div className="space-y-2">
            {data.indications.map((ind, i) => (
              <IndicationRow key={i} indication={ind} />
            ))}
          </div>
        ) : (
          /* Collapsed: preview chips */
          <div className="flex flex-wrap gap-1.5">
            {previewIndications.map((ind, i) => {
              const icfg = COVERAGE_CONFIG[ind.coverageStatus];
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 text-muted-foreground text-xs font-medium border border-border/40 max-w-full"
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${icfg.dot}`} />
                  <span className="truncate max-w-[180px] sm:max-w-[220px]">{ind.indication}</span>
                </span>
              );
            })}
            {data.indications.length > MAX_PREVIEW && (
              <button
                onClick={() => setIndicationsOpen(true)}
                className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors border border-transparent hover:border-sky-200/60 dark:hover:border-sky-700/40"
              >
                +{data.indications.length - MAX_PREVIEW} more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
