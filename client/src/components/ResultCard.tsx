import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BranchViewer } from "./BranchViewer";
import { cn } from "@/lib/utils";

interface ResultCardProps {
  data: any;
  treeData?: any;
}

export function ResultCard({ data, treeData }: ResultCardProps) {
  // استخراج الكود الرئيسي (أول 3 أحرف) للبحث في الشجرة
  const mainCode = data.icd10_codes.split(',')[0].trim().substring(0, 3);
  const treeNode = treeData?.find((node: any) => node.code === mainCode);
  
  return (
    <Card className="group overflow-hidden border-slate-200 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/50 transition-all duration-300">
      <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-bold text-slate-800 leading-tight group-hover:text-sky-700 transition-colors">
              {data.trade_name}
            </CardTitle>
            <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <span className="bg-slate-100 px-2 py-0.5 rounded text-xs uppercase tracking-wider text-slate-600">Generic</span>
              {data.scientific_name}
            </div>
          </div>
          <Badge variant="secondary" className="font-mono text-xs bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100">
            {data.atc_codes}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Indication</h4>
          <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            {data.indication}
          </p>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ICD-10</span>
            <Badge variant="outline" className="font-mono font-bold text-slate-700 border-slate-300 bg-white">
              {data.icd10_codes}
            </Badge>
          </div>
          
          {treeNode && (
            <BranchViewer 
              mainCode={treeNode.code} 
              mainDescription={treeNode.description} 
              branches={treeNode.branches} 
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
