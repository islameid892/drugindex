import React, { useState } from 'react';
import { Search, Beaker, Zap, MessageCircle, Scan, ArrowLeft, MoreHorizontal } from 'lucide-react';

const DrugLens = () => {
  const [activeFilter, setActiveFilter] = useState('Google-style');
  const [searchQuery, setSearchQuery] = useState('');

  // الفلاتر المحددة فقط لتناسب قاعدة البيانات
  const filters = [
    { id: 'trade', label: 'Trade Name', icon: '💊' },
    { id: 'scientific', label: 'Scientific Name', icon: '🧪' },
    { id: 'google', label: 'Google-style', icon: '🔍' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24">
      
      {/* 1. Header & Search Section */}
      <header className="bg-teal-700 pt-6 pb-8 px-4 rounded-b-[2rem] shadow-xl text-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </div>
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
          />
          <div className="absolute inset-y-0 right-4 flex items-center">
             <Scan className="w-5 h-5 text-slate-400 hover:text-teal-600 cursor-pointer" />
          </div>
        </div>
      </header>

      {/* 2. Optimized Database Filters (Pill Selector) */}
      <div className="flex justify-center gap-2 -mt-5 px-4">
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
        <div className="flex items-center gap-2 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
          <Zap className="w-4 h-4 text-blue-500 fill-current" />
          <p className="text-xs text-blue-700 font-medium">
            Indexing mode: <span className="font-bold underline">{activeFilter}</span> Optimized for fast retrieval.
          </p>
        </div>

        {/* Results Mockup */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-teal-500 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded uppercase mb-2 inline-block">Matching {activeFilter}</span>
                <h3 className="text-lg font-bold text-slate-800 uppercase">Amaryl 2mg</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                  <Beaker className="w-3 h-3" /> Glimepiride
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-slate-900">24.50 <span className="text-xs">SAR</span></p>
                <p className="text-[10px] text-slate-400">SANOFI AVENTIS</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
               <button className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-xs font-bold hover:bg-slate-200">View Similar</button>
               <button className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-teal-700 shadow-lg shadow-teal-200">Full Details</button>
            </div>
          </div>
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
