import { useState } from "react";
import { Sliders } from "lucide-react";
import { AdvancedSearchModal } from "./AdvancedSearchModal";
import { Button } from "@/components/ui/button";

interface AdvancedSearchFABProps {
  variant?: "inline" | "fab";
}

export function AdvancedSearchFAB({ variant = "fab" }: AdvancedSearchFABProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (variant === "inline") {
    // Inline button style (for use below search bar)
    return (
      <>
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="outline"
          className="gap-2 border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950 text-foreground px-6 py-3 text-base font-semibold h-auto"
        >
          <Sliders className="h-5 w-5" />
          <span>Go to Advanced Search</span>
        </Button>

        <AdvancedSearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  // FAB style (default)
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 z-40 flex items-center gap-2 group"
        title="Advanced Search"
      >
        <Sliders className="h-6 w-6" />
        <span className="text-sm font-semibold hidden group-hover:inline-block max-w-xs">
          Advanced Search
        </span>
      </button>

      <AdvancedSearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
