import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BranchViewer } from "./BranchViewer";
import { useCoverageStatus } from "@/hooks/useCoverageStatus";

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
      node: treeData?.find((node: any) => node.code === codeObj.mainCode)
    }))
    .filter((item: any) => item.node);

  // استخدام الـ hook للتحقق من حالة التغطية
  const { isCovered } = useCoverageStatus(data.icd10_codes);

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
        <div className="flex flex-col">
          <span className="font-bold group-hover:text-sky-700 transition-colors">{data.scientific_name}</span>
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
          {/* عرض أزرار Branches لكل الأكواد */}
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
      </TableCell>
      <TableCell>
        <Badge className={`font-mono text-xs ${statusBadgeClass}`}>
          {isCovered ? 'COVERED' : 'NOT COVERED'}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
