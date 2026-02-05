import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GitBranch, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface Branch {
  code: string;
  description: string;
}

interface BranchViewerProps {
  mainCode: string;
  mainDescription: string;
  branches: Branch[];
  isCovered?: boolean;
}

export function BranchViewer({ mainCode, mainDescription, branches, isCovered: initialCovered = true }: BranchViewerProps) {
  const [isCovered, setIsCovered] = useState(initialCovered);
  const [branchCoverageMap, setBranchCoverageMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // تحميل حالة التغطية من ملف JSON
    const loadCoverageStatus = async () => {
      try {
        const response = await fetch('/data/non_covered_codes.json');
        const nonCoveredCodes: string[] = await response.json();
        
        // فحص الكود الرئيسي - مطابقة دقيقة فقط
        const isMainCodeNonCovered = nonCoveredCodes.includes(mainCode);
        setIsCovered(!isMainCodeNonCovered);
        
        // فحص كل فرع - مطابقة دقيقة فقط
        const coverageMap: Record<string, boolean> = {};
        branches.forEach((branch) => {
          coverageMap[branch.code] = !nonCoveredCodes.includes(branch.code);
        });
        setBranchCoverageMap(coverageMap);
      } catch (error) {
        console.error('Error loading coverage status:', error);
        setIsCovered(initialCovered);
      }
    };

    loadCoverageStatus();
  }, [mainCode, branches, initialCovered]);

  if (!branches || branches.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`gap-1 text-xs font-medium transition-colors h-7 px-2 ${
            isCovered 
              ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300' 
              : 'text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
          }`}
        >
          <GitBranch className="h-3 w-3" />
          <span className="hidden sm:inline">{branches.length} Branches</span>
          <span className="sm:hidden">{branches.length}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className={`sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl shadow-xl ${
        isCovered ? 'border-emerald-100' : 'border-red-100'
      }`}>
        <div className={`p-6 bg-gradient-to-b border-b transition-colors flex-shrink-0 ${
          isCovered 
            ? 'from-emerald-50/50 to-transparent border-emerald-100/50' 
            : 'from-red-50/50 to-transparent border-red-100/50'
        }`}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className={`bg-white font-mono text-sm px-2 py-0.5 shadow-sm ${
              isCovered 
                ? 'text-emerald-700 border-emerald-200' 
                : 'text-red-700 border-red-200'
            }`}>
              {mainCode}
            </Badge>
              <div className="flex items-center gap-2">
              <DialogTitle className="text-xl text-slate-800 font-semibold tracking-tight">ICD-10 Hierarchy</DialogTitle>
              <Badge className={isCovered ? 'bg-emerald-100 text-emerald-700 border-emerald-300 font-bold text-xs' : 'bg-red-100 text-red-700 border-red-300 font-bold text-xs'}>
                {isCovered ? 'COVERED' : 'NOT COVERED'}
              </Badge>
            </div>
            </div>
            <DialogDescription className="text-slate-600 text-base leading-relaxed">
              {mainDescription}
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 bg-slate-50/30">
            <div className="space-y-3 pr-4">
              {branches.map((branch) => {
                const branchIsCovered = branchCoverageMap[branch.code] !== false;
                return (
                  <div 
                    key={branch.code} 
                    className={`group flex items-start gap-3 p-3 rounded-lg border bg-white transition-all duration-200 ${
                      branchIsCovered
                        ? 'border-slate-200 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100/50'
                        : 'border-red-200 hover:border-red-400 hover:shadow-md hover:shadow-red-100/50 bg-red-50/30'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <ChevronRight className={`h-4 w-4 transition-colors ${
                        branchIsCovered
                          ? 'text-slate-400 group-hover:text-emerald-500'
                          : 'text-red-400 group-hover:text-red-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-mono text-sm font-bold px-1.5 py-0.5 rounded transition-colors ${
                          branchIsCovered
                            ? 'text-slate-700 bg-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-700'
                            : 'text-red-700 bg-red-100 group-hover:bg-red-200 group-hover:text-red-800'
                        }`}>
                          {branch.code}
                        </span>
                        {!branchIsCovered && (
                          <Badge className="text-xs bg-red-100 text-red-700 border-red-300">NOT COVERED</Badge>
                        )}
                      </div>
                      <p className={`text-sm leading-snug transition-colors ${
                        branchIsCovered
                          ? 'text-slate-600 group-hover:text-slate-900'
                          : 'text-red-600 group-hover:text-red-900'
                      }`}>
                        {branch.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t bg-slate-50 text-xs text-center text-slate-400 flex-shrink-0">
          Showing {branches.length} sub-classifications for {mainCode}
        </div>
      </DialogContent>
    </Dialog>
  );
}
