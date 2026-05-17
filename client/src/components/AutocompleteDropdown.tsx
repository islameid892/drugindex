import React, { useEffect, useRef } from 'react';
import { getAutocompleteSuggestions } from '@/lib/smartSearch';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface AutocompleteItem {
  name: string;
  id?: string;
}

interface AutocompleteDropdownProps {
  query: string;
  items: AutocompleteItem[];
  isOpen: boolean;
  onSelect: (item: AutocompleteItem) => void;
  onClose: () => void;
  maxSuggestions?: number;
  placeholder?: string;
}

export function AutocompleteDropdown({
  query,
  items,
  isOpen,
  onSelect,
  onClose,
  maxSuggestions = 8,
  placeholder = 'Search suggestions...',
}: AutocompleteDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const suggestions = getAutocompleteSuggestions(query, items, maxSuggestions);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !query.trim() || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
    >
      <div className="p-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={suggestion.id || index}
            onClick={() => {
              onSelect(suggestion);
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors flex items-center justify-between group"
          >
            <span className="truncate text-sm font-medium text-gray-900">
              {suggestion.name}
            </span>
            <span className="text-xs text-gray-400 group-hover:text-gray-600">
              {Math.round(suggestion.score)}%
            </span>
          </button>
        ))}
      </div>

      {suggestions.length === 0 && (
        <div className="px-3 py-2 text-sm text-gray-500 text-center">
          {placeholder}
        </div>
      )}
    </div>
  );
}
