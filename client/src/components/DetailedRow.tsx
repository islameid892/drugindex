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
  const allCodes = data.icd10_codes.split(',').map((code: string) => ({
    fullCode: code.trim(),
    mainCode: code.trim().substring(0, 3)
  }));
  
  const treeNodes = allCodes
    .map((codeObj: any) => ({
      ...codeObj,
      node: treeData?.find((node: any) => node.code === codeObj.fullCode || node.code === codeObj.mainCode)
    }));

  // استخدام الـ hook للتحقق من حالة التغطية
  const { isCovered } = useCoverageStatus(data.icd10_codes);

  // استخدام الـ hook للمفضلة
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const favoriteId = `${data.scientific_name}-${data.indication}-${data.icd10_codes}`;
  const isFav = isFavorite(favoriteId);
  
  const handleToggleFavorite = () => {
    if (isFav) {
      removeFavorite(favoriteId);
    } else {
      addFavorite({
        id: favoriteId,
        scientific_name: data.scientific_name,
        trade_name: data.trade_name,
        indication: data.indication,
        icd10_codes: data.icd10_codes,
        atc_codes: data.atc_codes,
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
      <TableCell className="font-medium text-slate-900">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold group-hover:text-sky-700 transition-colors">{data.scientific_name}</span>
            <Button
              onClick={handleToggleFavorite}
              variant="ghost"
              size="sm"
              className={`transition-all h-6 w-6 p-0 ${
                isFav
                  ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                  : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
            </Button>
          </div>
          <span className="text-xs text-slate-500 font-normal">Trade Name: {data.trade_name}</span>
        </div>
      </TableCell>
      <TableCell className={`max-w-xs truncate transition-colors ${indicationClass}`} title={data.indication}>
        {data.indication}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`font-mono ${badgeClass}`}>
            {data.icd10_codes}
          </Badge>
          {/* عرض أزرار Branches لكل الأكواد التي لها فروع */}
          {treeNodes.map((item: any, index: number) => 
            item.node ? (
              <BranchViewer 
                key={`${item.fullCode}-${index}`}
                mainCode={item.node.code} 
                mainDescription={item.node.description} 
                branches={item.node.branches}
                isCovered={isCovered}
              />
            ) : null
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge className={`font-mono text-xs ${statusBadgeClass}`}>
          {isCovered ? 'COVERED' : 'NOT COVERED'}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
