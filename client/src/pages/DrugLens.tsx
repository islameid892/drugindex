import React, { useState, useMemo } from 'react';
import { 
  Search, Beaker, MessageCircle, Scan, ArrowLeft, Loader2, ExternalLink, Image, 
  ChevronDown, X, AlertCircle, CheckCircle, Heart, Share2, Pill
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/contexts/FavoritesContext';

const DrugLens = () => {
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState('Google-style');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrugId, setSelectedDrugId] = useState<number | null>(null);
  const [showSimilar, setShowSimilar] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [tradeNameFilter, setTradeNameFilter] = useState('');
  const [scientificNameFilter, setScientificNameFilter] = useState('');
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  const filters = [
    { id: 'trade', label: 'Trade Name', icon: '💊' },
    { id: 'scientific', label: 'Scientific Name', icon: '🧪' },
    { id: 'google', label: 'Google-style', icon: '🔍' }
  ];

  // TRPC search query
  const { data: searchData, isLoading } = trpc.drugLens.search.useQuery(
    {
      query: searchQuery,
      filterBy: activeFilter === 'Trade Name' ? 'trade' : activeFilter === 'Scientific Name' ? 'scientific' : 'both',
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

  const openGoogleImage = (drugName: string) => {
    const query = encodeURIComponent(drugName + ' drug medication');
    window.open(`https://www.google.com/search?q=${query}&tbm=isch`, '_blank');
  };

  // Format price - remove any SAR prefix if present
  const formatPrice = (price: string | null | undefined) => {
    if (!price) return null;
    return price.replace(/^SAR\s*/i, '').trim();
  };

  const isFavoriteDrug = selectedDrugId && favorites.some(f => f.id === String(selectedDrugId));

  // Skeleton Loader Component
  const SkeletonCard = () => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse">
      <div className="space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="h-6 bg-slate-200 rounded w-3/4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        <div className="flex gap-2 pt-2">
          <div className="h-10 bg-slate-200 rounded flex-1"></div>
          <div className="h-10 bg-slate-200 rounded flex-1"></div>
        </div>
      </div>
    </div>
  );

  // Detail view
  if (selectedDrugId !== null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
        {/* Detail Header */}
        <header className="bg-gradient-to-r from-blue-600 to-blue-700 pt-6 pb-8 px-4 shadow-lg text-white">
          <div className="flex justify-between items-center mb-4 max-w-4xl mx-auto">
            <button
              onClick={handleGoBack}
              className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold tracking-tight">Drug Details</h1>
            <div className="w-9"></div>
          </div>
        </header>

        <div className="p-4 max-w-4xl mx-auto">
          {detailLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          )}

          {!detailLoading && selectedDrug && (
            <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
              {/* Title + Google Image Button + Favorite */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-slate-900">
                    {selectedDrug.tradeName || selectedDrug.scientificName}
                  </h2>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      if (isFavoriteDrug) {
                        removeFavorite(String(selectedDrugId));
                      } else if (selectedDrug) {
                        addFavorite({
                          id: String(selectedDrugId),
                          scientific_name: selectedDrug.scientificName || '',
                          trade_name: selectedDrug.tradeName || '',
                          indication: '',
                          icd10_codes: '',
                          atc_codes: '',
                          addedAt: Date.now()
                        });
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                      isFavoriteDrug
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={isFavoriteDrug ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-4 h-4 ${isFavoriteDrug ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => openGoogleImage(selectedDrug.tradeName || selectedDrug.scientificName || '')}
                    className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                    title="Search drug image on Google"
                  >
                    <Image className="w-4 h-4" />
                    <span>Image</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Scientific Name */}
              {selectedDrug.scientificName && (
                <p className="text-sm text-slate-600 flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                  <Beaker className="w-4 h-4 text-blue-600" />
                  {selectedDrug.scientificName}
                </p>
              )}

              {/* Price */}
              {formatPrice(selectedDrug.price) && (
                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 inline-block">
                  <p className="text-xs text-slate-600 mb-1 font-semibold">Price (SAR)</p>
                  <p className="text-3xl font-black text-slate-900">
                    {formatPrice(selectedDrug.price)} <span className="text-sm font-semibold text-slate-600">SAR</span>
                  </p>
                </div>
              )}

              {/* Black Box Warning */}
              {selectedDrug.blackBoxWarning && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-red-900 mb-1">⚠️ Black Box Warning</h3>
                    <p className="text-red-800 text-sm whitespace-pre-line">{selectedDrug.blackBoxWarning}</p>
                  </div>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {selectedDrug.uses && (
                  <div className="md:col-span-2">
                    <h3 className="font-bold text-slate-900 mb-2 text-base flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Uses
                    </h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.uses}</p>
                  </div>
                )}

                {selectedDrug.pharmacologicalAction && (
                  <div className="md:col-span-2">
                    <h3 className="font-bold text-slate-900 mb-2 text-base flex items-center gap-2">
                      <Beaker className="w-5 h-5 text-blue-600" />
                      Pharmacological Action
                    </h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.pharmacologicalAction}</p>
                  </div>
                )}

                {selectedDrug.standardDose && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2 text-base flex items-center gap-2">
                      <Pill className="w-5 h-5 text-purple-600" />
                      Standard Dose
                    </h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.standardDose}</p>
                  </div>
                )}

                {selectedDrug.adjustedDose && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2 text-base">Adjusted Dose (Renal/Hepatic)</h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.adjustedDose}</p>
                  </div>
                )}

                {selectedDrug.neonatalDose && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2 text-base">Neonatal Dose</h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.neonatalDose}</p>
                  </div>
                )}

                {selectedDrug.pregnancyCategory && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2 text-base">Pregnancy Category</h3>
                    <span className="inline-block bg-yellow-100 text-yellow-800 font-bold px-3 py-1 rounded-lg text-sm">
                      Category {selectedDrug.pregnancyCategory}
                    </span>
                  </div>
                )}
              </div>

              {/* Interactions */}
              <div className="space-y-4 mb-6">
                {selectedDrug.contraindicatedInteractions && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <h3 className="font-bold text-red-700 mb-2 text-base flex items-center gap-2">
                      🚫 Contraindicated Interactions
                    </h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.contraindicatedInteractions}</p>
                  </div>
                )}

                {selectedDrug.majorInteractions && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                    <h3 className="font-bold text-orange-700 mb-2 text-base flex items-center gap-2">
                      ⚠️ Major Interactions
                    </h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.majorInteractions}</p>
                  </div>
                )}

                {selectedDrug.moderateInteractions && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <h3 className="font-bold text-yellow-700 mb-2 text-base flex items-center gap-2">
                      ⚡ Moderate Interactions
                    </h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.moderateInteractions}</p>
                  </div>
                )}
              </div>

              {selectedDrug.doseSource && (
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="font-bold text-slate-500 mb-1 text-xs uppercase tracking-wide">Sources</h3>
                  <p className="text-slate-500 text-xs whitespace-pre-line">{selectedDrug.doseSource}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3 flex-col sm:flex-row">
                <button
                  onClick={() => setShowSimilar(!showSimilar)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
                    showSimilar
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {showSimilar ? 'Hide Similar' : 'View Similar Drugs'}
                </button>
                <button
                  onClick={handleGoBack}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                >
                  Back to Results
                </button>
              </div>
            </div>
          )}

          {/* Similar Drugs Section */}
          {showSimilar && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Pill className="w-5 h-5 text-blue-600" />
                Similar Drugs (Same Active Ingredient)
              </h3>
              {similarLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              )}
              {!similarLoading && (!similarDrugs || similarDrugs.length === 0) && (
                <p className="text-slate-500 text-center py-8 bg-white rounded-xl border border-slate-100">
                  No similar drugs found with the same active ingredient
                </p>
              )}
              {!similarLoading && similarDrugs && similarDrugs.length > 0 && (
                <div className="space-y-3">
                  {similarDrugs.map((drug: any) => (
                    <button
                      key={drug.id}
                      onClick={() => handleDrugClick(drug.id)}
                      className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:border-blue-400 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {drug.tradeName || drug.scientificName}
                          </h4>
                          {drug.scientificName && (
                            <p className="text-xs text-slate-500 mt-0.5">{drug.scientificName}</p>
                          )}
                        </div>
                        {formatPrice(drug.price) && (
                          <p className="font-bold text-slate-900 ml-4 text-sm flex-shrink-0">
                            {formatPrice(drug.price)} <span className="text-xs text-slate-500">SAR</span>
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main search view
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">

      {/* Header & Search */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 pt-6 pb-8 px-4 shadow-lg text-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Drug Intelligence</h1>
                <p className="text-blue-100 text-xs font-medium">Instantly search & compare medications</p>
              </div>
            </div>
            <span className="text-[10px] bg-blue-500 px-3 py-1 rounded-full font-bold uppercase">v3.0</span>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-blue-200" />
            </div>
            <input
              type="text"
              className="w-full bg-white text-slate-900 rounded-xl py-4 pl-12 pr-12 focus:outline-none focus:ring-4 focus:ring-blue-400/30 transition-all shadow-lg placeholder:text-slate-400 text-base"
              placeholder={activeFilter === 'Google-style' ? 'Search drugs, codes, or conditions...' : `Search by ${activeFilter}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <div className="absolute inset-y-0 right-4 flex items-center">
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
                <Scan className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-center gap-2 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.label)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeFilter === f.label
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Advanced Filters Toggle */}
          {searchQuery.trim() && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="mt-3 w-full flex items-center justify-between px-4 py-2 bg-slate-50 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>Advanced Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Advanced Filters */}
          {showFilters && searchQuery.trim() && (
            <div className="mt-3 p-4 bg-slate-50 rounded-lg space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Trade Name</label>
                <input
                  type="text"
                  placeholder="Filter by trade name..."
                  value={tradeNameFilter}
                  onChange={(e) => setTradeNameFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Scientific Name</label>
                <input
                  type="text"
                  placeholder="Filter by scientific name..."
                  value={scientificNameFilter}
                  onChange={(e) => setScientificNameFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {(tradeNameFilter || scientificNameFilter) && (
                <button
                  onClick={() => {
                    setTradeNameFilter('');
                    setScientificNameFilter('');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="p-6 max-w-4xl mx-auto">
        {isLoading && searchQuery.trim() && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!isLoading && searchQuery.trim() && filteredResults.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-600 text-lg font-medium">No results found</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}

        {!isLoading && filteredResults.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600 font-medium">
                Found <span className="font-bold text-slate-900">{filteredResults.length}</span> result{filteredResults.length !== 1 ? 's' : ''}
              </p>
              {(tradeNameFilter || scientificNameFilter) && (
                <span className="text-xs text-slate-500">Filtered results</span>
              )}
            </div>
            <div className="space-y-4">
              {filteredResults.map((drug: any) => (
                <div
                  key={drug.id}
                  className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                          {activeFilter}
                        </span>
                        {formatPrice(drug.price) && (
                          <span className="text-sm font-bold text-slate-900">
                            {formatPrice(drug.price)} SAR
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {drug.tradeName || drug.scientificName || 'Unknown'}
                      </h3>
                      {drug.scientificName && drug.tradeName && (
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <Beaker className="w-3 h-3" /> {drug.scientificName}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => openGoogleImage(drug.tradeName || drug.scientificName || '')}
                      className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors flex-shrink-0 ml-2"
                      title="Search image on Google"
                    >
                      <Image className="w-3 h-3" />
                      Image
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewSimilar(drug.id)}
                      className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                      View Similar
                    </button>
                    <button
                      onClick={() => handleDrugClick(drug.id)}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors"
                    >
                      Full Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!searchQuery.trim() && (
          <div className="text-center py-16">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-slate-700 text-lg font-medium">Start searching for drugs</p>
            <p className="text-slate-500 text-sm mt-2">Enter a drug name, scientific name, or condition to get started</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default DrugLens;
