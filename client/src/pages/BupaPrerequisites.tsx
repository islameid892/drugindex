import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  FileText,
  Stethoscope,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface BupaPrerequisite {
  id: number;
  serviceName: string;
  icdCodes: string;
  requirements: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function BupaPrerequisites() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrerequisite, setSelectedPrerequisite] =
    useState<BupaPrerequisite | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "codes">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch all prerequisites
  const { data: allPrerequisites, isLoading } = trpc.bupa.getAll.useQuery();

  // Filter and sort prerequisites
  const filteredPrerequisites = useMemo(() => {
    if (!allPrerequisites) return [];

    let filtered = allPrerequisites.filter(
      (item: BupaPrerequisite) =>
        item.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.icdCodes.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort
    filtered.sort((a: BupaPrerequisite, b: BupaPrerequisite) => {
      let compareValue = 0;
      if (sortBy === "name") {
        compareValue = a.serviceName.localeCompare(b.serviceName);
      } else {
        compareValue = a.icdCodes.localeCompare(b.icdCodes);
      }
      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    return filtered;
  }, [allPrerequisites, searchQuery, sortBy, sortOrder]);

  const handleSort = (field: "name" | "codes") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: "name" | "codes" }) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  const parseRequirements = (text: string): string[] => {
    return text.split('\n').filter(line => line.trim().length > 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Bupa Prerequisites
              </h1>
              <p className="text-lg text-slate-600 mt-2">
                Complete guide to medical service prerequisites for Bupa insurance coverage
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Services</p>
                <p className="text-3xl font-bold text-indigo-600 mt-2">
                  {allPrerequisites?.length || 0}
                </p>
              </div>
              <Stethoscope className="h-12 w-12 text-indigo-200" />
            </div>
          </Card>
          
          <Card className="p-6 bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Filtered Results</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {filteredPrerequisites.length}
                </p>
              </div>
              <CheckCircle2 className="h-12 w-12 text-purple-200" />
            </div>
          </Card>

          <Card className="p-6 bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Search Status</p>
                <p className="text-lg font-bold text-slate-700 mt-2">
                  {searchQuery ? "Searching..." : "Ready"}
                </p>
              </div>
              <AlertCircle className="h-12 w-12 text-slate-200" />
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-4 h-5 w-5 text-indigo-400" />
            <Input
              type="text"
              placeholder="Search by service name or ICD code (e.g., 'MRI', 'E11', 'Cardiology')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-12 py-3 text-base border-2 border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Results Section */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <span className="ml-3 text-lg text-slate-600">Loading prerequisites...</span>
          </div>
        ) : filteredPrerequisites.length === 0 ? (
          <div className="text-center py-20">
            <AlertCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-slate-700 mb-2">No Results Found</h3>
            <p className="text-slate-600">
              {searchQuery
                ? `No services found matching "${searchQuery}". Try a different search term.`
                : "No prerequisites available at the moment."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPrerequisites.map((prerequisite: BupaPrerequisite) => (
              <Card
                key={prerequisite.id}
                className="p-5 bg-white border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setSelectedPrerequisite(prerequisite)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {prerequisite.serviceName}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {prerequisite.icdCodes.split(",").map((code: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                        >
                          {code.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors flex-shrink-0 mt-1" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedPrerequisite} onOpenChange={() => setSelectedPrerequisite(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-indigo-600">
              {selectedPrerequisite?.serviceName}
            </DialogTitle>
            <DialogDescription>
              Prerequisites and requirements for Bupa coverage
            </DialogDescription>
          </DialogHeader>

          {selectedPrerequisite && (
            <div className="space-y-6">
              {/* ICD Codes */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                  ICD-10 Codes
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPrerequisite.icdCodes.split(",").map((code: string, idx: number) => (
                    <Badge
                      key={idx}
                      className="bg-indigo-100 text-indigo-700 text-base py-2 px-3"
                    >
                      {code.trim()}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                  Required Documents & Information
                </h4>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  {parseRequirements(selectedPrerequisite.requirements).map((req, idx) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <p className="text-slate-700 leading-relaxed">{req}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setSelectedPrerequisite(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    // Copy to clipboard functionality
                    const text = `${selectedPrerequisite.serviceName}\n\nICD Codes: ${selectedPrerequisite.icdCodes}\n\nRequirements:\n${selectedPrerequisite.requirements}`;
                    navigator.clipboard.writeText(text);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  Copy Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
