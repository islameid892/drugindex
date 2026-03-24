import React, { useState, useMemo } from 'react';
import { Search, Beaker, MessageCircle, Scan, ArrowLeft, Loader2, ExternalLink, Image } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

const DrugLens = () => {
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState('Google-style');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrugId, setSelectedDrugId] = useState<number | null>(null);
  const [showSimilar, setShowSimilar] = useState(false);

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
    return searchData.results || [];
  }, [searchData, searchQuery]);

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

  // Detail view
  if (selectedDrugId !== null) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24">
        {/* Detail Header */}
        <header className="bg-teal-700 pt-6 pb-8 px-4 rounded-b-[2rem] shadow-xl text-white">
          <div className="flex justify-between items-center mb-4">
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

        <div className="p-4 max-w-3xl mx-auto">
          {detailLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
            </div>
          )}

          {!detailLoading && selectedDrug && (
            <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
              {/* Title + Google Image Button */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-2xl font-bold text-slate-900 flex-1">
                  {selectedDrug.tradeName || selectedDrug.scientificName}
                </h2>
                <button
                  onClick={() => openGoogleImage(selectedDrug.tradeName || selectedDrug.scientificName || '')}
                  className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex-shrink-0"
                  title="Search drug image on Google"
                >
                  <Image className="w-4 h-4" />
                  <span>Image</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Scientific Name */}
              {selectedDrug.scientificName && (
                <p className="text-sm text-slate-600 flex items-center gap-2 mb-4">
                  <Beaker className="w-4 h-4" />
                  {selectedDrug.scientificName}
                </p>
              )}

              {/* Price */}
              {formatPrice(selectedDrug.price) && (
                <div className="mb-6 p-4 bg-teal-50 rounded-lg inline-block">
                  <p className="text-xs text-slate-600 mb-1">Price</p>
                  <p className="text-2xl font-black text-slate-900">
                    {formatPrice(selectedDrug.price)} <span className="text-sm font-semibold text-slate-600">SAR</span>
                  </p>
                </div>
              )}

              {/* Black Box Warning */}
              {selectedDrug.blackBoxWarning && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-bold text-red-900 mb-2">⚠️ Black Box Warning</h3>
                  <p className="text-red-800 text-sm whitespace-pre-line">{selectedDrug.blackBoxWarning}</p>
                </div>
              )}

              {/* Details */}
              <div className="space-y-4">
                {selectedDrug.uses && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2 text-base">Uses</h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.uses}</p>
                  </div>
                )}

                {selectedDrug.pharmacologicalAction && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2 text-base">Pharmacological Action</h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.pharmacologicalAction}</p>
                  </div>
                )}

                {selectedDrug.standardDose && (
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2 text-base">Standard Dose</h3>
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
                    <span className="inline-block bg-yellow-100 text-yellow-800 font-bold px-3 py-1 rounded-lg">
                      Category {selectedDrug.pregnancyCategory}
                    </span>
                  </div>
                )}

                {selectedDrug.contraindicatedInteractions && (
                  <div>
                    <h3 className="font-bold text-red-700 mb-2 text-base">🚫 Contraindicated Interactions</h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.contraindicatedInteractions}</p>
                  </div>
                )}

                {selectedDrug.majorInteractions && (
                  <div>
                    <h3 className="font-bold text-orange-700 mb-2 text-base">⚠️ Major Interactions</h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.majorInteractions}</p>
                  </div>
                )}

                {selectedDrug.moderateInteractions && (
                  <div>
                    <h3 className="font-bold text-yellow-700 mb-2 text-base">⚡ Moderate Interactions</h3>
                    <p className="text-slate-700 text-sm whitespace-pre-line">{selectedDrug.moderateInteractions}</p>
                  </div>
                )}

                {selectedDrug.doseSource && (
                  <div className="pt-2 border-t border-slate-100">
                    <h3 className="font-bold text-slate-500 mb-1 text-xs uppercase tracking-wide">Sources</h3>
                    <p className="text-slate-500 text-xs whitespace-pre-line">{selectedDrug.doseSource}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowSimilar(!showSimilar)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
                    showSimilar
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {showSimilar ? 'Hide Similar' : 'View Similar Drugs'}
                </button>
                <button
                  onClick={handleGoBack}
                  className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors"
                >
                  Back to Results
                </button>
              </div>
            </div>
          )}

          {/* Similar Drugs Section */}
          {showSimilar && (
            <div className="mt-6">
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                Similar Drugs (Same Active Ingredient)
              </h3>
              {similarLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
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
                      className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:border-teal-400 hover:shadow-md transition-all"
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
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24">

      {/* Header & Search */}
      <header className="bg-teal-700 pt-6 pb-8 px-4 rounded-b-[2rem] shadow-xl text-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoBack}
              className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold tracking-tight">Drug Lens</h1>
          </div>
          <span className="text-[10px] bg-orange-400 px-2 py-1 rounded-full font-bold uppercase">v3.0 DB</span>
        </div>

        <div className="relative group max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-teal-600" />
          </div>
          <input
            type="text"
            className="w-full bg-white text-slate-900 rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:ring-4 focus:ring-teal-500/30 transition-all shadow-2xl placeholder:text-slate-400"
            placeholder={activeFilter === 'Google-style' ? 'Search drugs, codes, or conditions...' : `Search by ${activeFilter}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <div className="absolute inset-y-0 right-4 flex items-center">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
            ) : (
              <Scan className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="flex justify-center gap-2 -mt-5 px-4 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.label)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-md ${
              activeFilter === f.label
                ? 'bg-orange-500 text-white scale-105 ring-4 ring-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{f.icon}</span>
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="p-6 max-w-3xl mx-auto">
        {isLoading && searchQuery.trim() && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        )}

        {!isLoading && searchQuery.trim() && filteredResults.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">No results found for "{searchQuery}"</p>
          </div>
        )}

        {!isLoading && filteredResults.length > 0 && (
          <>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Found {searchData?.total || 0} result{searchData?.total !== 1 ? 's' : ''}
            </p>
            <div className="space-y-4">
              {filteredResults.map((drug: any) => (
                <div
                  key={drug.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-teal-400 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase mb-2 inline-block">
                        {activeFilter}
                      </span>
                      <h3 className="text-lg font-bold text-slate-800 uppercase">
                        {drug.tradeName || drug.scientificName || 'Unknown'}
                      </h3>
                      {drug.scientificName && (
                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                          <Beaker className="w-3 h-3" /> {drug.scientificName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      {formatPrice(drug.price) && (
                        <p className="text-xl font-black text-slate-900">
                          {formatPrice(drug.price)} <span className="text-xs font-semibold text-slate-500">SAR</span>
                        </p>
                      )}
                      <button
                        onClick={() => openGoogleImage(drug.tradeName || drug.scientificName || '')}
                        className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors"
                        title="Search image on Google"
                      >
                        <Image className="w-3 h-3" />
                        Image
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
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
                      className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-teal-700 shadow-lg shadow-teal-200 transition-colors"
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
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Start typing to search for drugs, codes, or conditions</p>
          </div>
        )}
      </div>

      {/* Floating Sila Button */}
      <div className="fixed bottom-8 right-6 group">
        <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-slate-800 text-white text-[10px] py-1 px-3 rounded-full whitespace-nowrap mb-2 shadow-xl">
            Sila AI is ready!
          </div>
        </div>
        <button className="w-14 h-14 bg-gradient-to-tr from-teal-600 to-teal-400 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:rotate-12 transition-transform ring-4 ring-white">
          <MessageCircle className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

export default DrugLens;
