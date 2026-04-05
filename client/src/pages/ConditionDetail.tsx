import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { updatePageSchema } from "@/lib/jsonLdSchemas";

export default function ConditionDetail() {
  const { condition } = useParams<{ condition: string }>();
  const [, navigate] = useLocation();
  const decodedCondition = decodeURIComponent(condition || "");
  const [drugs, setDrugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/data/main_data.json");
        const main = await res.json();
        
        const filtered = main.filter((item: any) =>
          item.indication.toLowerCase().includes(decodedCondition.toLowerCase())
        );
        setDrugs(filtered);
        
        // Add JSON-LD schema for medical condition
        updatePageSchema('condition', {
          name: decodedCondition,
          description: `Medical condition: ${decodedCondition} with ${filtered.length} treatment option(s)`,
          url: `https://drugindex.click/condition/${encodeURIComponent(decodedCondition)}`,
        });
        
        // Update page title
        document.title = `${decodedCondition} - ICD-10 Search Engine`;
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          metaDescription.setAttribute('content', `Medical condition: ${decodedCondition} with ${filtered.length} treatment option(s)`);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [decodedCondition]);

  if (loading) {
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
