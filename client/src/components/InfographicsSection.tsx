import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Infographic {
  id: string;
  title: string;
  description: string;
  image: string;
  alt: string;
}

const infographics: Infographic[] = [
  {
    id: "coding",
    title: "Streamlining Healthcare: From Coding Chaos to Instant Approval",
    description: "Discover how ICD-10 Search Engine transforms manual coding processes, reduces insurance rejections by 85%, and ensures same-day approval rates.",
    image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663263105436/dTFqLwvEeGMiLutY.png",
    alt: "Healthcare coding transformation infographic"
  },
  {
    id: "approvals",
    title: "From Chaos to Clarity: Streamlining Insurance Approvals with ICD-10 Search",
    description: "Learn how our platform eliminates coding errors, prevents insurance denials, and accelerates the approval process for healthcare providers.",
    image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663263105436/WgiAKMaLZMibTRqa.png",
    alt: "Insurance approvals streamlining infographic"
  }
];

export default function InfographicsSection() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = infographics.find(i => i.id === selectedId);

  return (
    <>
      {/* Infographics Grid */}
      <section className="why-section py-16 bg-gradient-to-b from-transparent via-sky-50/50 to-transparent dark:via-slate-900/50">
        <div className="container">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white">Why ICD-10 Search Engine?</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              See how our platform transforms healthcare coding and insurance approval processes
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {infographics.map(infographic => (
              <div
                key={infographic.id}
                className="infographic-card bg-white dark:bg-slate-800 rounded-lg border border-sky-100 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Preview Image */}
                <div className="relative h-48 bg-slate-100 overflow-hidden group">
                  <img
                    src={infographic.image}
                    alt={infographic.alt}
                    loading="lazy"
                    decoding="async"
                    width="600"
                    height="400"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <button
                      onClick={() => setSelectedId(infographic.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <div className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow">
                        <ZoomIn className="h-6 w-6 text-sky-600" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                    {infographic.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {infographic.description}
                  </p>
                  <button
                    onClick={() => setSelectedId(infographic.id)}
                    className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ZoomIn className="h-4 w-4" />
                    View Full Infographic
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal for Full Infographic */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedId(null)}
        >
            <div
              className="bg-white dark:bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto relative"
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedId(null)}
                className="sticky top-4 right-4 z-10 bg-white dark:bg-slate-700 rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow float-right m-4"
              >
                <X className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              </button>

              {/* Title */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {selected.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  {selected.description}
                </p>
              </div>

              {/* Image */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900">
                <img
                  src={selected.image}
                  alt={selected.alt}
                  loading="lazy"
                  decoding="async"
                  width="1200"
                  height="800"
                  className="w-full h-auto rounded-lg"
                />
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Click outside or press the X button to close
                </p>
                <button
                  onClick={() => setSelectedId(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
          </div>
        </div>
      )}
    </>
  );
}
