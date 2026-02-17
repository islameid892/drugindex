import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useState } from "react";
import { getAutocompleteSuggestions, suggestCorrection } from "@/lib/smartSearch";
import { AutocompleteDropdown } from "@/components/AutocompleteDropdown";
import "./SearchBar.css";

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
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);

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
        {/* Search icon - positioned on the right */}
        <div className={cn(
          "absolute inset-y-0 right-0 pr-2 sm:pr-4 flex items-center pointer-events-none transition-all duration-300 z-10",
          isFocused || hasValue ? "text-sky-500" : "text-muted-foreground"
        )}>
          <div className={cn(
            "relative transition-all duration-300 flex items-center justify-center",
            isFocused || hasValue ? "search-icon-active" : "search-icon-idle"
          )}>
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            {(isFocused || hasValue) && (
              <div className="absolute inset-0 rounded-full bg-sky-400/20 animate-pulse" />
            )}
          </div>
        </div>

        {/* Input field */}
        <Input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setHasValue(e.target.value.length > 0);
            setIsDropdownOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            value.trim().length > 0 && setIsDropdownOpen(true);
          }}
          onBlur={() => setIsFocused(false)}
          className="pl-3 sm:pl-4 pr-10 sm:pr-14 h-12 sm:h-14 text-base sm:text-lg shadow-sm border-muted-foreground/20 focus-visible:ring-sky-500/30 focus-visible:border-sky-500 transition-all rounded-xl bg-background/80 backdrop-blur-sm text-left"
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

        {/* Clear button - positioned on the right next to search icon */}
        {value && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-12 sm:right-16 flex items-center text-muted-foreground hover:text-foreground transition-colors p-0.5 sm:p-1 rounded hover:bg-accent/50 flex-shrink-0"
            aria-label="Clear search"
          >
            <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Keyboard shortcut hint - only show when no value and no Arabic placeholder */}
        {!value && (
          <div className="absolute inset-y-0 left-3 sm:left-4 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">CMD</span>K
            </kbd>
          </div>
        )}

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
