import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BranchViewer } from "./BranchViewer";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart, Pill, AlertCircle, CheckCircle2, Copy, ChevronDown, ChevronUp } from "lucide-react";
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
  treeData?: any;
}

export function ResultCard({ data }: ResultCardProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    tradeNames: true,
    indications: true,
    codes: true
  });

  const rawIcdCodes = Array.isArray(data.icdCodes) ? data.icdCodes : [];
  
  const icdCodeEntries: IcdCodeEntry[] = rawIcdCodes.map((entry: any) => {
    if (typeof entry === 'string') {
      return { code: entry, description: '', branchCount: 0, isNonCovered: false, branches: [] };
    }
    return entry as IcdCodeEntry;
  });

  const coverageStatus = data.coverageStatus ?? 'COVERED';
  const isCovered = coverageStatus !== 'NON-COVERED';

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

  const toggleSection = (section: 'tradeNames' | 'indications' | 'codes') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const cardBorderClass = isCovered 
    ? 'border-sky-200 hover:border-sky-400' 
    : 'border-red-200 hover:border-red-400';
    
  const headerBgClass = isCovered 
    ? 'bg-gradient-to-r from-sky-50 via-blue-50 to-cyan-50 dark:from-sky-950/30 dark:via-blue-950/30 dark:to-cyan-950/30' 
    : 'bg-gradient-to-r from-red-50 via-rose-50 to-pink-50 dark:from-red-950/30 dark:via-rose-950/30 dark:to-pink-950/30';
    
  const getCoverageBadgeClass = () => {
    if (coverageStatus === 'COVERED') {
      return 'bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-900/50 dark:to-blue-900/50 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700 font-semibold';
    } else if (coverageStatus === 'PARTIAL') {
      return 'bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-semibold';
    } else {
      return 'bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/50 dark:to-rose-900/50 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 font-semibold';
    }
  };

  const getCoverageIcon = () => {
    if (coverageStatus === 'COVERED') {
      return <CheckCircle2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />;
    } else if (coverageStatus === 'PARTIAL') {
      return <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
    } else {
      return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    }
  };
  
  return (
    <Card className={`group overflow-hidden transition-all duration-300 border-2 ${cardBorderClass} hover:shadow-lg`}>
      <CardContent className="p-0">
        {/* Header Section */}
        <div className={`px-4 sm:px-6 py-4 sm:py-5 border-b-2 border-slate-100 dark:border-slate-800 ${headerBgClass}`}>
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            {/* Left: Icon + Drug Name */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/40 dark:to-blue-900/40 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                  <Pill className="h-5 w-5 sm:h-6 sm:w-6 text-sky-600 dark:text-sky-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">Active Ingredient</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-all duration-300 truncate leading-tight">
                  {tradeName || data.scientificName}
                </h3>
                {tradeName && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 italic truncate mt-1 font-medium">
                    {data.scientificName}
                  </p>
                )}
              </div>
            </div>
            
            {/* Right: Badge + Favorite Button */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 border-2 rounded-full transition-all duration-300 whitespace-nowrap ${getCoverageBadgeClass()}`}>
                {coverageStatus === 'COVERED' ? '✓ Covered' : 
                 coverageStatus === 'PARTIAL' ? '◐ Partial' : '✕ Not Covered'}
              </Badge>
              <Button
                onClick={handleToggleFavorite}
                variant="ghost"
                size="sm"
                className={`flex-shrink-0 transition-all rounded-lg hover:scale-110 p-1.5 sm:p-2 ${
                  isFav
                    ? 'text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30'
                    : 'text-slate-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'
                }`}
                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 ${isFav ? 'fill-current scale-110' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Trade Names Section */}
        {tradeName && (
          <div className="border-b-2 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors duration-300">
            <button
              onClick={() => toggleSection('tradeNames')}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <Pill className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 dark:text-slate-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Trade Names</h4>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">{Array.isArray(data.tradeNames) ? data.tradeNames.length : 0}</Badge>
              </div>
              {expandedSections.tradeNames ? (
                <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              )}
            </button>
            
            {expandedSections.tradeNames && (
              <div className="px-4 sm:px-6 pb-3 sm:pb-4 flex flex-wrap gap-2">
                {Array.isArray(data.tradeNames) && data.tradeNames.map((name: string, idx: number) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700 text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full hover:shadow-md transition-all duration-300 hover:scale-105 cursor-default"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clinical Indication Section */}
        {indication && (
          <div className="border-b-2 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors duration-300">
            <button
              onClick={() => toggleSection('indications')}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 dark:text-slate-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Clinical Indication</h4>
              </div>
              {expandedSections.indications ? (
                <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              )}
            </button>
            
            {expandedSections.indications && (
              <div className="px-4 sm:px-6 pb-3 sm:pb-4">
                <div className="text-xs sm:text-sm font-medium leading-relaxed p-3 sm:p-4 rounded-xl border-2 border-sky-200 dark:border-sky-800 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 text-slate-700 dark:text-slate-300">
                  {indication}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ICD-10 Codes Section */}
        <div className="border-b-2 border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors duration-300">
          <button
            onClick={() => toggleSection('codes')}
            className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <Copy className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 dark:text-slate-400" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">ICD-10 Codes</h4>
              <Badge variant="secondary" className="text-xs px-2 py-0.5">{icdCodeEntries.length}</Badge>
            </div>
            {expandedSections.codes ? (
              <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
            )}
          </button>

          {expandedSections.codes && (
            <div className="px-4 sm:px-6 pb-3 sm:pb-4 flex flex-wrap gap-2">
              {icdCodeEntries.map((entry, index) => {
                const entryBadgeClass = entry.isNonCovered
                  ? 'text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'
                  : 'text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/30';
                const isCodeCopied = copiedCode === entry.code;
                return (
                  <div key={`${entry.code}-${index}`} className="flex items-center gap-2 group/code relative">
                    <div 
                      onClick={() => handleCopyCode(entry.code)}
                      className="relative cursor-pointer"
                      title="Click to copy code"
                    >
                      <Badge 
                        variant="outline" 
                        className={`font-mono font-bold text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${entryBadgeClass}`}
                      >
                        {entry.code}
                        {entry.isNonCovered && <span className="ml-1">⚠</span>}
                      </Badge>
                      {isCodeCopied && (
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
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
                <span className="text-xs sm:text-sm text-slate-400 italic">No codes linked</span>
              )}
            </div>
          )}
        </div>

        {/* Coverage Status Footer */}
        <div className={`px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r ${isCovered ? 'from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30' : 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30'} flex items-center justify-between hover:shadow-inner transition-all duration-300`}>
          <div className="flex items-center gap-2 sm:gap-3">
            {getCoverageIcon()}
            <h4 className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Status</h4>
          </div>
          <Badge className={`text-xs sm:text-sm font-bold px-3 sm:px-5 py-1.5 sm:py-2.5 border-2 rounded-full transition-all duration-300 hover:scale-105 ${getCoverageBadgeClass()}`}>
            {coverageStatus === 'COVERED' ? 'COVERED' : 
             coverageStatus === 'PARTIAL' ? 'PARTIAL' : 'NOT COVERED'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
