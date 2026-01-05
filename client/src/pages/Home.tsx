import { useState, useEffect, useMemo } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ResultCard } from "@/components/ResultCard";
import { DetailedRow } from "@/components/DetailedRow";
import BrowseModal from "@/components/BrowseModal";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, List, Loader2, Stethoscope, Pill, Activity, Database, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"aggregated" | "detailed">("aggregated");
  const [mainData, setMainData] = useState<any[]>([]);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ medications: 0, conditions: 0, codes: 0 });
  const [browseModal, setBrowseModal] = useState<{ isOpen: boolean; type: 'drugs' | 'conditions' | 'codes' }>({ isOpen: false, type: 'drugs' });

  // تحميل البيانات
  useEffect(() => {
    const loadData = async () => {
      try {
        const [mainRes, treeRes] = await Promise.all([
          fetch('/data/main_data.json'),
          fetch('/data/tree_data.json')
        ]);
        
        const main = await mainRes.json();
        const tree = await treeRes.json();
        
        setMainData(main);
        setTreeData(tree);
        
        // حساب الإحصائيات
        setStats({
          medications: main.length,
          conditions: new Set(main.map((item: any) => item.indication)).size,
          codes: tree.length
        });
        
        setLoading(false);
      } catch (error) {
        console.error("Failed to load data:", error);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // تصفية النتائج
  const filteredData = useMemo(() => {
    if (!query) return [];
    
    const lowerQuery = query.toLowerCase();
    return mainData.filter(item => 
      item.trade_name.toLowerCase().includes(lowerQuery) ||
      item.scientific_name.toLowerCase().includes(lowerQuery) ||
      item.indication.toLowerCase().includes(lowerQuery) ||
      item.icd10_codes.toLowerCase().includes(lowerQuery)
    ).slice(0, 100); // تحديد عدد النتائج لتحسين الأداء
  }, [query, mainData]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {/* Header Section */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-sky-500 p-2 rounded-lg shadow-lg shadow-sky-500/20">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight" style={{fontSize: '25px'}}>ICD-10 Search Engine</h1>
                <p className="text-xs text-slate-500 font-medium" style={{fontSize: '15px'}}>Medical Coding & Drug Reference</p>
                <p className="text-xs mt-1 font-semibold bg-gradient-to-r from-sky-600 via-emerald-600 to-sky-600 bg-clip-text text-transparent" style={{fontSize: '13px', textDecoration: 'underline'}}>Created By Pharmacist: Islam Mostafa Eid</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500 hidden md:flex">
              <div className="flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5 text-sky-500" />
                <span>{stats.medications.toLocaleString()} Meds</span>
              </div>
              <div className="w-px h-3 bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                <span>{stats.conditions.toLocaleString()} Conditions</span>
              </div>
              <div className="w-px h-3 bg-slate-300" />
              <div className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-purple-500" />
                <span>{stats.codes.toLocaleString()} Codes</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8 space-y-8">
        {/* Search Section */}
        <div className="flex flex-col items-center space-y-6 max-w-3xl mx-auto w-full">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Find Codes & Medications</h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              Search by scientific name, trade name, indication, or ICD-10 code.
            </p>
          </div>
          
          <SearchBar 
            value={query} 
            onChange={setQuery} 
            placeholder="Try 'Diabetes', 'Panadol', or 'E11'..."
          />
          
          {/* View Toggle */}
          {filteredData.length > 0 && (
            <div className="flex items-center justify-between w-full pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors">
                  {filteredData.length} Results Found
                </Badge>
              </div>
              
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
                <TabsList className="grid w-full grid-cols-2 h-9 bg-slate-100 p-1">
                  <TabsTrigger value="aggregated" className="text-xs gap-2 data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-sm">
                    <LayoutGrid className="h-3.5 w-3.5" /> Cards
                  </TabsTrigger>
                  <TabsTrigger value="detailed" className="text-xs gap-2 data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-sm">
                    <List className="h-3.5 w-3.5" /> List
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </div>

        {/* Results Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin mb-4 text-sky-500" />
            <p>Loading medical database...</p>
          </div>
        ) : query && filteredData.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No results found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your search terms or check for typos.</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {viewMode === "aggregated" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredData.map((item, idx) => (
                  <ResultCard key={idx} data={item} treeData={treeData} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[30%]">Scientific Name</TableHead>
                      <TableHead className="w-[30%]">Indication</TableHead>
                      <TableHead className="w-[25%]">ICD-10 Code</TableHead>
                      <TableHead className="w-[15%]">Coverage Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item, idx) => (
                      <DetailedRow key={idx} data={item} treeData={treeData} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
        
        {!query && !loading && (
          <div className="text-center py-20">
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <button
                onClick={() => setBrowseModal({ isOpen: true, type: 'drugs' })}
                className="flex flex-col items-center gap-2 hover:opacity-100 transition-opacity opacity-60 hover:opacity-100 group"
              >
                <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                  <Pill className="h-6 w-6 text-sky-600" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-sky-600 transition-colors">Search Drugs</span>
              </button>
              <button
                onClick={() => setBrowseModal({ isOpen: true, type: 'conditions' })}
                className="flex flex-col items-center gap-2 hover:opacity-100 transition-opacity opacity-60 hover:opacity-100 group"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <Activity className="h-6 w-6 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600 transition-colors">Find Conditions</span>
              </button>
              <button
                onClick={() => setBrowseModal({ isOpen: true, type: 'codes' })}
                className="flex flex-col items-center gap-2 hover:opacity-100 transition-opacity opacity-60 hover:opacity-100 group"
              >
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Database className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-purple-600 transition-colors">Browse Codes</span>
              </button>
            </div>
          </div>
        )}
        
        {/* Browse Modal */}
        <BrowseModal
          isOpen={browseModal.isOpen}
          onClose={() => setBrowseModal({ ...browseModal, isOpen: false })}
          type={browseModal.type}
          data={mainData}
        />
      </main>
    </div>
  );
}


