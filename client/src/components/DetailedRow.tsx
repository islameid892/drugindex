import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BranchViewer } from "./BranchViewer";
import { useCoverageStatus } from "@/hooks/useCoverageStatus";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart } from "lucide-react";

interface DetailedRowProps {
  data: any;
  treeData?: any;
}

export function DetailedRow({ data, treeData }: DetailedRowProps) {
  // استخراج جميع الأكواد الرئيسية (أول 3 أحرف) للبحث في الشجرة
  const icdCodes = Array.isArray(data.icdCodes) ? data.icdCodes : [];
  const allCodes = icdCodes.map((code: string) => ({
    fullCode: code.trim(),
    mainCode: code.trim().substring(0, 3)
  }));
  
  const treeNodes = allCodes
    .map((codeObj: any) => ({
      ...codeObj,
      node: treeData?.find((node: any) => node.code === codeObj.fullCode || node.code === codeObj.mainCode)
    }));

  // استخدام الـ hook للتحقق من حالة التغطية
  const codesString = icdCodes.join(',');
  const { isCovered } = useCoverageStatus(codesString);

  // استخدام الـ hook للمفضلة
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const tradeName = Array.isArray(data.tradeNames) ? data.tradeNames.join(', ') : '';
  const favoriteId = `${data.scientificName}-${data.indication}-${codesString}`;
  const isFav = isFavorite(favoriteId);
  
  const handleToggleFavorite = () => {
    if (isFav) {
      removeFavorite(favoriteId);
    } else {
      addFavorite({
        id: favoriteId,
        scientific_name: data.scientificName,
        trade_name: tradeName,
        indication: data.indication,
        icd10_codes: codesString,
        atc_codes: (data.atcCodes || []).join(','),
        addedAt: Date.now()
      });
    }
  };

  const rowHoverClass = isCovered ? 'hover:bg-sky-50/30' : 'hover:bg-red-50/30';
  const indicationClass = isCovered ? 'text-slate-700' : 'text-red-700';
  const badgeClass = isCovered 
    ? 'bg-white text-slate-700 border-slate-300' 
    : 'bg-red-50 text-red-700 border-red-300';
  const statusBadgeClass = isCovered 
    ? 'bg-sky-50 text-sky-700 border-sky-200' 
    : 'bg-red-100 text-red-700 border-red-300';

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
      <TableCell className={`max-w-xs transition-colors ${indicationClass}`} title={data.indication}>
        <span className="line-clamp-2">{data.indication}</span>
      </TableCell>

      {/* ICD-10 Codes */}
      <TableCell>
        <div className="flex items-center gap-2 flex-wrap">
          {icdCodes.map((code: string, index: number) => {
            const codeObj = allCodes[index];
            const node = treeData?.find((n: any) => n.code === codeObj.fullCode || n.code === codeObj.mainCode);
            return (
              <div key={`${code}-${index}`} className="flex items-center gap-1">
                <Badge variant="outline" className={`font-mono text-xs ${badgeClass}`}>
                  {code}
                </Badge>
                {node && (
                  <BranchViewer 
                    mainCode={node.code} 
                    mainDescription={node.description} 
                    branches={node.branches}
                    isCovered={isCovered}
                  />
                )}
              </div>
            );
          })}
        </div>
      </TableCell>

      {/* Coverage Status */}
      <TableCell>
        <Badge className={`font-mono text-xs font-bold ${statusBadgeClass}`}>
          {isCovered ? 'COVERED' : 'NOT COVERED'}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
