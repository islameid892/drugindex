import { useState } from "react";
import { Search } from "lucide-react";
import { AdvancedSearchModal } from "./AdvancedSearchModal";

export function AdvancedSearchFAB() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 z-40 flex items-center gap-2 group"
        title="Advanced Search"
      >
        <Search className="h-6 w-6" />
        <span className="text-sm font-semibold hidden group-hover:inline-block max-w-xs">
          Advanced Search
        </span>
      </button>

      {/* Modal */}
      <AdvancedSearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
