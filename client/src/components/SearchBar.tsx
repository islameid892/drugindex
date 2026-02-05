import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChange, className, placeholder = "Search by code, name, or indication...", autoFocus = false }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className={cn("relative w-full max-w-2xl mx-auto", className)}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
          <Search className="h-4 w-4" />
        </div>
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-8 pr-16 h-14 text-lg shadow-sm border-muted-foreground/20 focus-visible:ring-primary/30 focus-visible:border-primary transition-all rounded-xl bg-background/80 backdrop-blur-sm text-left"
          placeholder={placeholder}
        />
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>
    </div>
  );
}
