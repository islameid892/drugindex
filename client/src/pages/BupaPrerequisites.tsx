import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Bupa Prerequisites
          </h1>
          <p className="text-lg text-slate-600">
            Medical services and their prerequisites for Bupa insurance coverage
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search by service name or ICD code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-3 text-base"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-3.5"
              >
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Found {filteredPrerequisites.length} results
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-slate-600">Loading prerequisites...</span>
            </div>
          ) : filteredPrerequisites.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-500 text-lg">
                {searchQuery
                  ? "No prerequisites found matching your search"
                  : "No prerequisites available"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="w-1/3">
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center font-semibold text-slate-900 hover:text-blue-600"
                    >
                      Service Name
                      <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead className="w-1/3">
                    <button
                      onClick={() => handleSort("codes")}
                      className="flex items-center font-semibold text-slate-900 hover:text-blue-600"
                    >
                      ICD Codes
                      <SortIcon field="codes" />
                    </button>
                  </TableHead>
                  <TableHead className="w-1/3 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrerequisites.map((prerequisite: BupaPrerequisite) => (
                  <TableRow
                    key={prerequisite.id}
                    className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <TableCell className="font-medium text-slate-900">
                      {prerequisite.serviceName}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {prerequisite.icdCodes.split(",").map((code: string, idx: number) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {code.trim()}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPrerequisite(prerequisite)}
                        className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <Dialog
        open={!!selectedPrerequisite}
        onOpenChange={(open) => !open && setSelectedPrerequisite(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedPrerequisite?.serviceName}
            </DialogTitle>
            <DialogDescription>
              Prerequisites for Bupa insurance coverage
            </DialogDescription>
          </DialogHeader>

          {selectedPrerequisite && (
            <div className="space-y-6">
              {/* ICD Codes */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Applicable ICD-10 Codes
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPrerequisite.icdCodes.split(",").map((code: string, idx: number) => (
                    <Badge key={idx} className="bg-blue-100 text-blue-800">
                      {code.trim()}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">
                  Requirements
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedPrerequisite.requirements}
                </div>
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-slate-200 text-xs text-slate-500">
                <p>
                  Last updated:{" "}
                  {new Date(selectedPrerequisite.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
