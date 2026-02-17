import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Map as MapIcon, Globe, X, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { DealLocation } from "@shared/schema";

interface LocationResult {
  placeId: string;
  city?: string;
  state?: string;
  stateCode?: string;
  country: string;
  countryCode: string;
  displayName: string;
  formattedAddress: string;
  type: "city" | "state" | "country";
}

interface LocationSearchProps {
  value: DealLocation[];
  onChange: (locations: DealLocation[]) => void;
  disabled?: boolean;
  testId?: string;
}

function getLocationIcon(loc: { city?: string; state?: string; type?: string }) {
  if (loc.type === "country" || (!loc.city && !loc.state)) return Globe;
  if (loc.type === "state" || (!loc.city && loc.state)) return MapIcon;
  return MapPin;
}

function getLocationTypeLabel(type: string) {
  switch (type) {
    case "state": return "US State";
    case "country": return "Country";
    default: return "";
  }
}

export function LocationSearch({ value, onChange, disabled, testId }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await apiRequest("POST", "/api/places/location-search", { query: q });
      const data = await res.json();
      const locations = (data.locations || []) as LocationResult[];
      const existingIds = new Set(value.map((l) => l.placeId));
      const filtered = locations.filter((l) => !existingIds.has(l.placeId));
      setResults(filtered);
      setShowDropdown(filtered.length > 0);
      setHighlightedIndex(-1);
    } catch {
      setResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, [value]);

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const selectLocation = (result: LocationResult) => {
    const newLoc: DealLocation = {
      placeId: result.placeId,
      city: result.city,
      state: result.state,
      stateCode: result.stateCode,
      country: result.country,
      countryCode: result.countryCode,
      displayName: result.displayName,
    };
    onChange([...value, newLoc]);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeLocation = (placeId: string) => {
    onChange(value.filter((l) => l.placeId !== placeId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      selectLocation(results[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-2" data-testid={testId}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          placeholder="Search for a city, state, or country..."
          disabled={disabled}
          className="pl-8"
          data-testid={testId ? `${testId}-input` : "input-location-search"}
        />
        {isSearching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-[240px] overflow-auto">
            {results.map((result, index) => {
              const Icon = getLocationIcon(result);
              const typeLabel = getLocationTypeLabel(result.type);
              return (
                <button
                  key={result.placeId}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-2 text-sm text-left",
                    highlightedIndex === index ? "bg-accent" : "hover:bg-accent/50"
                  )}
                  onClick={() => selectLocation(result)}
                  data-testid={testId ? `${testId}-result-${index}` : `location-result-${index}`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{result.displayName}</div>
                    {(result.formattedAddress !== result.displayName || typeLabel) && (
                      <div className="text-xs text-muted-foreground truncate">
                        {typeLabel || result.formattedAddress}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((loc) => {
            const Icon = getLocationIcon(loc);
            return (
              <Badge
                key={loc.placeId}
                variant="secondary"
                className="gap-1 pr-1"
              >
                <Icon className="h-3 w-3 shrink-0" />
                <span>{loc.displayName}</span>
                {!disabled && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex items-center justify-center ml-0.5 rounded-sm cursor-pointer hover-elevate"
                    onClick={(e) => { e.stopPropagation(); removeLocation(loc.placeId); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); removeLocation(loc.placeId); } }}
                    data-testid={testId ? `${testId}-remove-${loc.placeId}` : `remove-location-${loc.placeId}`}
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
