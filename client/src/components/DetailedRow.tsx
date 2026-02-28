import { TableCell, TableRow } from "@/components/ui/table";
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

interface DetailedRowProps {
  data: any;
  treeData?: any; // kept for backward compatibility
}

export function DetailedRow({ data }: DetailedRowProps) {
  // Support both old format (array of strings) and new format (array of objects)
  const rawIcdCodes = Array.isArray(data.icdCodes) ? data.icdCodes : [];
  
  const icdCodeEntries: IcdCodeEntry[] = rawIcdCodes.map((entry: any) => {
    if (typeof entry === 'string') {
      return { code: entry, description: '', branchCount: 0, isNonCovered: false, branches: [] };
    }
    return entry as IcdCodeEntry;
  });

  // Determine coverage from API
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

  const rowHoverClass = isCovered ? 'hover:bg-sky-50/30' : 'hover:bg-red-50/30';
  const indicationClass = isCovered ? 'text-slate-700' : 'text-red-700';
  const badgeClass = isCovered 
    ? 'bg-white text-slate-700 border-slate-300' 
    : 'bg-white text-red-700 border-red-300';
  const statusBadgeClass = coverageStatus === 'COVERED'
    ? 'bg-sky-50 text-sky-700 border-sky-200'
    : coverageStatus === 'PARTIAL'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-white text-red-700 border-red-300';

  return (
    <TableRow className={`transition-colors group ${rowHoverClass}`}>
      {/* Trade Name / Scientific Name */}
      <TableCell className="font-medium text-slate-900">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold group-hover:text-sky-700 transition-colors">{tradeName || data.scientificName}</span>
            <Button
              onClick={handleToggleFavorite}
              variant="ghost"
              size="sm"
              className={`transition-all h-6 w-6 p-0 flex-shrink-0 ${
                isFav
                  ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                  : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
            </Button>
          </div>
          {tradeName && (
            <span className="text-xs text-slate-500 font-normal italic">
              {data.scientificName}
            </span>
          )}
        </div>
      </TableCell>

      {/* Indication */}
      <TableCell className={`max-w-xs transition-colors ${indicationClass}`} title={indication}>
        <span className="line-clamp-2">{indication || '—'}</span>
      </TableCell>

      {/* ICD-10 Codes */}
      <TableCell>
        <div className="flex items-center gap-2 flex-wrap">
          {icdCodeEntries.map((entry, index) => {
            const entryBadgeClass = entry.isNonCovered
              ? 'bg-white text-red-700 border-red-300'
              : badgeClass;
            return (
              <div key={`${entry.code}-${index}`} className="flex items-center gap-1">
                <Badge variant="outline" className={`font-mono text-xs ${entryBadgeClass}`}>
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
            <span className="text-xs text-slate-400 italic">—</span>
          )}
        </div>
      </TableCell>

      {/* Coverage Status */}
      <TableCell>
        <Badge className={`font-mono text-xs font-bold ${statusBadgeClass}`}>
          {coverageStatus === 'COVERED' ? 'COVERED' : 
           coverageStatus === 'PARTIAL' ? 'PARTIAL' : 'NOT COVERED'}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
