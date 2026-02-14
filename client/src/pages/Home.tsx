import { useState, useMemo, useEffect } from "react";
import { SearchBar } from "@/components/SearchBar";
import { ResultCard } from "@/components/ResultCard";
import { DetailedRow } from "@/components/DetailedRow";
import BrowseModal from "@/components/BrowseModal";
import { PaginationControls } from "@/components/PaginationControls";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, List, Loader2, Stethoscope, Pill, Activity, Database, Search, Sparkles, ChevronRight, ChevronLeft, Heart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Link } from "wouter";
import { memo } from "react";
import pako from 'pako';
import { matchesSearchQuery } from '@/lib/arabicSearch';
import { addFAQSchema, addOrganizationSchema } from '@/lib/structuredData';

const ITEMS_PER_PAGE = 20;

const MemoizedResultCard = memo(ResultCard);
const MemoizedDetailedRow = memo(DetailedRow);

// Helper function to load data with compression support
const loadDataWithCompression = async (url: string): Promise<any> => {
  try {
    // Try loading uncompressed version first (simpler and more reliable)
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn(`Failed to load uncompressed data from ${url}:`, error);
  }
  
  // If uncompressed fails, try compressed version
  try {
    const compressedUrl = url.endsWith('.json') ? url + '.gz' : url;
    const response = await fetch(compressedUrl);
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Try to decompress
    try {
      const decompressed = pako.ungzip(new Uint8Array(arrayBuffer));
      const text = new TextDecoder().decode(decompressed);
      return JSON.parse(text);
    } catch (decompressError) {
      // If decompression fails, try parsing as JSON directly
      // (server might have already decompressed it)
      const text = new TextDecoder().decode(new Uint8Array(arrayBuffer));
      return JSON.parse(text);
    }
  } catch (error) {
    console.error(`Failed to load data from ${url}:`, error);
    throw error;
  }
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"aggregated" | "detailed">("aggregated");
  const [mainData, setMainData] = useState<any[]>([]);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [nonCoveredData, setNonCoveredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ medications: 0, conditions: 0, codes: 0 });
  const [browseModal, setBrowseModal] = useState<{ isOpen: boolean; type: 'drugs' | 'conditions' | 'codes' | 'non-covered' }>({ isOpen: false, type: 'drugs' });
  const [currentPage, setCurrentPage] = useState(1);
  const { favorites } = useFavorites();

  // Set page title and meta tags for SEO
  useEffect(() => {
    document.title = "ICD-10 Medical Search Engine - Drug & Code Reference";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Search ICD-10 medical codes, medications, and healthcare diagnosis codes. Find drug references and pharmaceutical information with coverage status.');
    }
    // Add structured data for better SEO
    addFAQSchema();
    addOrganizationSchema();
  }, []);

  // تحميل البيانات مع دعم الضغط
  useEffect(() => {
    const loadData = async () => {
      try {
        const [main, tree, nonCovered] = await Promise.all([
          loadDataWithCompression('/data/main_data.json'),
          loadDataWithCompression('/data/tree_data.json'),
          loadDataWithCompression('/data/non_covered_codes_full.json')
        ]);
        
        setMainData(main);
        setTreeData(tree);
        setNonCoveredData(nonCovered);
        
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
    const matchedMedications = mainData.filter(item => {
      const tradeName = item.tradeNames && Array.isArray(item.tradeNames) ? item.tradeNames.join(' ') : '';
      const scientificName = item.scientificName || '';
      return matchesSearchQuery(tradeName, query) ||
             matchesSearchQuery(scientificName, query);
    });
    
    const matchedConditions = mainData.filter(item => {
      const indication = item.indication || '';
      return matchesSearchQuery(indication, query);
    });
    
    const matchedCodes = mainData.filter(item => {
      const codes = item.icdCodes && Array.isArray(item.icdCodes) ? item.icdCodes.join(' ') : '';
      return matchesSearchQuery(codes, query);
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
        <div className="container py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-lg shadow-sky-500/40 flex-shrink-0 hover:shadow-xl hover:shadow-sky-500/50 transition-all duration-300">
                <Stethoscope className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="flex-1 sm:flex-none">
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">ICD-10 Search Engine</h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Drug Reference & Medical Coding</p>
                <p className="text-xs mt-0.5 sm:mt-1 font-semibold bg-gradient-to-r from-sky-600 via-emerald-600 to-sky-600 bg-clip-text text-transparent">Created By Pharmacist: Islam Mostafa Eid</p>
              </div>
            </div>
            
            {/* Desktop Stats and Favorites */}
            <div className="flex items-center gap-3 text-xs font-medium text-slate-600 hidden md:flex">
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
              <div className="w-px h-6 bg-slate-200" />
              <Link href="/favorites">
                <Button variant="outline" size="sm" className="gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Heart className="h-4 w-4" />
                  <span className="font-semibold">{favorites.length}</span>
                </Button>
              </Link>
            </div>

            {/* Mobile Stats and Favorites */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 sm:hidden">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50">
                <Pill className="h-3 w-3 text-sky-600" />
                <span className="font-semibold text-sky-900 text-xs">{stats.medications}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50">
                <Activity className="h-3 w-3 text-emerald-600" />
                <span className="font-semibold text-emerald-900 text-xs">{stats.conditions}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50">
                <Database className="h-3 w-3 text-purple-600" />
                <span className="font-semibold text-purple-900 text-xs">{stats.codes}</span>
              </div>
              <Link href="/favorites">
                <Button variant="outline" size="sm" className="gap-1 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 h-8 px-2">
                  <Heart className="h-4 w-4" />
                  <span className="font-semibold text-xs">{favorites.length}</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-12 space-y-12">
        {/* Hero Section */}
        {!query && !loading && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 via-emerald-50 to-sky-100 border border-sky-100 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700" id="hero-section">
            {/* Background Image */}
            <div 
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: "url('https://files.manuscdn.com/user_upload_by_module/session_file/310519663263105436/BxzzjCwZPqngcueX.png')",
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
                <span className="text-sm font-semibold text-sky-700">Comprehensive Medical Database at KSA Market</span>
              </div>
              
              <div className="space-y-4">
                <h2 className="font-display text-5xl md:text-6xl text-slate-900 tracking-tight">
                  Find Codes & Medications
                </h2>
                <p className="font-serif-elegant text-lg md:text-xl text-slate-700 max-w-2xl mx-auto leading-relaxed italic">
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
              
              {/* Browse by Category */}
              <div className="mt-12 pt-8 border-t border-sky-200">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Browse by Category</h3>
                  <p className="text-slate-600">Quick access to drugs, conditions, and codes</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
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
                        <p className="text-sm text-slate-600 mt-1">View all ICD-10 AM codes and classifications</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Explore <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                  
                  {/* Browse Non-Covered Codes Card */}
                  <button
                    onClick={() => setBrowseModal({ isOpen: true, type: 'non-covered' })}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-red-300"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative space-y-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                        <Search className="h-7 w-7 text-white" />
                      </div>
                      
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-red-700 transition-colors">Non-Covered Codes</h4>
                        <p className="text-sm text-slate-600 mt-1">Codes not covered by Saudi health insurance</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-red-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Explore <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Section */}
        {query && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Search Bar */}
            <SearchBar 
              value={query} 
              onChange={setQuery}
              placeholder="Try 'Diabetes', 'Panadol', or 'E11'..."
              autoFocus={true}
            />

            {/* Browse by Category */}
            {!query && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                onClick={() => setBrowseModal({ isOpen: true, type: 'drugs' })}
                className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold gap-2 h-12"
              >
                <Pill className="h-5 w-5" />
                Browse Drugs
              </Button>
              <Button
                onClick={() => setBrowseModal({ isOpen: true, type: 'conditions' })}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold gap-2 h-12"
              >
                <Activity className="h-5 w-5" />
                Browse Conditions
              </Button>
              <Button
                onClick={() => setBrowseModal({ isOpen: true, type: 'codes' })}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold gap-2 h-12"
              >
                <Database className="h-5 w-5" />
                Browse Codes
              </Button>
              <Button
                onClick={() => setBrowseModal({ isOpen: true, type: 'non-covered' })}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold gap-2 h-12"
              >
                <Search className="h-5 w-5" />
                Non-Covered Codes
              </Button>
            </div>
            )}

            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 font-medium">
                Found <span className="font-bold text-slate-900">{filteredData.length}</span> results
              </p>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="aggregated" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">Aggregated</span>
                  </TabsTrigger>
                  <TabsTrigger value="detailed" className="gap-2">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Detailed</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Results Display */}
            {filteredData.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">No results found for "{query}"</p>
              </div>
            ) : viewMode === "aggregated" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedData.map((item, idx) => (
                  <MemoizedResultCard key={`${item.tradeNames?.[0]}-${idx}`} data={item} treeData={treeData} />
                ))}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trade Name / Scientific Name</TableHead>
                      <TableHead>Indication</TableHead>
                      <TableHead>ICD-10 Codes</TableHead>
                      <TableHead>Coverage Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item, idx) => (
                      <MemoizedDetailedRow key={`${item.tradeNames?.[0]}-${idx}`} data={item} treeData={treeData} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <PaginationControls 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 text-sky-600 animate-spin mx-auto" />
              <p className="text-slate-600 font-medium">Loading medical database...</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50 py-4">
        <div className="container text-center text-xs text-slate-600 font-medium">
          © 2026 Pharmacist Islam Mostafa Eid
        </div>
      </footer>

      {/* Browse Modal */}
      {browseModal.isOpen && (
        <BrowseModal 
          isOpen={browseModal.isOpen}
          type={browseModal.type}
          onClose={() => setBrowseModal({ isOpen: false, type: 'drugs' })}
          data={mainData}
          nonCoveredData={nonCoveredData}
          treeData={treeData}
        />
      )}
    </div>
  );
}
