import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { updatePageSchema } from "@/lib/jsonLdSchemas";

export default function CodeDetail() {
  const { code } = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const decodedCode = decodeURIComponent(code || "");
  const [drugs, setDrugs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/data/main_data.json");
        const main = await res.json();
        
        const filtered = main.filter((item: any) =>
          Array.isArray(item.icdCodes) && item.icdCodes.some((c: string) => c.trim() === decodedCode)
        );
        setDrugs(filtered);
        
        // Add JSON-LD schema for ICD-10 code
        updatePageSchema('code', {
          code: decodedCode,
          description: `ICD-10 code ${decodedCode} with ${filtered.length} medication(s)`,
          url: `https://drugindex.click/code/${encodeURIComponent(decodedCode)}`,
        });
        
        // Update page title
        document.title = `ICD-10 Code ${decodedCode} - ICD-10 Search Engine`;
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          metaDescription.setAttribute('content', `ICD-10 code ${decodedCode} with ${filtered.length} medication(s)`);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [decodedCode]);

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
            Code: <span className="font-mono text-sky-600">{decodedCode}</span>
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
                    {drug.indication}
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
            <p className="text-slate-600">No medications found for this code</p>
          </div>
        )}
      </div>
    </div>
  );
}
