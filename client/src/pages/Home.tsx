import { useState, useMemo, useEffect } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ResultCard } from "@/components/ResultCard";
import { DetailedRow } from "@/components/DetailedRow";
import BrowseModal from "@/components/BrowseModal";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, List, Loader2, Stethoscope, Pill, Activity, Database, Search, Sparkles, ChevronRight, ChevronLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const ITEMS_PER_PAGE = 20;

export default function Home() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"aggregated" | "detailed">("aggregated");
  const [mainData, setMainData] = useState<any[]>([]);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ medications: 0, conditions: 0, codes: 0 });
  const [browseModal, setBrowseModal] = useState<{ isOpen: boolean; type: 'drugs' | 'conditions' | 'codes' }>({ isOpen: false, type: 'drugs' });
  const [currentPage, setCurrentPage] = useState(1);

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

  // إعادة تعيين الصفحة عند تغيير البحث
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  // تصفية النتائج مع إظهار البيانات المرتبطة
  const filteredData = useMemo(() => {
    if (!query) return [];
    
    const lowerQuery = query.toLowerCase().trim();
    
    // البحث عن الأدوية والحالات والأكواد المطابقة
    const matchedMedications = mainData.filter(item => 
      item.trade_name.toLowerCase().includes(lowerQuery) ||
      item.scientific_name.toLowerCase().includes(lowerQuery)
    );
    
    const matchedConditions = mainData.filter(item =>
      item.indication.toLowerCase().includes(lowerQuery)
    );
    
    const matchedCodes = mainData.filter(item =>
      item.icd10_codes.toLowerCase().includes(lowerQuery)
    );
    
    // دمج النتائج وإزالة التكرارات
    const allMatched = [...matchedMedications, ...matchedConditions, ...matchedCodes];
    const uniqueMatched = Array.from(
      new Map(allMatched.map(item => [item.trade_name + item.indication + item.icd10_codes, item])).values()
    );
    
    return uniqueMatched;
  }, [query, mainData]);

  // حساب البيانات المعروضة حسب الصفحة
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Header Section */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 shadow-sm">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-2.5 rounded-xl shadow-lg shadow-sky-500/30">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ICD-10 Search Engine</h1>
                <p className="text-sm text-slate-500 font-medium">Medical Coding & Drug Reference</p>
                <p className="text-xs mt-1 font-semibold bg-gradient-to-r from-sky-600 via-emerald-600 to-sky-600 bg-clip-text text-transparent">Created By Pharmacist: Islam Mostafa Eid</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600 hidden md:flex">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50">
                <Pill className="h-4 w-4 text-sky-600" />
                <span className="font-semibold text-sky-900">{stats.medications.toLocaleString()}</span>
                <span className="text-sky-700">Meds</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50">
                <Activity className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-emerald-900">{stats.conditions.toLocaleString()}</span>
                <span className="text-emerald-700">Conditions</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50">
                <Database className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-purple-900">{stats.codes.toLocaleString()}</span>
                <span className="text-purple-700">Codes</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-12 space-y-12">
        {/* Hero Section */}
        {!query && !loading && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 via-emerald-50 to-sky-100 border border-sky-100 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Background Image */}
            <div 
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: "url('/images/hero-background.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-transparent to-sky-50/40" />
            
            {/* Content */}
            <div className="relative px-6 py-16 md:px-12 md:py-20 text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur border border-sky-200 shadow-sm">
                <Sparkles className="h-4 w-4 text-sky-600" />
                <span className="text-sm font-semibold text-sky-700">Comprehensive Medical Database</span>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
                  Find Codes & Medications
                </h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                  Search by scientific name, trade name, indication, or ICD-10 code. Get instant access to comprehensive medical coding information.
                </p>
              </div>
              
              {/* Search Bar in Hero */}
              <div className="max-w-2xl mx-auto pt-4">
                <SearchBar 
                  value={query} 
                  onChange={setQuery} 
                  placeholder="Try 'Diabetes', 'Panadol', or 'E11'..."
                  autoFocus={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* Search Section */}
        {query && (
          <div className="flex flex-col items-center space-y-6 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Search Results</h2>
              <p className="text-slate-500">
                Showing results for <span className="font-semibold text-sky-600">"{query}"</span>
              </p>
            </div>
            
            <SearchBar 
              value={query} 
              onChange={setQuery} 
              placeholder="Try 'Diabetes', 'Panadol', or 'E11'..."
              autoFocus={true}
            />
            
            {/* View Toggle */}
            {filteredData.length > 0 && (
              <div className="flex items-center justify-between w-full pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2">
                  <Badge className="bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700 transition-all shadow-md">
                    {filteredData.length} Results Found
                  </Badge>
                </div>
                
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-auto">
                  <TabsList className="grid w-full grid-cols-2 h-10 bg-slate-100 p-1 rounded-lg">
                    <TabsTrigger value="aggregated" className="text-xs gap-2 data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-md rounded-md transition-all">
                      <LayoutGrid className="h-4 w-4" /> Cards
                    </TabsTrigger>
                    <TabsTrigger value="detailed" className="text-xs gap-2 data-[state=active]:bg-white data-[state=active]:text-sky-700 data-[state=active]:shadow-md rounded-md transition-all">
                      <List className="h-4 w-4" /> List
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-500/20 to-emerald-500/20 rounded-full blur-xl" />
              <Loader2 className="h-12 w-12 animate-spin text-sky-500 relative" />
            </div>
            <p className="mt-6 text-lg font-medium">Loading medical database...</p>
            <p className="text-sm text-slate-400 mt-2">This may take a moment</p>
          </div>
        ) : query && filteredData.length === 0 ? (
          <div className="text-center py-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 shadow-sm">
            <div className="bg-gradient-to-br from-slate-200 to-slate-300 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
              <Search className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No results found</h3>
            <p className="text-slate-600 mt-2 max-w-md mx-auto">Try adjusting your search terms or check for typos. You can also browse by drugs, conditions, or codes.</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500 space-y-6">
            {viewMode === "aggregated" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedData.map((item, idx) => (
                  <ResultCard key={idx} data={item} treeData={treeData} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-lg">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-sky-50 to-emerald-50 border-b border-slate-200">
                    <TableRow>
                      <TableHead className="w-[30%] font-semibold text-slate-700">Scientific Name</TableHead>
                      <TableHead className="w-[30%] font-semibold text-slate-700">Indication</TableHead>
                      <TableHead className="w-[25%] font-semibold text-slate-700">ICD-10 Code</TableHead>
                      <TableHead className="w-[15%] font-semibold text-slate-700">Coverage Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item, idx) => (
                      <DetailedRow key={idx} data={item} treeData={treeData} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-6">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className={currentPage === page ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700" : ""}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="ml-4 text-sm text-slate-600">
                  Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {!query && !loading && (
          <div className="py-12">
            <div className="text-center mb-12">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Browse by Category</h3>
              <p className="text-slate-600">Quick access to drugs, conditions, and codes</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {/* Search Drugs Card */}
              <button
                onClick={() => setBrowseModal({ isOpen: true, type: 'drugs' })}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-sky-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    <Pill className="h-7 w-7 text-white" />
                  </div>
                  
                  <div className="text-left">
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-sky-700 transition-colors">Search Drugs</h4>
                    <p className="text-sm text-slate-600 mt-1">Browse all medications alphabetically</p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sky-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </button>

              {/* Find Conditions Card */}
              <button
                onClick={() => setBrowseModal({ isOpen: true, type: 'conditions' })}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-emerald-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    <Activity className="h-7 w-7 text-white" />
                  </div>
                  
                  <div className="text-left">
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">Find Conditions</h4>
                    <p className="text-sm text-slate-600 mt-1">Discover medical conditions and diagnoses</p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </button>

              {/* Browse Codes Card */}
              <button
                onClick={() => setBrowseModal({ isOpen: true, type: 'codes' })}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-purple-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    <Database className="h-7 w-7 text-white" />
                  </div>
                  
                  <div className="text-left">
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-purple-700 transition-colors">Browse Codes</h4>
                    <p className="text-sm text-slate-600 mt-1">View all ICD-10 codes and classifications</p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
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
