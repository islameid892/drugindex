import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BranchViewer } from "./BranchViewer";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart } from "lucide-react";

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
  
  const cardBorderClass = isCovered 
    ? 'border-slate-200 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/50' 
    : 'border-red-200 hover:border-red-400 hover:shadow-lg hover:shadow-red-100/50';
    
  const headerBgClass = isCovered 
    ? 'bg-slate-50/50' 
    : 'bg-red-50/50';
    
  const indicationClass = isCovered 
    ? 'text-slate-700 bg-slate-50 border-slate-100' 
    : 'text-red-700 bg-red-50/50 border-red-200';
    
  const badgeClass = isCovered 
    ? 'text-slate-700 border-slate-300 bg-white' 
    : 'text-red-700 border-red-300 bg-red-50';
  
  return (
    <Card className={`group overflow-hidden transition-all duration-300 ${cardBorderClass}`}>
      <CardContent className="p-0">
        {/* Header Row with Trade Name / Scientific Name */}
        <div className={`px-4 py-3 border-b ${headerBgClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Trade Name / Scientific Name</h4>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors truncate">
                  {tradeName || data.scientificName}
                </p>
                {tradeName && (
                  <p className="text-xs text-slate-600 italic truncate">
                    {data.scientificName}
                  </p>
                )}
              </div>
            </div>
            <Button
              onClick={handleToggleFavorite}
              variant="ghost"
              size="sm"
              className={`flex-shrink-0 transition-all ${
                isFav
                  ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                  : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Indication Row */}
        {indication && (
          <div className="px-4 py-3 border-b border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Indication</h4>
            <p className={`text-sm font-medium leading-relaxed p-2 rounded border transition-colors ${indicationClass}`}>
              {indication}
            </p>
          </div>
        )}

        {/* ICD-10 Codes Row */}
        <div className="px-4 py-3 border-b border-slate-100">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">ICD-10 Codes</h4>
          <div className="flex flex-wrap gap-1.5">
            {icdCodeEntries.map((entry, index) => {
              const entryBadgeClass = entry.isNonCovered
                ? 'text-red-700 border-red-300 bg-red-50'
                : badgeClass;
              return (
                <div key={`${entry.code}-${index}`} className="flex items-center gap-1">
                  <Badge variant="outline" className={`font-mono font-bold text-xs ${entryBadgeClass}`}>
                    {entry.code}
                    {entry.isNonCovered && <span className="ml-1 text-[10px]">⚠</span>}
                  </Badge>
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
              <span className="text-xs text-slate-400 italic">No codes linked</span>
            )}
          </div>
        </div>

        {/* Coverage Status Row */}
        <div className="px-4 py-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coverage Status</h4>
          <Badge className={`font-mono text-xs font-bold ${
            coverageStatus === 'COVERED' ? 'bg-sky-50 text-sky-700 border-sky-200' :
            coverageStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-red-100 text-red-700 border-red-300'
          }`}>
            {coverageStatus === 'COVERED' ? 'COVERED' : 
             coverageStatus === 'PARTIAL' ? 'PARTIAL' : 'NOT COVERED'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
