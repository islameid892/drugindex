import { useState, useMemo } from 'react';
import { 
  Search, Beaker, MessageCircle, Scan, ArrowLeft, Loader2, ExternalLink, Image, 
  ChevronDown, X, AlertCircle, CheckCircle, Heart, Share2, Pill, Sparkles, TrendingUp
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/contexts/FavoritesContext';

const DrugLens = () => {
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState('both');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrugId, setSelectedDrugId] = useState<number | null>(null);
  const [showSimilar, setShowSimilar] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [tradeNameFilter, setTradeNameFilter] = useState('');
  const [scientificNameFilter, setScientificNameFilter] = useState('');
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  const filters = [
    { id: 'both', label: 'All', icon: '🔍' },
    { id: 'trade', label: 'Trade Name', icon: '💊' },
    { id: 'scientific', label: 'Scientific', icon: '🧪' }
  ];

  // TRPC search query
  const { data: searchData, isLoading } = trpc.drugLens.search.useQuery(
    {
      query: searchQuery,
      filterBy: activeFilter as 'both' | 'trade' | 'scientific',
      page: 1,
      limit: 20,
    },
    {
      enabled: searchQuery.trim().length > 0,
      staleTime: 30000,
    }
  );

  // Fetch full drug details when a drug is selected
  const { data: selectedDrug, isLoading: detailLoading } = trpc.drugLens.getById.useQuery(
    { id: selectedDrugId! },
    {
      enabled: selectedDrugId !== null,
      staleTime: 60000,
    }
  );

  // Fetch similar drugs (same scientific name)
  const { data: similarDrugs, isLoading: similarLoading } = trpc.drugLens.getAlternatives.useQuery(
    {
      scientificName: selectedDrug?.scientificName || '',
      excludeId: selectedDrugId!,
    },
    {
      enabled: showSimilar && selectedDrugId !== null && !!selectedDrug?.scientificName,
      staleTime: 60000,
    }
  );

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim() || !searchData) return [];
    let results = searchData.results || [];
    
    // Apply additional filters
    if (tradeNameFilter.trim()) {
      results = results.filter((d: any) => 
        (d.tradeName || '').toLowerCase().includes(tradeNameFilter.toLowerCase())
      );
    }
    if (scientificNameFilter.trim()) {
      results = results.filter((d: any) => 
        (d.scientificName || '').toLowerCase().includes(scientificNameFilter.toLowerCase())
      );
    }
    
    return results;
  }, [searchData, searchQuery, tradeNameFilter, scientificNameFilter]);

  const handleDrugClick = (drugId: number) => {
    setSelectedDrugId(drugId);
    setShowSimilar(false);
  };

  const handleViewSimilar = (drugId: number) => {
    setSelectedDrugId(drugId);
    setShowSimilar(true);
  };

  const handleGoBack = () => {
    if (selectedDrugId !== null) {
      setSelectedDrugId(null);
      setShowSimilar(false);
    } else {
      setLocation('/');
    }
  };

  // Show detail view if drug is selected
  if (selectedDrugId !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        {/* Header */}
        <div className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-200/50">
          <div className="container mx-auto px-4 py-4">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8">
          {detailLoading ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : selectedDrug ? (
            <div className="space-y-8">
              {/* Drug Header Card */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">
                      {selectedDrug.tradeName}
                    </h1>
                    <p className="text-lg text-slate-600">
                      {selectedDrug.scientificName}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (isFavorite(selectedDrug.id)) {
                        removeFavorite(selectedDrug.id);
                      } else {
                        addFavorite(selectedDrug);
                      }
                    }}
                    className="p-3 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    <Heart
                      className={`w-6 h-6 ${
                        isFavorite(selectedDrug.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-slate-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Key Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedDrug.price && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                      <p className="text-sm text-blue-600 font-semibold mb-1">Price</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {selectedDrug.price} SAR
                      </p>
                    </div>
                  )}
                  {selectedDrug.dosage && (
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4">
                      <p className="text-sm text-emerald-600 font-semibold mb-1">Dosage</p>
                      <p className="text-lg font-bold text-emerald-900">
                        {selectedDrug.dosage}
                      </p>
                    </div>
                  )}
                  {selectedDrug.form && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                      <p className="text-sm text-purple-600 font-semibold mb-1">Form</p>
                      <p className="text-lg font-bold text-purple-900">
                        {selectedDrug.form}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Details Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Indications */}
                {selectedDrug.indications && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      Indications
                    </h2>
                    <p className="text-slate-700 leading-relaxed">
                      {selectedDrug.indications}
                    </p>
                  </div>
                )}

                {/* Warnings */}
                {selectedDrug.warnings && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-amber-100">
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      Warnings
                    </h2>
                    <p className="text-slate-700 leading-relaxed">
                      {selectedDrug.warnings}
                    </p>
                  </div>
                )}

                {/* Side Effects */}
                {selectedDrug.sideEffects && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">
                      Side Effects
                    </h2>
                    <p className="text-slate-700 leading-relaxed">
                      {selectedDrug.sideEffects}
                    </p>
                  </div>
                )}

                {/* Interactions */}
                {selectedDrug.interactions && (
                  <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">
                      Drug Interactions
                    </h2>
                    <p className="text-slate-700 leading-relaxed">
                      {selectedDrug.interactions}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 flex-wrap">
                <Button
                  onClick={() => setShowSimilar(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg font-semibold transition-all"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Similar Drugs
                </Button>
                {selectedDrug.externalLink && (
                  <a
                    href={selectedDrug.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    More Info
                  </a>
                )}
              </div>

              {/* Similar Drugs */}
              {showSimilar && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    Similar Medications
                  </h2>
                  {similarLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                  ) : similarDrugs && similarDrugs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {similarDrugs.map((drug: any) => (
                        <DrugCard
                          key={drug.id}
                          drug={drug}
                          onSelect={handleDrugClick}
                          isFav={isFavorite(drug.id)}
                          onFavorite={() => {
                            if (isFavorite(drug.id)) {
                              removeFavorite(drug.id);
                            } else {
                              addFavorite(drug);
                            }
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-600 text-center py-8">
                      No similar medications found
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-600 text-center py-8">Drug not found</p>
          )}
        </div>
      </div>
    );
  }

  // Main Search View
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white pt-12 pb-20">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Logo and Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">DrugLens</h1>
              <p className="text-blue-100 text-sm">Intelligent Drug Reference</p>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-xl text-blue-50 mb-8 max-w-2xl">
            Search, compare, and discover comprehensive drug information instantly
          </p>

          {/* Search Bar */}
          <div className="relative max-w-2xl">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Search by drug name, scientific name, or indication..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/95 backdrop-blur-md border border-white/30 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all shadow-lg"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 mt-6 flex-wrap">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 rounded-full font-semibold transition-all ${
                  activeFilter === filter.id
                    ? 'bg-white text-blue-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                }`}
              >
                {filter.icon} {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="container mx-auto px-4 py-12">
        {searchQuery.trim() ? (
          <>
            {/* Results Count */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    Searching...
                  </span>
                ) : (
                  <span>
                    Found <span className="text-blue-600">{filteredResults.length}</span> results
                  </span>
                )}
              </h2>
            </div>

            {/* Results Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-white rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : filteredResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResults.map((drug: any) => (
                  <DrugCard
                    key={drug.id}
                    drug={drug}
                    onSelect={handleDrugClick}
                    isFav={isFavorite(drug.id)}
                    onFavorite={() => {
                      if (isFavorite(drug.id)) {
                        removeFavorite(drug.id);
                      } else {
                        addFavorite(drug);
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Pill className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-xl text-slate-600">No drugs found</p>
                <p className="text-slate-500">Try a different search term</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <p className="text-xl text-slate-600">Start searching to discover drugs</p>
            <p className="text-slate-500">Enter a drug name or indication above</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Drug Card Component
const DrugCard = ({ drug, onSelect, isFav, onFavorite }: any) => {
  return (
    <div
      onClick={() => onSelect(drug.id)}
      className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-slate-100 hover:border-blue-300"
    >
      {/* Card Header with Gradient */}
      <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500 group-hover:to-blue-600 transition-all"></div>

      <div className="p-6">
        {/* Trade Name */}
        <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {drug.tradeName}
        </h3>

        {/* Scientific Name */}
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {drug.scientificName}
        </p>

        {/* Info Grid */}
        <div className="space-y-3 mb-4">
          {drug.price && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Price</span>
              <span className="text-sm font-bold text-blue-600">{drug.price} SAR</span>
            </div>
          )}
          {drug.dosage && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Dosage</span>
              <span className="text-sm font-semibold text-slate-900">{drug.dosage}</span>
            </div>
          )}
          {drug.form && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Form</span>
              <span className="text-sm font-semibold text-slate-900">{drug.form}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 my-4"></div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors font-medium text-sm"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
            {isFav ? 'Saved' : 'Save'}
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-colors font-medium text-sm group-hover:bg-blue-100"
          >
            <ChevronDown className="w-4 h-4" />
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrugLens;
