import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function SearchBar({ value, onChange, className, placeholder = "Search by code, name, or indication..." }: SearchBarProps) {
  return (
    <div className={cn("relative w-full max-w-2xl mx-auto", className)}>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
          <Search className="h-5 w-5" />
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-11 h-14 text-lg shadow-sm border-muted-foreground/20 focus-visible:ring-primary/30 focus-visible:border-primary transition-all rounded-xl bg-background/80 backdrop-blur-sm"
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
