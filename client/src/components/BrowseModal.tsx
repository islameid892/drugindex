import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useLocation } from 'wouter';

interface BrowseModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'drugs' | 'conditions' | 'codes';
  data: any[];
}

export default function BrowseModal({ isOpen, onClose, type, data }: BrowseModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localData, setLocalData] = useState<any[]>([]);
  const [, navigate] = useLocation();

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && data.length === 0) {
      // Load from JSON if data prop is empty
      fetch('/data/main_data.json')
        .then(r => r.json())
        .then(d => setLocalData(d))
        .catch(e => console.error('Error loading data:', e));
    } else {
      setLocalData(data);
    }
  }, [isOpen, data]);

  // Get title and description based on type
  const getTitle = () => {
    switch (type) {
      case 'drugs':
        return 'Search Drugs';
      case 'conditions':
        return 'Find Conditions';
      case 'codes':
        return 'Browse Codes';
      default:
        return '';
    }
  };

  // Extract and sort data based on type
  const sortedData = useMemo(() => {
    let items: any[] = [];

    if (type === 'drugs') {
      // Extract unique drug names
      const drugSet = new Set();
      localData.forEach((item) => {
        if (item.scientificName) {
          drugSet.add(item.scientificName);
        }
      });
      items = Array.from(drugSet) as any[];
    } else if (type === 'conditions') {
      // Extract unique conditions
      const conditionSet = new Set();
      localData.forEach((item) => {
        if (item.indication) {
          conditionSet.add(item.indication);
        }
      });
      items = Array.from(conditionSet) as any[];
    } else if (type === 'codes') {
      // Extract unique codes from icdCodes array
      const codeSet = new Set();
      localData.forEach((item) => {
        if (Array.isArray(item.icdCodes)) {
          item.icdCodes.forEach((code: string) => {
            const mainCode = code.trim().substring(0, 3);
            codeSet.add(mainCode);
          });
        }
      });
      items = Array.from(codeSet) as any[];
    }

    // Sort alphabetically
    return items.sort((a, b) => String(a).localeCompare(String(b)));
  }, [localData, type]);

  // Filter based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedData;
    }
    return sortedData.filter((item) =>
      String(item).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedData, searchQuery]);

  // Group data by first letter
  const groupedData = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredData.forEach((item) => {
      const firstLetter = String(item).charAt(0).toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(item);
    });
    return groups;
  }, [filteredData]);

  const groupLetters = Object.keys(groupedData).sort();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col w-full sm:w-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{getTitle()}</DialogTitle>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${type === 'drugs' ? 'drugs' : type === 'conditions' ? 'conditions' : 'codes'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm sm:text-base"
            autoFocus
          />
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto pr-4 space-y-4">
          {groupLetters.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No results found
            </div>
          ) : (
            groupLetters.map((letter) => (
              <div key={letter}>
                <h3 className="text-sm font-semibold text-primary mb-2 sticky top-0 bg-background py-1">
                  {letter}
                </h3>
                <div className="space-y-1">
                  {groupedData[letter].map((item, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors text-sm sm:text-base active:bg-accent/70"
                      onClick={() => {
                        const itemStr = String(item);
                        if (type === 'drugs') {
                          navigate(`/drug/${encodeURIComponent(itemStr)}`);
                        } else if (type === 'conditions') {
                          navigate(`/condition/${encodeURIComponent(itemStr)}`);
                        } else if (type === 'codes') {
                          navigate(`/code/${encodeURIComponent(itemStr)}`);
                        }
                        onClose();
                      }}
                    >
                      {String(item)}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Results count */}
        <div className="text-xs sm:text-sm text-muted-foreground text-center mt-2">
          Showing {filteredData.length} result{filteredData.length !== 1 ? 's' : ''}
        </div>
      </DialogContent>
    </Dialog>
  );
}
