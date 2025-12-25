import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BranchViewer } from "./BranchViewer";

interface DetailedRowProps {
  data: any;
  treeData?: any;
}

export function DetailedRow({ data, treeData }: DetailedRowProps) {
  const mainCode = data.icd10_codes.split(',')[0].trim().substring(0, 3);
  const treeNode = treeData?.find((node: any) => node.code === mainCode);

  return (
    <TableRow className="hover:bg-sky-50/30 transition-colors group">
      <TableCell className="font-medium text-slate-900">
        <div className="flex flex-col">
          <span className="font-bold group-hover:text-sky-700 transition-colors">{data.trade_name}</span>
          <span className="text-xs text-slate-500 font-normal">{data.scientific_name}</span>
        </div>
      </TableCell>
      <TableCell className="text-slate-700 max-w-xs truncate" title={data.indication}>
        {data.indication}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono bg-white text-slate-700 border-slate-300">
            {data.icd10_codes}
          </Badge>
          {treeNode && (
            <BranchViewer 
              mainCode={treeNode.code} 
              mainDescription={treeNode.description} 
              branches={treeNode.branches} 
            />
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="font-mono text-xs bg-slate-100 text-slate-600 hover:bg-slate-200">
          {data.atc_codes}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
