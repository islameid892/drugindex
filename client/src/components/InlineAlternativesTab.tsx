import { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface InlineAlternativesTabProps {
  drug: any;
  isOpen: boolean;
  onClose: () => void;
}

export const InlineAlternativesTab = ({ drug, isOpen, onClose }: InlineAlternativesTabProps) => {
  const [alternatives, setAlternatives] = useState<any[]>([]);

  // Fetch alternatives using the same logic as AlternativesModal
  const { data: alternativesData, isLoading } = trpc.drugLens.getAlternatives.useQuery(
    {
      scientificName: drug?.scientificName || '',
      form: drug?.form,
      excludeId: drug?.id || 0,
    },
    {
      enabled: isOpen && !!drug,
    }
  );

  useEffect(() => {
    if (alternativesData) {
      setAlternatives(alternativesData);
    }
  }, [alternativesData]);

  if (!isOpen) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-purple-400/30 bg-purple-500/10 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between bg-purple-500/20 px-4 py-3 border-b border-purple-400/20">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span className="text-purple-300">✨</span>
          Alternatives
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-400 hover:text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          </div>
        ) : alternatives.length > 0 ? (
          <div className="space-y-2">
            {alternatives.map((alt: any) => (
              <div
                key={alt.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/30 transition-all duration-200 cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                    {alt.tradeName}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {alt.scientificName}
                  </p>
                </div>
                {alt.price && (
                  <div className="ml-4 text-right flex-shrink-0">
                    <p className="font-semibold text-purple-300">
                      {alt.price} SAR
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-400 py-6">
            No alternatives found
          </p>
        )}
      </div>
    </div>
  );
};
