import React, { useState, useCallback, useMemo } from 'react';
import { Search, Beaker, Zap, MessageCircle, Scan, ArrowLeft, Loader2, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

const DrugLens = () => {
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState('Google-style');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<any>(null);
  const [viewSimilarQuery, setViewSimilarQuery] = useState('');

  const filters = [
    { id: 'trade', label: 'Trade Name', icon: '💊' },
    { id: 'scientific', label: 'Scientific Name', icon: '🧪' },
    { id: 'google', label: 'Google-style', icon: '🔍' }
  ];

  // TRPC search query - only run if searchQuery is not empty
  const { data: searchData, isLoading } = trpc.drugLens.search.useQuery(
    {
      query: searchQuery,
      filterBy: activeFilter === 'Trade Name' ? 'trade' : activeFilter === 'Scientific Name' ? 'scientific' : 'both',
      page: 1,
      limit: 20,
    },
    {
      enabled: searchQuery.trim().length > 0,
      staleTime: 30000, // 30 seconds
    }
  );

  // Search for similar drugs
  const { data: similarData, isLoading: similarLoading } = trpc.drugLens.search.useQuery(
    {
      query: viewSimilarQuery,
      filterBy: 'both',
      page: 1,
      limit: 10,
    },
    {
      enabled: viewSimilarQuery.trim().length > 0,
      staleTime: 30000,
    }
  );

  // Extract results from response
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim() || !searchData) return [];
    return searchData.results || [];
  }, [searchData, searchQuery]);

  const similarResults = useMemo(() => {
    if (!viewSimilarQuery.trim() || !similarData) return [];
    return similarData.results || [];
  }, [similarData, viewSimilarQuery]);

  const handleDrugClick = (drug: any) => {
    setSelectedDrug(drug);
  };

  const handleViewSimilar = (drug: any) => {
    setSelectedDrug(drug);
    setViewSimilarQuery(drug.scientificName || drug.tradeName || '');
  };

  const handleGoBack = () => {
    if (selectedDrug) {
      setSelectedDrug(null);
      setViewSimilarQuery('');
    } else {
      setLocation('/');
    }
  };

  // If a drug is selected, show detail view
  if (selectedDrug) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24">
        {/* Detail Header */}
        <header className="bg-teal-700 pt-6 pb-8 px-4 rounded-b-[2rem] shadow-xl text-white">
          <div className="flex justify-between items-center mb-6">
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

        {/* Detail Content */}
        <div className="p-6 max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
            {/* Title */}
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {selectedDrug.tradeName || selectedDrug.scientificName}
            </h2>

            {/* Scientific Name */}
            {selectedDrug.scientificName && (
              <p className="text-sm text-slate-600 flex items-center gap-2 mb-4">
                <Beaker className="w-4 h-4" />
                {selectedDrug.scientificName}
              </p>
            )}

            {/* Price and Company */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-teal-50 rounded-lg">
              {selectedDrug.price && (
                <div>
                  <p className="text-xs text-slate-600 mb-1">Price</p>
                  <p className="text-xl font-bold text-slate-900">
                    {selectedDrug.price} <span className="text-sm">SAR</span>
                  </p>
                </div>
              )}
              {selectedDrug.company && (
                <div>
                  <p className="text-xs text-slate-600 mb-1">Manufacturer</p>
                  <p className="font-semibold text-slate-800">{selectedDrug.company}</p>
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div className="space-y-4">
              {selectedDrug.uses && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Uses</h3>
                  <p className="text-slate-700">{selectedDrug.uses}</p>
                </div>
              )}

              {selectedDrug.pharmacologicalAction && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Pharmacological Action</h3>
                  <p className="text-slate-700">{selectedDrug.pharmacologicalAction}</p>
                </div>
              )}

              {selectedDrug.standardDose && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Standard Dose</h3>
                  <p className="text-slate-700">{selectedDrug.standardDose}</p>
                </div>
              )}

              {selectedDrug.pregnancyCategory && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Pregnancy Category</h3>
                  <p className="text-slate-700">{selectedDrug.pregnancyCategory}</p>
                </div>
              )}

              {selectedDrug.blackBoxWarning && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-bold text-red-900 mb-2">⚠️ Black Box Warning</h3>
                  <p className="text-red-800">{selectedDrug.blackBoxWarning}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleViewSimilar(selectedDrug)}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-200 transition-colors"
              >
                View Similar Drugs
              </button>
              <button
                onClick={handleGoBack}
                className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 transition-colors"
              >
                Back to Results
              </button>
            </div>
          </div>

          {/* Similar Drugs Section */}
          {viewSimilarQuery && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-slate-900 mb-4">Similar Drugs</h3>
              {similarLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                </div>
              )}
              {!similarLoading && similarResults.length === 0 && (
                <p className="text-slate-500 text-center py-8">No similar drugs found</p>
              )}
              <div className="space-y-3">
                {similarResults.map((drug: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleDrugClick(drug)}
                    className="w-full text-left bg-white rounded-lg p-4 shadow-sm border border-slate-100 hover:border-teal-500 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">
                          {drug.tradeName || drug.scientificName}
                        </h4>
                        {drug.scientificName && (
                          <p className="text-sm text-slate-600 mt-1">{drug.scientificName}</p>
                        )}
                      </div>
                      {drug.price && (
                        <p className="font-bold text-slate-900 ml-4">
                          SAR {drug.price}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main search view
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24">
      
      {/* 1. Header & Search Section */}
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
            placeholder={activeFilter === 'Google-style' ? "ابحث عن أي شيء..." : `البحث بواسطة ${activeFilter}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <div className="absolute inset-y-0 right-4 flex items-center">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
            ) : (
              <Scan className="w-5 h-5 text-slate-400 hover:text-teal-600 cursor-pointer" />
            )}
          </div>
        </div>
      </header>

      {/* 2. Optimized Database Filters (Pill Selector) */}
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

      {/* 3. Search Context Info */}
      <div className="p-6 max-w-3xl mx-auto">
        {searchQuery.trim() && (
          <div className="flex items-center gap-2 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <Zap className="w-4 h-4 text-blue-500 fill-current" />
            <p className="text-xs text-blue-700 font-medium">
              Indexing mode: <span className="font-bold underline">{activeFilter}</span> Optimized for fast retrieval.
            </p>
          </div>
        )}

        {/* Results */}
        <div className="space-y-4">
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
              {filteredResults.map((drug: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-teal-500 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase mb-2 inline-block">
                        Matching {activeFilter}
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
                    {drug.price && (
                      <div className="text-right ml-4">
                        <p className="text-xl font-black text-slate-900">
                          SAR {drug.price}
                        </p>
                        {drug.company && (
                          <p className="text-[10px] text-slate-400">{drug.company}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleViewSimilar(drug)}
                      className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                    >
                      View Similar
                    </button>
                    <button
                      onClick={() => handleDrugClick(drug)}
                      className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-teal-700 shadow-lg shadow-teal-200 transition-colors"
                    >
                      Full Details
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {!searchQuery.trim() && (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">Start typing to search for drugs, codes, or conditions</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Ask Sila (Floating Assistant) */}
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
