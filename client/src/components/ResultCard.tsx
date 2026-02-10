import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BranchViewer } from "./BranchViewer";
import { useCoverageStatus } from "@/hooks/useCoverageStatus";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart } from "lucide-react";

interface ResultCardProps {
  data: any;
  treeData?: any;
}

export function ResultCard({ data, treeData }: ResultCardProps) {
  // استخراج جميع الأكواد الرئيسية (أول 3 أحرف) للبحث في الشجرة
  const icdCodes = Array.isArray(data.icdCodes) ? data.icdCodes : [];
  const allCodes = icdCodes.map((code: string) => ({
    fullCode: code.trim(),
    mainCode: code.trim().substring(0, 3)
  }));
  
  const treeNodes = allCodes
    .map((codeObj: any) => ({
      ...codeObj,
      node: treeData?.find((node: any) => node.code === codeObj.mainCode)
    }))
    .filter((item: any) => item.node);
  
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
  
  const cardBorderClass = isCovered 
    ? 'border-slate-200 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/50' 
    : 'border-red-200 hover:border-red-400 hover:shadow-lg hover:shadow-red-100/50';
    
  const headerBgClass = isCovered 
    ? 'bg-slate-50/50 border-slate-100' 
    : 'bg-red-50/50 border-red-100';
    
  const indicationClass = isCovered 
    ? 'text-slate-700 bg-slate-50 border-slate-100' 
    : 'text-red-700 bg-red-50/50 border-red-200';
    
  const badgeClass = isCovered 
    ? 'text-slate-700 border-slate-300 bg-white' 
    : 'text-red-700 border-red-300 bg-red-50';
    
  const dividerClass = isCovered ? 'border-slate-100' : 'border-red-200';
  
  return (
    <Card className={`group overflow-hidden transition-all duration-300 ${cardBorderClass}`}>
      <CardHeader className={`pb-3 border-b transition-colors ${headerBgClass}`}>
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-0.5 flex-1">
            <CardTitle className="text-lg font-bold text-slate-800 leading-tight group-hover:text-sky-700 transition-colors">
              {data.scientificName}
            </CardTitle>
            <div className="text-sm font-medium text-slate-500">
              <span className="bg-slate-100 px-2 py-0.5 rounded text-xs uppercase tracking-wider text-slate-600 inline-block">Trade Name</span>
              <p className="text-slate-700 font-semibold mt-0.5 leading-snug">{tradeName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleToggleFavorite}
              variant="ghost"
              size="sm"
              className={`transition-all ${
                isFav
                  ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                  : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`h-5 w-5 ${isFav ? 'fill-current' : ''}`} />
            </Button>
            <Badge className={`font-mono text-xs ${isCovered ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-red-100 text-red-700 border-red-300'}`}>
              {isCovered ? 'COVERED' : 'NOT COVERED'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Indication</h4>
          <p className={`text-sm font-medium leading-relaxed p-2.5 rounded-lg border transition-colors ${indicationClass}`}>
            {data.indication}
          </p>
        </div>
        
        <div className={`pt-2 mt-2 border-t transition-colors ${dividerClass}`}>
          <div className="flex items-start gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">ICD-10</span>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {treeNodes.map((item: any, index: number) => (
                <div key={`${item.mainCode}-${index}`} className="flex items-center gap-1">
                  <Badge variant="outline" className={`font-mono font-bold ${badgeClass}`}>
                    {item.fullCode}
                  </Badge>
                  <BranchViewer 
                    mainCode={item.node.code} 
                    mainDescription={item.node.description} 
                    branches={item.node.branches}
                    isCovered={isCovered}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
