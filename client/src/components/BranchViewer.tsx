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

interface Branch {
  code: string;
  description: string;
}

interface BranchViewerProps {
  mainCode: string;
  mainDescription: string;
  branches: Branch[];
}

export function BranchViewer({ mainCode, mainDescription, branches }: BranchViewerProps) {
  if (!branches || branches.length === 0) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5 text-xs font-medium text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
        >
          <GitBranch className="h-3.5 w-3.5" />
          {branches.length} Branches
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl border-emerald-100 shadow-xl">
        <div className="p-6 bg-gradient-to-b from-emerald-50/50 to-transparent border-b border-emerald-100/50">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200 font-mono text-sm px-2 py-0.5 shadow-sm">
                {mainCode}
              </Badge>
              <DialogTitle className="text-xl text-slate-800 font-semibold tracking-tight">ICD-10 Hierarchy</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 text-base leading-relaxed">
              {mainDescription}
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <ScrollArea className="flex-1 p-6 bg-slate-50/30">
          <div className="space-y-3">
            {branches.map((branch) => (
              <div 
                key={branch.code} 
                className="group flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100/50 transition-all duration-200"
              >
                <div className="mt-0.5 flex-shrink-0">
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                      {branch.code}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-snug group-hover:text-slate-900 transition-colors">
                    {branch.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t bg-slate-50 text-xs text-center text-slate-400">
          Showing {branches.length} sub-classifications for {mainCode}
        </div>
      </DialogContent>
    </Dialog>
  );
}
