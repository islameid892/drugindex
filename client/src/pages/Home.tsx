import { useState, useEffect } from "react";
import BrowseModal from "@/components/BrowseModal";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import Footer from "@/components/Footer";
import InfographicsSection from "@/components/InfographicsSection";
import { useHomeSearch } from "@/hooks/useHomeSearch";
import { useHomeStats } from "@/hooks/useHomeStats";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoryBrowseCards } from "@/components/home/CategoryBrowseCards";
import { SearchResultsSection } from "@/components/home/SearchResultsSection";
import { BulkVerificationModal } from "@/components/home/BulkVerificationModal";
import { StickySearchBar } from "@/components/home/StickySearchBar";
import { BarChart3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [browseModal, setBrowseModal] = useState<{ isOpen: boolean; type: 'drugs' | 'conditions' | 'codes' | 'non-covered' }>({ isOpen: false, type: 'drugs' });
  const [showBulkVerification, setShowBulkVerification] = useState(false);

  const search = useHomeSearch();
  const { stats, loading, isStale } = useHomeStats();

  // Set page title for SEO
  useEffect(() => {
    document.title = "ICD-10 Search Engine - Drug & Medical Coding";
  }, []);

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
      {/* Header */}
      <HomeHeader 
        stats={stats} 
        isStale={isStale}
      />

      <main className="flex-1 container py-12 space-y-12">
        {/* Hero Section */}
        {!search.query && !loading && (
          <HeroSection
            query={search.query}
            onQueryChange={search.setQuery}
            showSuggestions={search.showSuggestions}
            onSuggestionsOpen={search.setShowSuggestions}
            onSuggestionSelect={search.handleSuggestionSelect}
            recentSearches={search.recentSearches}
            trendingSearches={search.trendingSearches}
          >
            <CategoryBrowseCards
              onBrowseDrugs={() => setBrowseModal({ isOpen: true, type: 'drugs' })}
              onBrowseConditions={() => setBrowseModal({ isOpen: true, type: 'conditions' })}
              onBrowseCodes={() => setBrowseModal({ isOpen: true, type: 'codes' })}
              onBulkVerify={() => setShowBulkVerification(true)}
              onBrowseNonCovered={() => setBrowseModal({ isOpen: true, type: 'non-covered' })}
            />
          </HeroSection>
        )}

        {/* Search Bar Sticky when showing results */}
        {search.query && (
          <StickySearchBar
            query={search.query}
            onQueryChange={search.setQuery}
            showSuggestions={search.showSuggestions}
            onSuggestionsOpen={search.setShowSuggestions}
            onSuggestionSelect={search.handleSuggestionSelect}
            recentSearches={search.recentSearches}
            trendingSearches={search.trendingSearches}
          />
        )}

        {/* Infographics Section */}
        {!search.query && !loading && (
          <InfographicsSection />
        )}

        {/* Search Results */}
        {search.query && (
          <SearchResultsSection
            query={search.query}
            searchLoading={search.searchLoading}
            groupedResults={search.groupedResults}
            paginatedResults={search.paginatedResults}
            currentPage={search.currentPage}
            totalPages={search.totalPages}
            onPageChange={search.setCurrentPage}
          />
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
      <BulkVerificationModal 
        isOpen={showBulkVerification}
        onClose={() => setShowBulkVerification(false)}
      />
    </div>
  );
}
