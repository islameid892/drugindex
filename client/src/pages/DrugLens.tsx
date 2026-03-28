import { useState, useMemo, useEffect } from 'react';
import { 
  Search, ArrowLeft, Loader2, Heart, Pill, ChevronRight,
  AlertCircle, CheckCircle, Zap, Clock, Shield, Grid3x3, List, X, Image as ImageIcon
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { useFavorites } from '@/contexts/FavoritesContext';

const DrugLens = () => {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrugId, setSelectedDrugId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [searchFilterMode, setSearchFilterMode] = useState<'both' | 'trade' | 'scientific'>('both');
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  const { data: searchData, isLoading } = trpc.drugLens.search.useQuery(
    {
      query: searchQuery,
      filterBy: searchFilterMode,
      page: 1,
      limit: 20,
    },
    {
      enabled: searchQuery.trim().length > 0,
      staleTime: 30000,
    }
  );



  const { data: selectedDrug, isLoading: detailLoading } = trpc.drugLens.getById.useQuery(
    { id: selectedDrugId! },
    {
      enabled: selectedDrugId !== null,
      staleTime: 60000,
    }
  );

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim() || !searchData) return [];
    let results = searchData.results || [];
    
    if (categoryFilter.trim()) {
      results = results.filter((d: any) => 
        (d.category || '').toLowerCase().includes(categoryFilter.toLowerCase())
      );
    }
    if (formFilter.trim()) {
      results = results.filter((d: any) => 
        (d.form || '').toLowerCase().includes(formFilter.toLowerCase())
      );
    }
    
    return results;
  }, [searchData, searchQuery, categoryFilter, formFilter]);

  if (selectedDrugId !== null) {
    return (
      <DetailView
        drugId={selectedDrugId || 0}
        drug={selectedDrug}
        isLoading={detailLoading}
        onBack={() => setSelectedDrugId(null)}
        isFav={selectedDrugId ? isFavorite(selectedDrugId.toString()) : false}
        onFavorite={() => {
          if (selectedDrug && selectedDrugId) {
            if (isFavorite(selectedDrugId.toString())) {
              removeFavorite(selectedDrugId.toString());
            } else {
              addFavorite(selectedDrug);
            }
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-40 border-b border-white/10 backdrop-blur-md bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663263105436/a2JMvfTkjxD7rpSD5GgnMY/druglens_logo-nQ7M2Hr2EG4qPVSFFSFL3R.webp" 
              alt="DrugLens Logo" 
              className="w-10 h-10 drop-shadow-lg"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">DrugLens</h1>
              <p className="text-xs text-blue-300">Medical Database</p>
            </div>
          </div>
          <button className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all duration-300 backdrop-blur-sm border border-white/20">
            Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative z-30 max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Find Your<br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Perfect Medication</span>
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Search from 8,141 medications with complete information
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder='Search drugs, dosages, or conditions...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-2xl transition-all duration-300 hover:bg-white/15"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* Search Filter Buttons */}
        <div className="flex gap-3 flex-wrap mb-6">
          <button
            onClick={() => setSearchFilterMode('both')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              searchFilterMode === 'both'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
            }`}
          >
            🔍 Google Style
          </button>
          <button
            onClick={() => setSearchFilterMode('trade')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              searchFilterMode === 'trade'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
            }`}
          >
            💊 Trade Name
          </button>
          <button
            onClick={() => setSearchFilterMode('scientific')}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              searchFilterMode === 'scientific'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30'
                : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
            }`}
          >
            🧪 Scientific Name
          </button>
        </div>

        {/* Additional Filters */}
        {searchQuery.trim() && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-md transition-all"
              >
                <option value="" className="bg-slate-900">All Categories</option>
                <option value="antibiotic" className="bg-slate-900">Antibiotic</option>
                <option value="painkiller" className="bg-slate-900">Painkiller</option>
                <option value="vitamin" className="bg-slate-900">Vitamin</option>
              </select>

              <select
                value={formFilter}
                onChange={(e) => setFormFilter(e.target.value)}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-md transition-all"
              >
                <option value="" className="bg-slate-900">All Forms</option>
                <option value="tablet" className="bg-slate-900">Tablet</option>
                <option value="capsule" className="bg-slate-900">Capsule</option>
                <option value="injection" className="bg-slate-900">Injection</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex gap-2 bg-white/10 rounded-lg p-1 border border-white/20">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 py-1.5 px-3 rounded transition-all text-sm font-medium flex items-center justify-center gap-1 ${
                    viewMode === 'grid'
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 py-1.5 px-3 rounded transition-all text-sm font-medium flex items-center justify-center gap-1 ${
                    viewMode === 'list'
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-400/50'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                  List
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="relative z-20 max-w-6xl mx-auto px-4 pb-20">
        {searchQuery.trim() ? (
          <>
            {/* Results Count */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <span>Found</span>
                    <span className="text-blue-400">{filteredResults.length}</span>
                    <span>results</span>
                  </>
                )}
              </h2>
            </div>

            {/* Grid View */}
            {viewMode === 'grid' && (
              isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-64 bg-white/10 rounded-xl animate-pulse border border-white/10"></div>
                  ))}
                </div>
              ) : filteredResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredResults.map((drug: any) => (
                    <DrugGridCard
                      key={drug.id}
                      drug={drug}
                      onSelect={() => setSelectedDrugId(drug.id)}
                      isFav={isFavorite(drug.id.toString())}
                      onFavorite={() => {
                        if (isFavorite(drug.id.toString())) {
                          removeFavorite(drug.id.toString());
                        } else {
                          addFavorite(drug);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Pill className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-lg text-slate-400">No drugs found</p>
                </div>
              )
            )}

            {/* List View */}
            {viewMode === 'list' && (
              isLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-20 bg-white/10 rounded-lg animate-pulse border border-white/10"></div>
                  ))}
                </div>
              ) : filteredResults.length > 0 ? (
                <div className="space-y-3">
                  {filteredResults.map((drug: any) => (
                    <DrugListCard
                      key={drug.id}
                      drug={drug}
                      onSelect={() => setSelectedDrugId(drug.id)}
                      isFav={isFavorite(drug.id.toString())}
                      onFavorite={() => {
                        if (isFavorite(drug.id.toString())) {
                          removeFavorite(drug.id.toString());
                        } else {
                          addFavorite(drug);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Pill className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-lg text-slate-400">No drugs found</p>
                </div>
              )
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Pill className="w-20 h-20 text-slate-600 mx-auto mb-4" />
            <p className="text-xl text-slate-400">Start searching to discover medications</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Grid Card Component (Google-style)
const DrugGridCard = ({ drug, onSelect, isFav, onFavorite }: any) => {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden hover:border-blue-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 cursor-pointer hover:scale-105 hover:bg-white/15">
      <div className="p-5">
        {/* Trade Name (Main Title) */}
        <h3 className="text-lg font-bold text-white mb-1 line-clamp-2 hover:text-blue-300 transition-colors">
          {drug.tradeName}
        </h3>

        {/* Scientific Name (Subtitle - Google Style) */}
        <p className="text-sm text-slate-400 mb-3">
          {drug.scientificName}
        </p>

        {/* Price */}
        {drug.price && (
          <p className="text-blue-300 font-semibold mb-3">
            {drug.price} SAR
          </p>
        )}

        {/* Divider */}
        <div className="h-px bg-white/10 my-3"></div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            className="flex-1 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all duration-300 border border-white/10 hover:border-white/20 flex items-center justify-center"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
          <button
            onClick={onSelect}
            className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1"
          >
            See Details
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// List Card Component
const DrugListCard = ({ drug, onSelect, isFav, onFavorite }: any) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-4 hover:border-blue-400/50 transition-all duration-300 hover:bg-white/15 cursor-pointer"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0" onClick={onSelect}>
          <h3 className="text-base font-bold text-white truncate hover:text-blue-300 transition-colors">
            {drug.tradeName}
          </h3>
          <p className="text-sm text-slate-400 truncate">
            {drug.scientificName}
          </p>
        </div>

        {/* Price */}
        {drug.price && (
          <div className="text-right">
            <p className="text-blue-300 font-semibold">
              {drug.price} SAR
            </p>
          </div>
        )}

        {/* Actions (Show on hover) */}
        {showActions && (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavorite();
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
            <button
              onClick={onSelect}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center gap-1"
            >
              See Details
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Detail View Component
const DetailView = ({ drugId, drug, isLoading, onBack, isFav, onFavorite }: any) => {
  const handleImageSearch = () => {
    if (drug) {
      const searchQuery = encodeURIComponent(`${drug.tradeName} ${drug.scientificName}`);
      window.open(`https://www.google.com/search?q=${searchQuery}&tbm=isch`, '_blank');
    }
  };

  const handleAlternatives = () => {
    if (drug && drug.scientificName) {
      const searchQuery = encodeURIComponent(drug.scientificName);
      window.open(`${window.location.origin}?search=${searchQuery}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <div className="relative z-40 border-b border-white/10 backdrop-blur-md bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-xl font-bold text-white">Drug Details</h1>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-30 max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : drug ? (
          <div className="space-y-6">
            {/* Main Info Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl">
              {/* Header with Favorite */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-4xl font-bold text-white mb-2">
                    {drug.tradeName}
                  </h2>
                  <p className="text-lg text-slate-300">
                    {drug.scientificName}
                  </p>
                </div>
                <button
                  onClick={onFavorite}
                  className="p-3 rounded-xl hover:bg-white/10 transition-all duration-300"
                >
                  <Heart
                    className={`w-6 h-6 ${
                      isFav
                        ? 'fill-red-500 text-red-500'
                        : 'text-slate-400'
                    }`}
                  />
                </button>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {drug.price && (
                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-400/30">
                    <p className="text-sm text-blue-300 font-semibold mb-1">Price</p>
                    <p className="text-2xl font-bold text-blue-100">
                      {drug.price} SAR
                    </p>
                  </div>
                )}
                {drug.dosage && (
                  <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-4 border border-green-400/30">
                    <p className="text-sm text-green-300 font-semibold mb-1">Dosage</p>
                    <p className="text-lg font-bold text-green-100">
                      {drug.dosage}
                    </p>
                  </div>
                )}
                {drug.form && (
                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-4 border border-purple-400/30">
                    <p className="text-sm text-purple-300 font-semibold mb-1">Form</p>
                    <p className="text-lg font-bold text-purple-100">
                      {drug.form}
                    </p>
                  </div>
                )}
              </div>

              {/* Details Sections */}
              <div className="space-y-4">
                {/* Pharmacological Action */}
                {drug.pharmacologicalAction && (
                  <div className="border-t border-white/10 pt-4">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      Pharmacological Action
                    </h3>
                    <p className="text-slate-300 whitespace-pre-wrap">{drug.pharmacologicalAction}</p>
                  </div>
                )}

                {/* Uses / Indications */}
                {drug.uses && (
                  <div className="border-t border-white/10 pt-4">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      Uses & Indications
                    </h3>
                    <p className="text-slate-300 whitespace-pre-wrap">{drug.uses}</p>
                  </div>
                )}

                {/* Black Box Warning */}
                {drug.blackBoxWarning && (
                  <div className="border-t border-white/10 pt-4 bg-red-500/10 rounded-lg p-4 border-l-4 border-red-500">
                    <h3 className="font-semibold text-red-300 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      ⚠️ Black Box Warning
                    </h3>
                    <p className="text-red-100 whitespace-pre-wrap">{drug.blackBoxWarning}</p>
                  </div>
                )}

                {/* Pregnancy Category */}
                {drug.pregnancyCategory && (
                  <div className="border-t border-white/10 pt-4">
                    <h3 className="font-semibold text-white mb-2">Pregnancy Category</h3>
                    <p className="text-slate-300 font-semibold">{drug.pregnancyCategory}</p>
                  </div>
                )}

                {/* Dosages Section */}
                <div className="border-t border-white/10 pt-4">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    Dosage Information
                  </h3>
                  <div className="space-y-3">
                    {drug.standardDose && (
                      <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-400/30">
                        <p className="text-sm text-blue-300 font-semibold mb-1">Standard Dose</p>
                        <p className="text-slate-300 whitespace-pre-wrap">{drug.standardDose}</p>
                      </div>
                    )}
                    {drug.adjustedDose && (
                      <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-400/30">
                        <p className="text-sm text-purple-300 font-semibold mb-1">Adjusted Dose</p>
                        <p className="text-slate-300 whitespace-pre-wrap">{drug.adjustedDose}</p>
                      </div>
                    )}
                    {drug.neonatalDose && (
                      <div className="bg-pink-500/10 rounded-lg p-3 border border-pink-400/30">
                        <p className="text-sm text-pink-300 font-semibold mb-1">Neonatal Dose</p>
                        <p className="text-slate-300 whitespace-pre-wrap">{drug.neonatalDose}</p>
                      </div>
                    )}
                    {drug.doseSource && (
                      <div className="bg-slate-500/10 rounded-lg p-3 border border-slate-400/30">
                        <p className="text-sm text-slate-300 font-semibold mb-1">Dose Source</p>
                        <p className="text-slate-300 whitespace-pre-wrap">{drug.doseSource}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Drug Interactions Section */}
                <div className="border-t border-white/10 pt-4">
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-orange-400" />
                    Drug Interactions
                  </h3>
                  <div className="space-y-3">
                    {drug.contraindicatedInteractions && (
                      <div className="bg-red-500/10 rounded-lg p-3 border border-red-400/30">
                        <p className="text-sm text-red-300 font-semibold mb-1">🚫 Contraindicated (Avoid)</p>
                        <p className="text-slate-300 whitespace-pre-wrap">{drug.contraindicatedInteractions}</p>
                      </div>
                    )}
                    {drug.majorInteractions && (
                      <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-400/30">
                        <p className="text-sm text-orange-300 font-semibold mb-1">⚠️ Major Interactions</p>
                        <p className="text-slate-300 whitespace-pre-wrap">{drug.majorInteractions}</p>
                      </div>
                    )}
                    {drug.moderateInteractions && (
                      <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-400/30">
                        <p className="text-sm text-yellow-300 font-semibold mb-1">⚡ Moderate Interactions</p>
                        <p className="text-slate-300 whitespace-pre-wrap">{drug.moderateInteractions}</p>
                      </div>
                    )}
                    {drug.minorInteractions && (
                      <div className="bg-green-500/10 rounded-lg p-3 border border-green-400/30">
                        <p className="text-sm text-green-300 font-semibold mb-1">ℹ️ Minor Interactions</p>
                        <p className="text-slate-300 whitespace-pre-wrap">{drug.minorInteractions}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap mt-6 pt-6 border-t border-white/10">
                <button
                  onClick={handleImageSearch}
                  className="flex-1 min-w-[150px] py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold transition-all duration-300 shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 hover:scale-105"
                >
                  <ImageIcon className="w-5 h-5" />
                  Image
                </button>
                <button
                  onClick={handleAlternatives}
                  className="flex-1 min-w-[150px] py-3 px-4 rounded-lg bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold transition-all duration-300 shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 hover:scale-105"
                >
                  <Zap className="w-5 h-5" />
                  Alternatives
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">Drug not found</p>
        )}
      </div>
    </div>
  );
};

export default DrugLens;
