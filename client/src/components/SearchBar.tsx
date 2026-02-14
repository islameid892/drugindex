import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useState } from "react";
import { getAutocompleteSuggestions, suggestCorrection } from "@/lib/smartSearch";
import { AutocompleteDropdown } from "@/components/AutocompleteDropdown";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  suggestions?: Array<{ name: string; id?: string }>;
  onSuggestionSelect?: (suggestion: { name: string; id?: string }) => void;
}

export function SearchBar({
  value,
  onChange,
  className,
  placeholder = "Search by code, name, or indication...",
  autoFocus = false,
  suggestions = [],
  onSuggestionSelect,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [spellSuggestion, setSpellSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle spell correction suggestions
  useEffect(() => {
    if (value.trim().length > 2 && suggestions.length > 0) {
      const correction = suggestCorrection(
        value,
        suggestions.map(s => s.name)
      );
      setSpellSuggestion(correction);
    } else {
      setSpellSuggestion(null);
    }
  }, [value, suggestions]);

  const handleClear = () => {
    onChange('');
    setIsDropdownOpen(false);
    inputRef.current?.blur();
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleSuggestionSelect = (suggestion: { name: string; id?: string }) => {
    onChange(suggestion.name);
    setIsDropdownOpen(false);
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
  };

  const handleApplySpellCorrection = () => {
    if (spellSuggestion) {
      onChange(spellSuggestion);
      setSpellSuggestion(null);
    }
  };

  return (
    <div className={cn("relative w-full max-w-2xl mx-auto", className)}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
          <Search className="h-4 w-4" />
        </div>
        <Input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => value.trim().length > 0 && setIsDropdownOpen(true)}
          className="pl-8 pr-16 h-14 text-lg shadow-sm border-muted-foreground/20 focus-visible:ring-primary/30 focus-visible:border-primary transition-all rounded-xl bg-background/80 backdrop-blur-sm text-left"
          placeholder={placeholder}
        />

        {/* Spell correction suggestion */}
        {spellSuggestion && (
          <div className="absolute left-8 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
            Did you mean{" "}
            <button
              onClick={handleApplySpellCorrection}
              className="text-blue-600 hover:underline pointer-events-auto font-medium"
            >
              {spellSuggestion}
            </button>
            ?
          </div>
        )}

        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-auto gap-2">
          {value && (
            <button
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-accent/50"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>

        {/* Autocomplete dropdown */}
        {suggestions.length > 0 && (
          <AutocompleteDropdown
            query={value}
            items={suggestions}
            isOpen={isDropdownOpen}
            onSelect={handleSuggestionSelect}
            onClose={() => setIsDropdownOpen(false)}
            maxSuggestions={8}
          />
        )}
      </div>
    </div>
  );
}
