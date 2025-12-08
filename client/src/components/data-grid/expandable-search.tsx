import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ExpandableSearch({ 
  value, 
  onChange, 
  placeholder = "Search..." 
}: ExpandableSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        !value.trim()
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const handleClear = () => {
    onChange("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleBlur = () => {
    if (!value.trim()) {
      setIsExpanded(false);
    }
  };

  if (!isExpanded && !value) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsExpanded(true)}
        data-testid="button-expand-search"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative flex items-center transition-all duration-200",
        "w-48"
      )}
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        className="pl-9 pr-8 h-9"
        data-testid="input-search"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 h-9 w-8 hover:bg-transparent"
          onClick={handleClear}
          data-testid="button-clear-search"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
