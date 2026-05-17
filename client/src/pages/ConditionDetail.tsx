import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { updatePageSchema } from "@/lib/jsonLdSchemas";
import { trpc } from "@/lib/trpc";

export default function ConditionDetail() {
  const { condition } = useParams<{ condition: string }>();
  const [, navigate] = useLocation();
  const decodedCondition = decodeURIComponent(condition || "");

  // Fetch medications from API
  const { data: allMedications = [], isLoading } = trpc.data.medications.getAll.useQuery(
    { limit: 50000, offset: 0 },
    {
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 2,
    }
  );

  // Filter drugs by condition
  const drugs = allMedications.filter((item: any) =>
    item.indication?.toLowerCase().includes(decodedCondition.toLowerCase())
  );

  // Update page schema when data is loaded
  useEffect(() => {
    if (!isLoading) {
      updatePageSchema('condition', {
        name: decodedCondition,
        description: `Medical condition: ${decodedCondition} with ${drugs.length} treatment option(s)`,
        url: `https://drugindex.click/condition/${encodeURIComponent(decodedCondition)}`,
      });

      // Update page title
      document.title = `${decodedCondition} - ICD-10 Search Engine`;
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', `Medical condition: ${decodedCondition} with ${drugs.length} treatment option(s)`);
      }
    }
  }, [decodedCondition, drugs.length, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-emerald-50 p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-emerald-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Button onClick={() => window.history.back()} variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            {decodedCondition}
          </h1>
          <p className="text-slate-600 mt-2">
            {drugs.length} medication{drugs.length !== 1 ? "s" : ""} found
          </p>
        </div>

        <div className="space-y-4">
          {drugs.map((drug: any, idx: number) => (
            <div
              key={idx}
              className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/drug/${encodeURIComponent(drug.scientificName)}`)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {drug.scientificName}
                  </h3>
                  <p className="text-sm text-slate-600">
                    Trade: {Array.isArray(drug.tradeNames) ? drug.tradeNames.join(', ') : ''}
                  </p>
                  <p className="text-sm text-slate-600 mt-2">
                    Codes: {Array.isArray(drug.icdCodes) ? drug.icdCodes.join(', ') : ''}
                  </p>
                </div>
                <Badge className="bg-sky-50 text-sky-700 border-sky-200 border">
                  COVERED
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {drugs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600">No medications found for this condition</p>
          </div>
        )}
      </div>
    </div>
  );
}
