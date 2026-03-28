import { useState, useMemo } from 'react';
import { 
  Search, ArrowLeft, Loader2, ExternalLink, Image, 
  ChevronDown, X, AlertCircle, CheckCircle, Heart, Pill, ChevronRight
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/contexts/FavoritesContext';

const DrugLens = () => {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrugId, setSelectedDrugId] = useState<number | null>(null);
  const [showSimilar, setShowSimilar] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  // TRPC search query
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
    
    // Apply filters
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

  const handleDrugClick = (drugId: number) => {
    setSelectedDrugId(drugId);
    setShowSimilar(false);
  };

  const handleGoBack = () => {
    if (selectedDrugId !== null) {
      setSelectedDrugId(null);
      setShowSimilar(false);
    } else {
      setLocation('/');
    }
  };

  // Detail View
  if (selectedDrugId !== null) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">Drug Details</h1>
            <div className="w-12"></div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {detailLoading ? (
            <div className="flex justify-center items-center h-96">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : selectedDrug ? (
            <div className="space-y-6">
              {/* Main Info Card */}
              <div className="bg-white rounded-lg shadow p-8 border border-gray-200">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      {selectedDrug.tradeName}
                    </h2>
                    <p className="text-lg text-gray-600">
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
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <Heart
                      className={`w-6 h-6 ${
                        isFavorite(selectedDrug.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {selectedDrug.price && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600 font-semibold mb-1">Price</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {selectedDrug.price} SAR
                      </p>
                    </div>
                  )}
                  {selectedDrug.dosage && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-semibold mb-1">Dosage</p>
                      <p className="text-lg font-bold text-green-900">
                        {selectedDrug.dosage}
                      </p>
                    </div>
                  )}
                  {selectedDrug.form && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-600 font-semibold mb-1">Form</p>
                      <p className="text-lg font-bold text-purple-900">
                        {selectedDrug.form}
                      </p>
                    </div>
                  )}
                </div>

                {/* Details Sections */}
                <div className="space-y-4">
                  {selectedDrug.indications && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Indications
                      </h3>
                      <p className="text-gray-700">{selectedDrug.indications}</p>
                    </div>
                  )}

                  {selectedDrug.warnings && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        Warnings
                      </h3>
                      <p className="text-gray-700">{selectedDrug.warnings}</p>
                    </div>
                  )}

                  {selectedDrug.sideEffects && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Side Effects</h3>
                      <p className="text-gray-700">{selectedDrug.sideEffects}</p>
                    </div>
                  )}

                  {selectedDrug.interactions && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Drug Interactions</h3>
                      <p className="text-gray-700">{selectedDrug.interactions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={() => setShowSimilar(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Alternatives
                </Button>
                {selectedDrug.externalLink && (
                  <a
                    href={selectedDrug.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    More Info
                  </a>
                )}
              </div>

              {/* Similar Drugs */}
              {showSimilar && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Similar Medications</h3>
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
                    <p className="text-gray-600 text-center py-8">No similar medications found</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">Drug not found</p>
          )}
        </div>
      </div>
    );
  }

  // Main Search View
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">DrugLens</span>
          </div>
          <button className="text-gray-600 hover:text-gray-900 font-medium">
            Login
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-blue-50 to-white py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Drug Intelligence, Instantly
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Search drugs, check interactions, calculate doses
          </p>

          {/* Search Bar */}
          <div className="relative mb-8">
            <input
              type="text"
              placeholder='Try: "Amoxicillin dose child 10kg"'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-14 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 flex-wrap justify-center mb-8">
            <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-semibold hover:bg-blue-100 flex items-center gap-2 border border-blue-200">
              <span>💊</span> Interaction Checker
            </button>
            <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-semibold hover:bg-blue-100 flex items-center gap-2 border border-blue-200">
              <span>⚕️</span> Pediatric Dose
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {searchQuery.trim() ? (
          <>
            {/* Filter Section */}
            {filteredResults.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Filter Results</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Category</option>
                    <option value="antibiotic">Antibiotic</option>
                    <option value="painkiller">Painkiller</option>
                  </select>

                  <select
                    value={formFilter}
                    onChange={(e) => setFormFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Form</option>
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                  </select>

                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Severity</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                  </select>
                </div>

                {/* Active Filters */}
                {(categoryFilter || formFilter) && (
                  <div className="flex gap-2 flex-wrap">
                    {categoryFilter && (
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Antibiotic
                        <X className="w-4 h-4 cursor-pointer" onClick={() => setCategoryFilter('')} />
                      </span>
                    )}
                    {formFilter && (
                      <span className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        Tablet
                        <X className="w-4 h-4 cursor-pointer" onClick={() => setFormFilter('')} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Results Count */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">
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
                  <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>
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
                <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-600">No drugs found</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-600">Start searching to discover drugs</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 text-sm">
          <p>© 2026 DrugLens | Terms | Privacy</p>
        </div>
      </div>
    </div>
  );
};

// Drug Card Component
const DrugCard = ({ drug, onSelect, isFav, onFavorite }: any) => {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      {/* Top Border */}
      <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>

      <div className="p-6">
        {/* Drug Name */}
        <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
          {drug.tradeName}
        </h3>

        {/* Scientific Name */}
        <p className="text-sm text-gray-600 mb-4">
          {drug.scientificName}
        </p>

        {/* Drug Image Placeholder */}
        <div className="w-full h-32 bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
          <Image className="w-12 h-12 text-gray-300" />
        </div>

        {/* Info Items */}
        <div className="space-y-2 mb-4">
          {drug.dosage && (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">Dose: {drug.dosage}</span>
            </div>
          )}
          {drug.indications && (
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">Indication: {drug.indications.substring(0, 40)}...</span>
            </div>
          )}
          {drug.warnings && (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700">Allergy risk</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 my-4"></div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium text-sm transition-colors"
          >
            <Image className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex-1 py-2 px-3 rounded-lg text-blue-600 font-semibold text-sm hover:bg-blue-50 transition-colors"
          >
            Alternatives
          </button>
          <button
            onClick={() => onSelect(drug.id)}
            className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
          >
            Full Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrugLens;
