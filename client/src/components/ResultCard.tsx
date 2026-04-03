import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BranchViewer } from "./BranchViewer";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart, Pill, AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { useState } from "react";

interface IcdCodeEntry {
  code: string;
  description: string;
  branchCount: number;
  isNonCovered: boolean;
  branches?: Array<{ branchCode: string; branchDescription: string }>;
}

interface ResultCardProps {
  data: any;
  treeData?: any; // kept for backward compatibility but not used
}

export function ResultCard({ data }: ResultCardProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Support both old format (array of strings) and new format (array of objects)
  const rawIcdCodes = Array.isArray(data.icdCodes) ? data.icdCodes : [];
  
  // Normalize to objects
  const icdCodeEntries: IcdCodeEntry[] = rawIcdCodes.map((entry: any) => {
    if (typeof entry === 'string') {
      return { code: entry, description: '', branchCount: 0, isNonCovered: false, branches: [] };
    }
    return entry as IcdCodeEntry;
  });

  // Determine overall coverage from API data or from individual codes
  const coverageStatus = data.coverageStatus ?? 'COVERED';
  const isCovered = coverageStatus !== 'NON-COVERED';
  const isPartial = coverageStatus === 'PARTIAL';

  // For favorites compatibility
  const codesString = icdCodeEntries.map(e => e.code).join(',');
  
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const tradeName = Array.isArray(data.tradeNames) ? data.tradeNames.slice(0, 3).join(', ') : '';
  const indication = Array.isArray(data.indications) ? data.indications.slice(0, 2).join('; ') : (data.indication ?? '');
  const favoriteId = `${data.scientificName}-${codesString}`;
  const isFav = isFavorite(favoriteId);
  
  const handleToggleFavorite = () => {
    if (isFav) {
      removeFavorite(favoriteId);
    } else {
      addFavorite({
        id: favoriteId,
        scientific_name: data.scientificName,
        trade_name: tradeName,
        indication: indication,
        icd10_codes: codesString,
        atc_codes: '',
        addedAt: Date.now()
      });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };
  
  const cardBorderClass = isCovered 
    ? 'border-sky-200 hover:border-sky-400 hover:shadow-2xl hover:shadow-sky-200/40' 
    : 'border-red-200 hover:border-red-400 hover:shadow-2xl hover:shadow-red-200/40';
    
  const headerBgClass = isCovered 
    ? 'bg-gradient-to-r from-sky-50 via-blue-50 to-cyan-50' 
    : 'bg-gradient-to-r from-red-50 via-rose-50 to-pink-50';
    
  const indicationClass = isCovered 
    ? 'text-sky-900 bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200' 
    : 'text-red-900 bg-gradient-to-r from-red-50 to-rose-50 border-red-200';
    
  const badgeClass = isCovered 
    ? 'text-sky-700 border-sky-300 bg-sky-50' 
    : 'text-red-700 border-red-300 bg-red-50';

  const getCoverageIcon = () => {
    if (coverageStatus === 'COVERED') {
      return <CheckCircle2 className="h-5 w-5 text-sky-600" />;
    } else if (coverageStatus === 'PARTIAL') {
      return <AlertCircle className="h-5 w-5 text-amber-600" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const getCoverageBadgeClass = () => {
    if (coverageStatus === 'COVERED') {
      return 'bg-gradient-to-r from-sky-100 to-blue-100 text-sky-700 border-sky-300 font-semibold';
    } else if (coverageStatus === 'PARTIAL') {
      return 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 border-amber-300 font-semibold';
    } else {
      return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-300 font-semibold';
    }
  };
  
  return (
    <Card className={`group overflow-hidden transition-all duration-500 border-2 ${cardBorderClass} hover:scale-[1.02]`}>
      <CardContent className="p-0">
        {/* Header Row with Trade Name / Scientific Name */}
        <div className={`px-6 py-5 border-b-2 border-slate-100 ${headerBgClass} relative overflow-hidden`}>
          {/* Decorative background element */}
          <div className="absolute -right-20 -top-20 w-40 h-40 bg-gradient-to-br from-sky-200/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/40 dark:to-blue-900/40 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <Pill className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5 letter-spacing-wider">Active Ingredient</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-all duration-300 truncate leading-tight">
                  {tradeName || data.scientificName}
                </h3>
                {tradeName && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic truncate mt-2 font-medium">
                    {data.scientificName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Badge className={`font-bold text-xs px-4 py-2 border-2 rounded-full transition-all duration-300 hover:scale-105 ${getCoverageBadgeClass()}`}>
                {coverageStatus === 'COVERED' ? '✓ Covered' : 
                 coverageStatus === 'PARTIAL' ? '◐ Partial' : '✕ Not Covered'}
              </Badge>
              <Button
                onClick={handleToggleFavorite}
                variant="ghost"
                size="sm"
                className={`flex-shrink-0 transition-all rounded-lg hover:scale-110 ${
                  isFav
                    ? 'text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30'
                    : 'text-slate-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'
                }`}
                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`h-6 w-6 transition-transform duration-300 ${isFav ? 'fill-current scale-110' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Indication Row */}
        {indication && (
          <div className="px-6 py-5 border-b-2 border-slate-100 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors duration-300">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Clinical Indication</h4>
            <div className={`text-sm font-medium leading-relaxed p-4 rounded-xl border-2 transition-all duration-300 ${indicationClass}`}>
              {indication}
            </div>
          </div>
        )}

        {/* Trade Names Row */}
        {tradeName && (
          <div className="px-6 py-5 border-b-2 border-slate-100 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors duration-300">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Trade Names</h4>
            <div className="flex flex-wrap gap-2.5">
              {Array.isArray(data.tradeNames) && data.tradeNames.map((name: string, idx: number) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 border-sky-300 text-xs font-bold px-4 py-2 rounded-full hover:shadow-md transition-all duration-300 hover:scale-105 cursor-default"
                >
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* ICD-10 Codes Row */}
        <div className="px-6 py-5 border-b-2 border-slate-100 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors duration-300">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">ICD-10 Codes</h4>
          <div className="flex flex-wrap gap-3">
            {icdCodeEntries.map((entry, index) => {
              const entryBadgeClass = entry.isNonCovered
                ? 'text-red-700 border-red-300 bg-red-50'
                : badgeClass;
              const isCodeCopied = copiedCode === entry.code;
              return (
                <div key={`${entry.code}-${index}`} className="flex items-center gap-2 group/code">
                  <div 
                    onClick={() => handleCopyCode(entry.code)}
                    className="relative cursor-pointer"
                    title="Click to copy code"
                  >
                    <Badge 
                      variant="outline" 
                      className={`font-mono font-bold text-sm px-4 py-2 rounded-lg border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${entryBadgeClass}`}
                    >
                      {entry.code}
                      {entry.isNonCovered && <span className="ml-2">⚠</span>}
                    </Badge>
                    {isCodeCopied && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        Copied!
                      </div>
                    )}
                  </div>
                  {entry.branches && entry.branches.length > 0 && (
                    <BranchViewer 
                      mainCode={entry.code}
                      mainDescription={entry.description}
                      branches={entry.branches.map(b => ({ code: b.branchCode, description: b.branchDescription }))}
                      isCovered={!entry.isNonCovered}
                    />
                  )}
                </div>
              );
            })}
            {icdCodeEntries.length === 0 && (
              <span className="text-sm text-slate-400 italic">No codes linked</span>
            )}
          </div>
        </div>

        {/* Coverage Status Row */}
        <div className={`px-6 py-5 bg-gradient-to-r ${isCovered ? 'from-sky-50 to-blue-50' : 'from-red-50 to-rose-50'} flex items-center justify-between hover:shadow-inner transition-all duration-300`}>
          <div className="flex items-center gap-3">
            {getCoverageIcon()}
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Coverage Status</h4>
          </div>
          <Badge className={`text-sm font-bold px-5 py-2.5 border-2 rounded-full transition-all duration-300 hover:scale-105 ${getCoverageBadgeClass()}`}>
            {coverageStatus === 'COVERED' ? 'COVERED' : 
             coverageStatus === 'PARTIAL' ? 'PARTIAL' : 'NOT COVERED'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
