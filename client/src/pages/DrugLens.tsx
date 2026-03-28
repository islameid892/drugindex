import { useState, useMemo, useEffect } from 'react';
import { 
  Search, ArrowLeft, Loader2, Heart, Pill, ChevronRight,
  AlertCircle, CheckCircle, Zap, TrendingUp, Clock, Shield
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { useFavorites } from '@/contexts/FavoritesContext';

const DrugLens = () => {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrugId, setSelectedDrugId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  const { data: searchData, isLoading } = trpc.drugLens.search.useQuery(
    {
      query: searchQuery,
      filterBy: 'both',
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
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-40 border-b border-white/10 backdrop-blur-md bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">DrugLens</h1>
              <p className="text-xs text-blue-300">Drug Intelligence Platform</p>
            </div>
          </div>
          <button className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all duration-300 backdrop-blur-sm border border-white/20">
            Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative z-30 max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
            Drug Intelligence,<br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Instantly</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Search drugs, check interactions, calculate doses with our comprehensive medical database
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder='Try: "Amoxicillin dose child 10kg"'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-2xl transition-all duration-300 hover:bg-white/15"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 flex-wrap justify-center mb-12">
          <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all duration-300 backdrop-blur-md border border-white/20 flex items-center gap-2 hover:scale-105">
            <Zap className="w-4 h-4" />
            Interaction Checker
          </button>
          <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all duration-300 backdrop-blur-md border border-white/20 flex items-center gap-2 hover:scale-105">
            <Clock className="w-4 h-4" />
            Pediatric Dose
          </button>
          <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-500/30 flex items-center gap-2 hover:scale-105">
            <Shield className="w-4 h-4" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="relative z-20 max-w-6xl mx-auto px-4 pb-20">
        {searchQuery.trim() ? (
          <>
            {/* Filter Section */}
            {filteredResults.length > 0 && (
              <div className="mb-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Filter Results
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-md transition-all"
                  >
                    <option value="" className="bg-slate-900">Category</option>
                    <option value="antibiotic" className="bg-slate-900">Antibiotic</option>
                    <option value="painkiller" className="bg-slate-900">Painkiller</option>
                  </select>

                  <select
                    value={formFilter}
                    onChange={(e) => setFormFilter(e.target.value)}
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-md transition-all"
                  >
                    <option value="" className="bg-slate-900">Form</option>
                    <option value="tablet" className="bg-slate-900">Tablet</option>
                    <option value="capsule" className="bg-slate-900">Capsule</option>
                  </select>

                  <select
                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-md transition-all"
                  >
                    <option value="" className="bg-slate-900">Severity</option>
                    <option value="mild" className="bg-slate-900">Mild</option>
                    <option value="moderate" className="bg-slate-900">Moderate</option>
                  </select>
                </div>
              </div>
            )}

            {/* Results Count */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
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

            {/* Results Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-80 bg-white/10 rounded-2xl animate-pulse border border-white/10"></div>
                ))}
              </div>
            ) : filteredResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResults.map((drug: any) => (
                  <DrugCard
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
              <div className="text-center py-20">
                <Pill className="w-20 h-20 text-slate-600 mx-auto mb-4" />
                <p className="text-xl text-slate-400">No drugs found</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Pill className="w-20 h-20 text-slate-600 mx-auto mb-4" />
            <p className="text-xl text-slate-400">Start searching to discover drugs</p>
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
      onClick={onSelect}
      className="group bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden hover:border-blue-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 cursor-pointer hover:scale-105 hover:bg-white/15"
    >
      {/* Top Gradient Border */}
      <div className="h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500"></div>

      <div className="p-6">
        {/* Drug Name */}
        <h3 className="text-lg font-bold text-white mb-1 line-clamp-2 group-hover:text-blue-300 transition-colors">
          {drug.tradeName}
        </h3>

        {/* Scientific Name */}
        <p className="text-sm text-slate-400 mb-4">
          {drug.scientificName}
        </p>

        {/* Drug Image Placeholder */}
        <div className="w-full h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl mb-4 flex items-center justify-center border border-white/10 group-hover:border-blue-400/30 transition-colors">
          <Pill className="w-12 h-12 text-blue-400/50 group-hover:text-blue-400 transition-colors" />
        </div>

        {/* Info Items */}
        <div className="space-y-2 mb-4">
          {drug.dosage && (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-slate-300">Dose: {drug.dosage}</span>
            </div>
          )}
          {drug.indications && (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-slate-300">Indication: {drug.indications.substring(0, 40)}...</span>
            </div>
          )}
          {drug.warnings && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-slate-300">Allergy risk</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10 my-4"></div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all duration-300 border border-white/10 hover:border-white/20"
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="flex-1 py-2 px-3 rounded-lg text-blue-300 font-semibold text-sm hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-blue-400/50"
          >
            Alternatives
          </button>
          <button
            onClick={onSelect}
            className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1"
          >
            Details
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Detail View Component
const DetailView = ({ drugId, drug, isLoading, onBack, isFav, onFavorite }: any) => {
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
      <div className="relative z-30 max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          </div>
        ) : drug ? (
          <div className="space-y-6">
            {/* Main Info Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 shadow-2xl">
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
                {drug.indications && (
                  <div className="border-t border-white/10 pt-4">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      Indications
                    </h3>
                    <p className="text-slate-300">{drug.indications}</p>
                  </div>
                )}

                {drug.warnings && (
                  <div className="border-t border-white/10 pt-4">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      Warnings
                    </h3>
                    <p className="text-slate-300">{drug.warnings}</p>
                  </div>
                )}

                {drug.sideEffects && (
                  <div className="border-t border-white/10 pt-4">
                    <h3 className="font-semibold text-white mb-2">Side Effects</h3>
                    <p className="text-slate-300">{drug.sideEffects}</p>
                  </div>
                )}

                {drug.interactions && (
                  <div className="border-t border-white/10 pt-4">
                    <h3 className="font-semibold text-white mb-2">Drug Interactions</h3>
                    <p className="text-slate-300">{drug.interactions}</p>
                  </div>
                )}
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
