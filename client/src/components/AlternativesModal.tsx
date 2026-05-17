import { X, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export const AlternativesModal = ({ drug, isOpen, onClose }: any) => {
  const { data: alternatives, isLoading } = trpc.drugLens.getAlternatives.useQuery(
    { scientificName: drug?.scientificName || '', form: drug?.form || '', excludeId: drug?.id || 0 },
    { enabled: isOpen && !!drug }
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-white/10 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Alternative Medications</h2>
            <p className="text-slate-400 text-sm mt-1">
              {drug?.form ? `Same as: ${drug.tradeName} (${drug.form})` : `Scientific Name: ${drug?.scientificName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : alternatives && alternatives.length > 0 ? (
            alternatives.map((alt: any) => (
              <div
                key={alt.id}
                className="bg-white/10 hover:bg-white/20 rounded-lg p-4 border border-white/10 hover:border-blue-400/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg group-hover:text-blue-300 transition-colors">
                      {alt.tradeName}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">{alt.scientificName}</p>
                    {alt.form && (
                      <p className="text-slate-500 text-xs mt-1 inline-block bg-slate-700/50 px-2 py-1 rounded">
                        {alt.form}
                      </p>
                    )}
                    {alt.standardDose && (
                      <p className="text-blue-300 text-sm mt-2">
                        <span className="font-semibold">Dose:</span> {alt.standardDose}
                      </p>
                    )}
                  </div>
                  {alt.price && (
                    <div className="text-right ml-4">
                      <p className="text-2xl font-bold text-green-400">{alt.price}</p>
                      <p className="text-slate-400 text-xs">SAR</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400">No alternative medications found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
