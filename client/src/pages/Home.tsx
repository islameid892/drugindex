import { useState, useEffect, useMemo } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ResultCard } from "@/components/ResultCard";
import { DetailedRow } from "@/components/DetailedRow";
import BrowseModal from "@/components/BrowseModal";
import { PaginationControls } from "@/components/PaginationControls";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, List, Loader2, Stethoscope, Pill, Activity, Database, Search, Sparkles, ChevronRight, ChevronLeft, Heart, AlertCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useBrowse } from "@/contexts/BrowseContext";
import { Link } from "wouter";

const ITEMS_PER_PAGE = 20;

export default function Home() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"aggregated" | "detailed">("aggregated");
  const [mainData, setMainData] = useState<any[]>([]);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ medications: 0, conditions: 0, codes: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const { favorites } = useFavorites();
  const { browseState, openBrowse, closeBrowse, closeModalCompletely } = useBrowse();

  // تحميل البيانات من الأجزاء مع fallback
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load index to get chunk information
        const indexRes = await fetch('/data/chunks/index.json');
        const index = await indexRes.json();
        
        // Load first chunk immediately for initial display
        const firstChunkRes = await fetch(`/data/chunks/${index.files[0]}`);
        const firstChunk = await firstChunkRes.json();
        
        // Load tree data
        const treeRes = await fetch('/data/tree_data.json');
        const tree = await treeRes.json();
        
        // Set initial data with first chunk
        setMainData(firstChunk);
        setTreeData(tree);
        
        // Calculate initial stats
        setStats({
          medications: index.total,
          conditions: new Set(firstChunk.map((item: any) => item.indication)).size,
          codes: tree.length
        });
        
        // Load remaining chunks in background
        const remainingChunks = index.files.slice(1).map((file: string) =>
          fetch(`/data/chunks/${file}`).then(r => r.json())
        );
        
        Promise.all(remainingChunks).then(chunks => {
          const allData = [firstChunk, ...chunks].flat();
          setMainData(allData);
          
          setStats({
            medications: allData.length,
            conditions: new Set(allData.map((item: any) => item.indication)).size,
            codes: tree.length
          });
        }).catch(error => console.warn('Failed to load remaining chunks:', error));
        
        setLoading(false);
      } catch (error) {
        console.error("Failed to load chunked data:", error);
        // Fallback to loading full file
        try {
          const [mainRes, treeRes] = await Promise.all([
            fetch('/data/main_data.json'),
            fetch('/data/tree_data.json')
          ]);
          const main = await mainRes.json();
          const tree = await treeRes.json();
          setMainData(main);
          setTreeData(tree);
          setStats({
            medications: main.length,
            conditions: new Set(main.map((item: any) => item.indication)).size,
            codes: tree.length
          });
        } catch (fallbackError) {
          console.error("Fallback data loading failed:", fallbackError);
        }
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
    const matchedMedications = mainData.filter(item => {
      const tradeName = item.tradeNames && Array.isArray(item.tradeNames) ? item.tradeNames.join(' ') : '';
      const scientificName = item.scientificName || '';
      return tradeName.toLowerCase().includes(lowerQuery) ||
             scientificName.toLowerCase().includes(lowerQuery);
    });
    
    const matchedConditions = mainData.filter(item => {
      const indication = item.indication || '';
      return indication.toLowerCase().includes(lowerQuery);
    });
    
    const matchedCodes = mainData.filter(item => {
      const codes = item.icdCodes && Array.isArray(item.icdCodes) ? item.icdCodes.join(' ') : '';
      return codes.toLowerCase().includes(lowerQuery);
    });
    
    // دمج النتائج وإزالة التكرارات
    const allMatched = [...matchedMedications, ...matchedConditions, ...matchedCodes];
    const uniqueMatched = Array.from(
      new Map(allMatched.map(item => {
        const key = (item.tradeNames?.join('') || '') + (item.indication || '') + (item.icdCodes?.join('') || '');
        return [key, item];
      })).values()
    );
    
    return uniqueMatched;
  }, [query, mainData]);

  // حساب البيانات المعروضة مع الترقيم
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">ICD-10 Search Engine</h1>
                <p className="text-xs text-slate-500">Drug Reference & Medical Coding</p>
              </div>
            </a>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Pill className="h-4 w-4 text-blue-500" />
                <span className="font-semibold text-slate-900">{stats.medications.toLocaleString()}</span>
                <span className="text-slate-500">Meds</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="font-semibold text-slate-900">{stats.conditions.toLocaleString()}</span>
                <span className="text-slate-500">Conditions</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Database className="h-4 w-4 text-purple-500" />
                <span className="font-semibold text-slate-900">{stats.codes.toLocaleString()}</span>
                <span className="text-slate-500">Codes</span>
              </div>
            </div>

            <Link href="/favorites">
              <a className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                <Heart className="h-5 w-5 text-red-500" />
                <span className="text-sm font-semibold text-slate-900">{favorites.length}</span>
              </a>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        {!query && (
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 mb-4">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Comprehensive Medical Database</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Find Codes & Medications
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              Search by scientific name, trade name, indication, or ICD-10 code. Get instant access to comprehensive medical coding information.
            </p>
          </div>
        )}

        {/* Search Bar */}
        <SearchBar value={query} onChange={setQuery} />

        {/* Browse Section */}
        {!query && (
          <div className="mt-12 mb-12">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Browse by Category</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Browse Drugs */}
              <button
                onClick={() => openBrowse('drugs')}
                className="group p-6 bg-white rounded-lg border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <Pill className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Browse <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Browse Drugs</h4>
                <p className="text-sm text-slate-600 mt-1">Browse all {stats.medications.toLocaleString()} medications</p>
              </button>

              {/* Browse Conditions */}
              <button
                onClick={() => openBrowse('conditions')}
                className="group p-6 bg-white rounded-lg border border-slate-200 hover:border-green-500 hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex items-center gap-2 text-green-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Browse <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Browse Conditions</h4>
                <p className="text-sm text-slate-600 mt-1">Browse all {stats.conditions.toLocaleString()} conditions</p>
              </button>

              {/* Browse Codes */}
              <button
                onClick={() => openBrowse('codes')}
                className="group p-6 bg-white rounded-lg border border-slate-200 hover:border-purple-500 hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <Database className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Browse <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Browse Codes</h4>
                <p className="text-sm text-slate-600 mt-1">Browse all {stats.codes.toLocaleString()} ICD-10 codes</p>
              </button>

              {/* Browse Non-Covered Codes */}
              <button
                onClick={() => openBrowse('non-covered')}
                className="group p-6 bg-white rounded-lg border border-slate-200 hover:border-red-500 hover:shadow-lg transition-all text-left"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-3 bg-red-50 rounded-lg group-hover:bg-red-100 transition-colors">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex items-center gap-2 text-red-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 mb-1">Browse Non-Covered Codes</h4>
                <p className="text-sm text-slate-600 mt-1">Browse codes not covered by insurance</p>
              </button>
            </div>
          </div>
        )}
        
        {/* Results Section */}
        {query && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-slate-500" />
                <span className="text-sm font-medium text-slate-600">
                  {filteredData.length} result{filteredData.length !== 1 ? 's' : ''} found
                </span>
              </div>

              {/* View Mode Toggle */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList className="bg-slate-100 p-1">
                  <TabsTrigger value="aggregated" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">Cards</span>
                  </TabsTrigger>
                  <TabsTrigger value="detailed" className="gap-2">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">List</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                <p className="text-slate-600">Loading data...</p>
              </div>
            )}

            {/* Results Display */}
            {!loading && filteredData.length > 0 && (
              <>
                {viewMode === "aggregated" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedData.map((item, index) => (
                      <ResultCard key={index} data={item} />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="font-bold text-slate-900">Scientific Name</TableHead>
                          <TableHead className="font-bold text-slate-900">Trade Names</TableHead>
                          <TableHead className="font-bold text-slate-900">ICD-10 Codes</TableHead>
                          <TableHead className="font-bold text-slate-900">Indication</TableHead>
                          <TableHead className="font-bold text-slate-900">Coverage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((item, index) => (
                          <DetailedRow key={index} data={item} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {!loading && filteredData.length === 0 && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">No results found for "{query}"</p>
                <p className="text-slate-500 text-sm mt-2">Try searching with different keywords</p>
              </div>
            )}
          </div>
        )}
        
        {/* Browse Modal */}
        <BrowseModal
          isOpen={browseState.isOpen}
          onClose={closeModalCompletely}
          type={browseState.type}
          data={mainData}
          searchQuery={browseState.searchQuery}
        />
      </main>
    </div>
  );
}
