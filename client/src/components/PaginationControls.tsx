import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ currentPage, totalPages, onPageChange }: PaginationControlsProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (totalPages <= 1) return null;

  // حساب الأرقام المراد عرضها على الـ Tablet
  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    
    pages.push(1);
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    if (start > 2) pages.push('...');
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (end < totalPages - 1) pages.push('...');
    
    if (totalPages > 1) pages.push(totalPages);
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-2 py-4 flex-wrap w-full">
      {/* Previous Button */}
      <Button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        variant="outline"
        size="sm"
        className="gap-2 flex-shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className={isMobile ? "hidden" : "inline"}>Previous</span>
      </Button>

      {/* Desktop: Show all page numbers */}
      {!isMobile && !isTablet && (
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              onClick={() => onPageChange(page)}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              className={currentPage === page ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700" : ""}
            >
              {page}
            </Button>
          ))}
        </div>
      )}

      {/* Tablet: Show limited page numbers */}
      {isTablet && (
        <div className="flex items-center gap-1">
          {visiblePages.map((page, idx) => 
            typeof page === 'string' ? (
              <span key={`dots-${idx}`} className="px-1 text-slate-400 text-xs">
                {page}
              </span>
            ) : (
              <Button
                key={page}
                onClick={() => onPageChange(page)}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                className={currentPage === page ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white hover:from-sky-600 hover:to-sky-700 h-8 px-2" : "h-8 px-2"}
              >
                <span className="text-xs">{page}</span>
              </Button>
            )
          )}
        </div>
      )}

      {/* Mobile: Show only page info */}
      {isMobile && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
            {currentPage}/{totalPages}
          </span>
        </div>
      )}

      {/* Next Button */}
      <Button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        variant="outline"
        size="sm"
        className="gap-2 flex-shrink-0"
      >
        <span className={isMobile ? "hidden" : "inline"}>Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Page Info - Desktop only */}
      {!isMobile && !isTablet && (
        <div className="text-sm text-slate-600 ml-4">
          Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
        </div>
      )}
    </div>
  );
}
