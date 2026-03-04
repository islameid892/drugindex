import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { SearchBar } from "@/components/SearchBar";
import { SearchSuggestions } from "@/components/SearchSuggestions";
import { SearchResultCard } from "@/components/SearchResultCard";
import BrowseModal from "@/components/BrowseModal";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { BulkVerification } from "@/components/BulkVerification";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, Pill, Activity, Database, Search, Sparkles, ChevronRight, ChevronLeft, Heart, BarChart3, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Link } from "wouter";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import InfographicsSection from "@/components/InfographicsSection";
import { trpc } from '@/lib/trpc';

// Helper function to load data with compression support
const loadDataWithCompression = async (url: string): Promise<any> => {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn(`Failed to load uncompressed data from ${url}:`, error);
  }
  
  try {
    const compressedUrl = url.endsWith('.json') ? url + '.gz' : url;
    const response = await fetch(compressedUrl);
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    
    try {
      // Use native DecompressionStream API (supported in all modern browsers)
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(new Uint8Array(arrayBuffer));
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      const text = new TextDecoder().decode(result);
      return JSON.parse(text);
    } catch (decompressError) {
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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [viewMode, setViewMode] = useState<"aggregated" | "detailed">("aggregated");
  const [browseModal, setBrowseModal] = useState<{ isOpen: boolean; type: 'drugs' | 'conditions' | 'codes' | 'non-covered' }>({ isOpen: false, type: 'drugs' });
  const [currentPage, setCurrentPage] = useState(1);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showBulkVerification, setShowBulkVerification] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(['Panadol', 'Diabetes', 'Hypertension', 'Aspirin', 'Ibuprofen']);
  const [trendingSearches] = useState<string[]>(['Panadol', 'Diabetes', 'Hypertension', 'Aspirin', 'E11', 'Metformin', 'Lisinopril']);
  const { favorites } = useFavorites();
  const { user, isAuthenticated, logout } = useAuth();

  // Debounce query for API calls
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Load stats from API
  const statsQuery = trpc.data.stats.useQuery(undefined, { staleTime: 60000 });
  const stats = {
    medications: statsQuery.data?.totalDrugEntries ?? 0,
    conditions: statsQuery.data?.uniqueIndications ?? 0,
    codes: (statsQuery.data?.totalCodes ?? 0) + (statsQuery.data?.totalBranches ?? 0),
  };

  // Grouped search from API (server-side) - groups results by scientific name
  const searchQuery = trpc.data.searchGrouped.useQuery(
    { query: debouncedQuery, limit: 30 },
    { enabled: debouncedQuery.trim().length >= 1, staleTime: 30000 }
  );

  const loading = statsQuery.isLoading && !statsQuery.data;
  const searchLoading = searchQuery.isFetching;

  // Set page title for SEO
  useEffect(() => {
    document.title = "ICD-10 Search Engine - Drug & Medical Coding";
  }, []);

  // Track search mutation
  const trackSearchMutation = trpc.analytics.trackSearch.useMutation();
  const lastTrackedQuery = useRef('');

  // Reset page when query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  // Use API search results directly
  const groupedResults = searchQuery.data ?? [];

  // Paginate results
  const ITEMS_PER_PAGE = 10;
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return groupedResults.slice(startIndex, endIndex);
  }, [groupedResults, currentPage]);

  const totalPages = Math.ceil(groupedResults.length / ITEMS_PER_PAGE);

  // Track search when user stops typing (debounced)
  useEffect(() => {
    if (!query || query.trim().length < 2) return;
    if (query === lastTrackedQuery.current) return;

    const timer = setTimeout(() => {
      lastTrackedQuery.current = query;
      trackSearchMutation.mutate({
        query: query.trim(),
        resultCount: groupedResults.length,
        responseTime: 0,
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [query, groupedResults.length]);

  if (showDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-sky-50/30 dark:to-sky-950/10 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
          <div className="container py-3 sm:py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-2.5 rounded-lg shadow-lg flex-shrink-0">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">Analytics</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">Performance & Insights</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDashboard(false)}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Search</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 container py-8">
          <AnalyticsDashboard />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-sky-50/30 dark:to-sky-950/10 flex flex-col font-sans">
      {/* Header Section */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="container py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="bg-gradient-to-br from-sky-500 to-sky-600 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-lg shadow-sky-500/40 flex-shrink-0 hover:shadow-xl hover:shadow-sky-500/50 transition-all duration-300">
                <Stethoscope className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="flex-1 sm:flex-none">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight leading-tight">ICD-10 Search Engine</h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Drug Reference & Medical Coding</p>
                <p className="text-xs mt-0.5 sm:mt-1 font-semibold bg-gradient-to-r from-sky-600 via-emerald-600 to-sky-600 bg-clip-text text-transparent">Created By Pharmacist: Islam Mostafa Eid</p>
              </div>
            </div>
            
            {/* Desktop Stats and Favorites */}
            <div className="flex items-center gap-3 text-xs font-medium text-foreground hidden md:flex">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950">
                <Pill className="h-4 w-4 text-sky-600" />
                <span className="font-semibold text-sky-900 dark:text-sky-100">{stats.medications.toLocaleString()}</span>
                <span className="text-sky-700 dark:text-sky-300">Meds</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                <Activity className="h-4 w-4 text-emerald-600" />
                <span className="font-semibold text-emerald-900 dark:text-emerald-100">{stats.conditions.toLocaleString()}</span>
                <span className="text-emerald-700 dark:text-emerald-300">Conditions</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950">
                <Database className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-purple-900 dark:text-purple-100">{stats.codes.toLocaleString()}</span>
                <span className="text-purple-700 dark:text-purple-300">Codes</span>
              </div>
              <div className="w-px h-6 bg-border" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDashboard(true)}
                className="gap-2 border-sky-300 text-sky-600 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-400 dark:hover:bg-sky-950"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
              <Link href="/favorites">
                <Button variant="outline" size="sm" className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950">
                  <Heart className="h-4 w-4" />
                  <span className="font-semibold">{favorites.length}</span>
                </Button>
              </Link>
              {isAuthenticated && user ? (
                <>
                  {user.role === 'admin' && (
                    <Link href="/admin">
                      <Button variant="outline" size="sm" className="gap-2 border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950">
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" size="sm" onClick={() => logout()} className="gap-2">
                    Logout
                  </Button>
                </>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="sm" className="gap-2 bg-sky-600 hover:bg-sky-700 text-white">
                    Login
                  </Button>
                </a>
              )}
            </div>

            {/* Mobile Stats and Favorites */}
            <div className="flex items-center gap-2 text-xs font-medium text-foreground sm:hidden">
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950">
                <Pill className="h-3 w-3 text-sky-600" />
                <span className="font-semibold text-sky-900 dark:text-sky-100 text-xs">{stats.medications}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950">
                <Activity className="h-3 w-3 text-emerald-600" />
                <span className="font-semibold text-emerald-900 dark:text-emerald-100 text-xs">{stats.conditions}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950">
                <Database className="h-3 w-3 text-purple-600" />
                <span className="font-semibold text-purple-900 dark:text-purple-100 text-xs">{stats.codes}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDashboard(true)}
                className="gap-1 border-sky-300 text-sky-600 hover:bg-sky-50 dark:border-sky-700 dark:text-sky-400 dark:hover:bg-sky-950 h-8 px-2"
              >
                <BarChart3 className="h-3 w-3" />
              </Button>
              <Link href="/favorites">
                <Button variant="outline" size="sm" className="gap-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950 h-8 px-2">
                  <Heart className="h-3 w-3" />
                  <span className="font-semibold text-xs">{favorites.length}</span>
                </Button>
              </Link>
              {isAuthenticated && user ? (
                <>
                  {user.role === 'admin' && (
                    <Link href="/admin">
                      <Button variant="outline" size="sm" className="gap-1 border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950 h-8 px-2">
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" size="sm" onClick={() => logout()} className="gap-1 h-8 px-2">
                    Logout
                  </Button>
                </>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="sm" className="gap-1 bg-sky-600 hover:bg-sky-700 text-white h-8 px-2">
                    Login
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-12 space-y-12">
        {/* Hero Section */}
        {!query && !loading && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-50 via-emerald-50 to-sky-100 dark:from-sky-950 dark:via-emerald-950 dark:to-sky-900 border border-sky-100 dark:border-sky-800 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700" id="hero-section">
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
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 dark:from-black/40 via-transparent to-sky-50/40 dark:to-sky-950/40" />
            
            {/* Content */}
            <div className="relative px-6 py-16 md:px-12 md:py-20 text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur border border-sky-200 dark:border-sky-800 shadow-sm">
                <Sparkles className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">Comprehensive Medical Database</span>
              </div>
              
              <div className="space-y-4">
                <h2 className="font-display text-5xl md:text-6xl text-foreground tracking-tight">
                  Find Codes & Medications
                </h2>
                <p className="font-serif-elegant text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed italic">
                  Search by scientific name, trade name, indication, or ICD-10 code. Get instant access to comprehensive medical coding information.
                </p>
              </div>
              
              {/* Search Bar in Hero */}
              <div className="max-w-2xl mx-auto pt-4 relative">
                <SearchBar 
                  value={query} 
                  onChange={(val) => {
                    setQuery(val);
                    setShowSuggestions(true);
                  }} 
                  placeholder="Try 'Diabetes', 'Panadol', or 'E11'..."
                  autoFocus={false}
                />
                <SearchSuggestions
                  query={query}
                  isOpen={showSuggestions && !query.trim()}
                  onSelect={(suggestion) => {
                    setQuery(suggestion);
                    setShowSuggestions(false);
                    if (!recentSearches.includes(suggestion)) {
                      setRecentSearches([suggestion, ...recentSearches.slice(0, 4)]);
                    }
                  }}
                  onClose={() => setShowSuggestions(false)}
                  recentSearches={recentSearches}
                  trendingSearches={trendingSearches}
                />
              </div>
              
              {/* Browse by Category */}
              <div className="mt-12 pt-8 border-t border-sky-200 dark:border-sky-800">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-foreground mb-2">Browse by Category</h3>
                  <p className="text-muted-foreground">Quick access to drugs, conditions, and codes</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 max-w-6xl mx-auto">
                  {/* Search Drugs Card */}
                  <button
                    onClick={() => setBrowseModal({ isOpen: true, type: 'drugs' })}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950 dark:to-sky-900 border border-sky-200 dark:border-sky-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-sky-300 dark:hover:border-sky-700"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative space-y-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                        <Pill className="h-7 w-7 text-white" />
                      </div>
                      
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-foreground group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">Search Drugs</h4>
                        <p className="text-sm text-muted-foreground mt-1">Browse all medications alphabetically</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Explore <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                  
                  {/* Find Conditions Card */}
                  <button
                    onClick={() => setBrowseModal({ isOpen: true, type: 'conditions' })}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border border-emerald-200 dark:border-emerald-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-emerald-300 dark:hover:border-emerald-700"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative space-y-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                        <Activity className="h-7 w-7 text-white" />
                      </div>
                      
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">Find Conditions</h4>
                        <p className="text-sm text-muted-foreground mt-1">Discover medical conditions and diagnoses</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Explore <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                  
                  {/* Browse Codes Card */}
                  <button
                    onClick={() => setBrowseModal({ isOpen: true, type: 'codes' })}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border border-purple-200 dark:border-purple-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-purple-300 dark:hover:border-purple-700"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative space-y-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                        <Database className="h-7 w-7 text-white" />
                      </div>
                      
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-foreground group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">Browse Codes</h4>
                        <p className="text-sm text-muted-foreground mt-1">View all ICD-10 AM codes and classifications</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Explore <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>

                  {/* Bulk Verification Card */}
                  <button
                    onClick={() => setShowBulkVerification(true)}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border border-orange-200 dark:border-orange-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-orange-300 dark:hover:border-orange-700"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative space-y-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                        <Upload className="h-7 w-7 text-white" />
                      </div>
                      
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-foreground group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors">Bulk Verify</h4>
                        <p className="text-sm text-muted-foreground mt-1">Check multiple codes at once</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Verify <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>

                  {/* Non-Covered Codes Card */}
                  <button
                    onClick={() => setBrowseModal({ isOpen: true, type: 'non-covered' })}
                    className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border border-red-200 dark:border-red-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-red-300 dark:hover:border-red-700"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative space-y-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                        <Search className="h-7 w-7 text-white" />
                      </div>
                      
                      <div className="text-left">
                        <h4 className="text-lg font-bold text-foreground group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">Non-Covered Codes</h4>
                        <p className="text-sm text-muted-foreground mt-1">Codes not covered by Saudi health insurance</p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Explore <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar Sticky when showing results */}
        {query && (
          <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="max-w-2xl mx-auto">
              <SearchBar 
                value={query} 
                onChange={(val) => {
                  setQuery(val);
                  setShowSuggestions(true);
                }} 
                placeholder="Try 'Diabetes', 'Panadol', or 'E11'..."
                autoFocus={true}
              />
              <SearchSuggestions
                query={query}
                isOpen={showSuggestions && !query.trim()}
                onSelect={(suggestion) => {
                  setQuery(suggestion);
                  setShowSuggestions(false);
                  if (!recentSearches.includes(suggestion)) {
                    setRecentSearches([suggestion, ...recentSearches.slice(0, 4)]);
                  }
                }}
                onClose={() => setShowSuggestions(false)}
                recentSearches={recentSearches}
                trendingSearches={trendingSearches}
              />
            </div>
          </div>
        )}

        {/* Infographics Section */}
        {!query && !loading && (
          <InfographicsSection />
        )}

        {/* Search Results */}
        {query && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Results Header */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Search Results</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {searchLoading ? (
                    <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...</span>
                  ) : (
                    <>Found <span className="font-semibold text-sky-600 dark:text-sky-400">{groupedResults.length}</span> active ingredients for "<span className="font-semibold">{query}</span>"</>
                  )}
                </p>
              </div>
            </div>

            {/* Results Content */}
            {searchLoading && groupedResults.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              </div>
            ) : paginatedResults.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {paginatedResults.map((item, index) => (
                    <SearchResultCard key={index} data={item} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-6">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
                <p className="text-muted-foreground">Try searching with a different name, code, or diagnosis</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Browse Modal */}
      <BrowseModal
        isOpen={browseModal.isOpen}
        type={browseModal.type}
        onClose={() => setBrowseModal({ ...browseModal, isOpen: false })}
      />

      <Footer />

      {/* Bulk Verification Modal */}
      {showBulkVerification && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Bulk Code Verification</h2>
              <button
                onClick={() => setShowBulkVerification(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                X
              </button>
            </div>
            <div className="p-4">
              <BulkVerification />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
