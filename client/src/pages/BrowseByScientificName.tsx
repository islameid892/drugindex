import { useRoute } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function BrowseByScientificName() {
  const [, params] = useRoute("/browse/scientific-name/:scientificName");
  const scientificName = params?.scientificName ? decodeURIComponent(params.scientificName) : "";
  
  const { data: drugs, isLoading, error } = trpc.data.medications.search.useQuery(
    { query: scientificName, limit: 1000 },
    { enabled: !!scientificName }
  );

  // Filter to show only drugs with exact scientific name match
  const filteredDrugs = drugs?.filter(
    (drug) => drug.scientificName.toUpperCase() === scientificName.toUpperCase()
  ) || [];

  if (!scientificName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 mb-6">
              <ChevronLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">No Scientific Name Selected</h1>
            <p className="text-slate-600">Please select a scientific name from Browse Drugs.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 mb-6">
            <ChevronLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            {scientificName}
          </h1>
          <p className="text-slate-600">
            All medications containing {scientificName} (100% match)
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <span className="ml-3 text-slate-600">Loading medications...</span>
          </div>
        ) : error ? (
          <Card className="p-8 border-red-200 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error Loading Medications</h3>
                <p className="text-red-700 text-sm mt-1">{error?.message || "An error occurred"}</p>
              </div>
            </div>
          </Card>
        ) : filteredDrugs.length === 0 ? (
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Medications Found</h3>
            <p className="text-slate-600">No medications found with this scientific name.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="text-sm font-semibold text-slate-600 mb-4">
              Found {filteredDrugs.length} medication{filteredDrugs.length !== 1 ? "s" : ""}
            </div>
            <div className="grid gap-4">
              {filteredDrugs.map((drug, idx) => (
                <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{drug.tradeName}</h3>
                      <p className="text-sm text-blue-600 font-medium">{drug.scientificName}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Indication</p>
                        <p className="text-slate-700">{drug.indication}</p>
                      </div>
                      
                      {drug.icdCodes && drug.icdCodes.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                            ICD-10 Codes ({drug.icdCodes.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {drug.icdCodes.map((code, cIdx) => (
                              <div
                                key={cIdx}
                                className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-md"
                              >
                                <p className="text-sm font-semibold text-blue-700">{code.code}</p>
                                {code.branches && code.branches.length > 0 && (
                                  <p className="text-xs text-blue-600">
                                    {code.branches.length} branch{code.branches.length !== 1 ? "es" : ""}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          drug.coverageStatus === "COVERED"
                            ? "bg-green-100 text-green-800"
                            : drug.coverageStatus === "NON-COVERED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {drug.coverageStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
