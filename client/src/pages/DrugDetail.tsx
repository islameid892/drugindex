import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCoverageStatus } from "@/hooks/useCoverageStatus";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Heart } from "lucide-react";
import { BranchViewer } from "@/components/BranchViewer";
import { useState, useEffect } from "react";
import { updatePageSchema } from "@/lib/jsonLdSchemas";

export default function DrugDetail() {
  const { name } = useParams<{ name: string }>();
  const [, navigate] = useLocation();
  const decodedName = decodeURIComponent(name || "");
  const [drugs, setDrugs] = useState<any[]>([]);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [mainRes, treeRes] = await Promise.all([
          fetch("/data/main_data.json"),
          fetch("/data/tree_data.json"),
        ]);
        const main = await mainRes.json();
        const tree = await treeRes.json();
        
        const filtered = main.filter(
          (item: any) => item.scientificName.toLowerCase() === decodedName.toLowerCase()
        );
        setDrugs(filtered);
        setTreeData(tree);
        
        // Add JSON-LD schema for first drug
        if (filtered.length > 0) {
          const drug = filtered[0];
          updatePageSchema('drug', {
            name: drug.scientificName,
            description: drug.indication || 'Medical drug information',
            indication: drug.indication || '',
            activeIngredient: drug.scientificName,
            url: `https://drugindex.click/drug/${encodeURIComponent(drug.scientificName)}`,
          });
          
          // Update page title
          document.title = `${drug.scientificName} - ICD-10 Search Engine`;
          const metaDescription = document.querySelector('meta[name="description"]');
          if (metaDescription) {
            metaDescription.setAttribute('content', `${drug.scientificName} - ${drug.indication || 'Medical drug information'}`);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [decodedName]);

  const allCodes = drugs.map((d: any) => (Array.isArray(d.icdCodes) ? d.icdCodes.join(',') : '')).join(",");
  const { isCovered } = useCoverageStatus(allCodes);
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-emerald-50 p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (drugs.length === 0) {
    // Clear schema if drug not found
    useEffect(() => {
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.remove();
      }
    }, []);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-emerald-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Button onClick={() => window.history.back()} variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="text-center py-12">
            <p className="text-slate-600">Drug not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-emerald-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Button onClick={() => window.history.back()} variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>

        <div className="space-y-6">
          {drugs.map((drug: any, idx: number) => {
            const icdCodesStr = Array.isArray(drug.icdCodes) ? drug.icdCodes.join(',') : '';
            const favoriteId = `${drug.scientificName}-${drug.indication}-${icdCodesStr}`;
            const isFav = isFavorite(favoriteId);
            const codes = (Array.isArray(drug.icdCodes) ? drug.icdCodes : []).map((c: string) => ({
              fullCode: c.trim(),
              mainCode: c.trim().substring(0, 3),
            }));
            const treeNodes = codes.map((codeObj: any) => ({
              ...codeObj,
              node: treeData.find(
                (node: any) =>
                  node.code === codeObj.fullCode || node.code === codeObj.mainCode
              ),
            }));

            return (
              <div
                key={idx}
                className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {drug.scientificName}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">
                      Trade Names: {Array.isArray(drug.tradeNames) ? drug.tradeNames.join(', ') : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`${
                        isCovered
                          ? "bg-sky-50 text-sky-700 border-sky-200"
                          : "bg-red-100 text-red-700 border-red-300"
                      } border`}
                    >
                      {isCovered ? "COVERED" : "NOT COVERED"}
                    </Badge>
                    <Button
                      onClick={() => {
                        if (isFav) {
                          removeFavorite(favoriteId);
                        } else {
                          addFavorite({
                            id: favoriteId,
                            scientific_name: drug.scientificName,
                            trade_name: Array.isArray(drug.tradeNames) ? drug.tradeNames.join(', ') : '',
                            indication: drug.indication,
                            icd10_codes: icdCodesStr,
                            atc_codes: (Array.isArray(drug.atcCodes) ? drug.atcCodes.join(',') : ''),
                            addedAt: Date.now(),
                          });
                        }
                      }}
                      variant="ghost"
                      size="sm"
                      className={`transition-all ${
                        isFav
                          ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                          : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                      }`}
                    >
                      <Heart className={`h-5 w-5 ${isFav ? "fill-current" : ""}`} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">
                      Indication
                    </h3>
                    <p className="text-slate-600">{drug.indication}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">
                      ICD-10 Codes
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {treeNodes.map((item: any, cIdx: number) => (
                        <div key={cIdx} className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {item.fullCode}
                          </Badge>
                          {item.node && (
                            <BranchViewer
                              mainCode={item.node.code}
                              mainDescription={item.node.description}
                              branches={item.node.branches}
                              isCovered={isCovered}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {drug.atc_codes && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-2">
                        ATC Codes
                      </h3>
                      <p className="text-slate-600 font-mono text-sm">
                        {drug.atc_codes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
