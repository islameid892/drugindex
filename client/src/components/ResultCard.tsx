import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BranchViewer } from "./BranchViewer";
import { useCoverageStatus } from "@/hooks/useCoverageStatus";

interface ResultCardProps {
  data: any;
  treeData?: any;
}

export function ResultCard({ data, treeData }: ResultCardProps) {
  // استخراج جميع الأكواد الرئيسية (أول 3 أحرف) للبحث في الشجرة
  const allCodes = data.icd10_codes.split(',').map((code: string) => ({
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
  const { isCovered } = useCoverageStatus(data.icd10_codes);
  
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
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-bold text-slate-800 leading-tight group-hover:text-sky-700 transition-colors">
              {data.scientific_name}
            </CardTitle>
            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <span className="bg-slate-100 px-2 py-0.5 rounded text-xs uppercase tracking-wider text-slate-600">Trade Name</span>
              <span className="text-slate-700 font-semibold">{data.trade_name}</span>
            </div>
          </div>
          <Badge className={`font-mono text-xs ${isCovered ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-red-100 text-red-700 border-red-300'}`}>
            {isCovered ? 'COVERED' : 'NOT COVERED'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Indication</h4>
          <p className={`text-sm font-medium leading-relaxed p-2.5 rounded-lg border transition-colors ${indicationClass}`}>
            {data.indication}
          </p>
        </div>
        
        <div className={`flex items-center justify-between pt-2 mt-2 border-t transition-colors ${dividerClass}`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ICD-10</span>
            <Badge variant="outline" className={`font-mono font-bold ${badgeClass}`}>
              {data.icd10_codes}
            </Badge>
          </div>
          
          {/* عرض أزرار Branches لكل الأكواد */}
          <div className="flex gap-2 flex-wrap justify-end">
            {treeNodes.map((item: any, index: number) => (
              <BranchViewer 
                key={`${item.mainCode}-${index}`}
                mainCode={item.node.code} 
                mainDescription={item.node.description} 
                branches={item.node.branches}
                isCovered={isCovered}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
