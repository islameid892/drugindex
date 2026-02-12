import { createContext, useContext, useState, ReactNode } from 'react';

interface BrowseState {
  isOpen: boolean;
  type: 'drugs' | 'conditions' | 'codes' | 'non-covered';
  searchQuery: string;
}

interface BrowseContextType {
  browseState: BrowseState;
  openBrowse: (type: 'drugs' | 'conditions' | 'codes' | 'non-covered', searchQuery?: string) => void;
  closeBrowse: () => void;
  updateSearchQuery: (query: string) => void;
  closeModalCompletely: () => void;
}

const BrowseContext = createContext<BrowseContextType | undefined>(undefined);

export function BrowseProvider({ children }: { children: ReactNode }) {
  const [browseState, setBrowseState] = useState<BrowseState>({
    isOpen: false,
    type: 'drugs',
    searchQuery: '',
  });

  const openBrowse = (type: 'drugs' | 'conditions' | 'codes' | 'non-covered', searchQuery: string = '') => {
    setBrowseState({
      isOpen: true,
      type,
      searchQuery,
    });
  };

  const closeBrowse = () => {
    // Keep isOpen = true so we can return to Browse Modal from detail pages
    // The modal will be re-opened when user clicks back
    setBrowseState(prev => ({
      ...prev,
      isOpen: true,
    }));
  };

  const updateSearchQuery = (query: string) => {
    setBrowseState(prev => ({
      ...prev,
      searchQuery: query,
    }));
  };

  const closeModalCompletely = () => {
    setBrowseState({
      isOpen: false,
      type: 'drugs',
      searchQuery: '',
    });
  };

  return (
    <BrowseContext.Provider value={{ browseState, openBrowse, closeBrowse, updateSearchQuery, closeModalCompletely }}>
      {children}
    </BrowseContext.Provider>
  );
}

export function useBrowse() {
  const context = useContext(BrowseContext);
  if (!context) {
    throw new Error('useBrowse must be used within BrowseProvider');
  }
  return context;
}


