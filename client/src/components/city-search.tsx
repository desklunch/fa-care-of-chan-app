import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Globe, Map, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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
  type: "city" | "country" | "state";
}

interface CitySearchProps {
  value: DealLocation[];
  onChange: (locations: DealLocation[]) => void;
  placeholder?: string;
  "data-testid"?: string;
}

export function CitySearch({
  value,
  onChange,
  placeholder = "Search for a city, state, or country...",
  "data-testid": testId = "city-search",
}: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchLocations = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/places/location-search", {
        query: searchQuery,
      });

      if (!response.ok) {
        throw new Error("Failed to search locations");
      }

      const data = await response.json();
      setResults(data.locations || []);
      setIsOpen(true);
    } catch (err) {
      console.error("Error searching locations:", err);
      setError("Failed to search. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      searchLocations(query);
    }, 350);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchLocations]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (result: LocationResult) => {
    const isDuplicate = value.some((loc) => loc.placeId === result.placeId);
    if (isDuplicate) {
      setIsOpen(false);
      setQuery("");
      return;
    }

    const newLocation: DealLocation = {
      placeId: result.placeId,
      city: result.city,
      state: result.state,
      stateCode: result.stateCode,
      country: result.country,
      countryCode: result.countryCode,
      displayName: result.displayName,
    };

    onChange([...value, newLocation]);
    setQuery("");
    setIsOpen(false);
    setResults([]);
    inputRef.current?.focus();
  };

  const handleRemove = (placeId: string) => {
    onChange(value.filter((loc) => loc.placeId !== placeId));
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          data-testid={testId}
          className="pr-8"
        />
        {isLoading ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid={`${testId}-clear`}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        {error && (
          <p className="text-sm text-destructive mt-1">{error}</p>
        )}

        {isOpen && results.length > 0 && (
          <div className="absolute left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((result, index) => {
            const isDuplicate = value.some((loc) => loc.placeId === result.placeId);
            const Icon = result.type === "country" ? Globe : result.type === "state" ? Map : MapPin;
            return (
              <button
                key={result.placeId || index}
                type="button"
                onClick={() => handleSelect(result)}
                disabled={isDuplicate}
                className={`w-full px-3 py-2 text-left flex items-start gap-2 border-b last:border-b-0 ${
                  isDuplicate ? "opacity-50 cursor-not-allowed" : "hover-elevate"
                }`}
                data-testid={`${testId}-result-${index}`}
              >
                <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="font-medium">{result.displayName}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {result.type === "country" ? "Country" : result.type === "state" ? "US State" : result.formattedAddress}
                  </div>
                </div>
                {isDuplicate && (
                  <span className="text-xs text-muted-foreground ml-auto">Added</span>
                )}
              </button>
            );
          })}
          </div>
        )}

        {isOpen && results.length === 0 && !isLoading && query.trim() && (
          <div className="absolute left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-lg p-3 text-center text-muted-foreground">
            No locations found
          </div>
        )}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid={`${testId}-chips`}>
          {value.map((location) => {
            const isCountry = !location.city && !location.state;
            const isState = !location.city && location.state;
            const LocationIcon = isCountry ? Globe : isState ? Map : MapPin;
            return (
              <Badge
                key={location.placeId}
                variant="secondary"
                className="gap-1 pr-1"
                data-testid={`${testId}-chip-${location.placeId}`}
              >
                <LocationIcon className="h-3 w-3" />
                {location.displayName}
                <button
                  type="button"
                  onClick={() => handleRemove(location.placeId)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  data-testid={`${testId}-remove-${location.placeId}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
