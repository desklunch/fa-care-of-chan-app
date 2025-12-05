import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, MapPin, X, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface PlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  streetAddress1: string;
  city: string;
  state: string;
  stateCode: string;
  zipCode: string;
  country: string;
  countryCode: string;
  phone: string;
  website: string;
  googleMapsUrl: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  editorialSummary?: string;
  rawPlaceDetails?: Record<string, unknown>;
}

interface GooglePlaceSearchProps {
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  "data-testid"?: string;
}

export function GooglePlaceSearch({
  onPlaceSelect,
  placeholder = "Search for a place...",
  "data-testid": testId,
}: GooglePlaceSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchPlaces = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest("POST", "/api/places/text-search", {
        query: searchQuery,
      });

      if (!response.ok) {
        throw new Error("Failed to search places");
      }

      const data = await response.json();
      setResults(data.places || []);
      setIsOpen(true);
    } catch (err) {
      console.error("Error searching places:", err);
      setError("Failed to search. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = () => {
    searchPlaces(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (place: PlaceResult) => {
    onPlaceSelect(place);
    setQuery(place.name);
    setIsOpen(false);
    setResults([]);
    setSelectedPlace(place);
    setIsDetailsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedPlace(null);
    setIsDetailsOpen(false);
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
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
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
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid={`${testId}-clear`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          type="button"
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          data-testid={`${testId}-button`}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-80 overflow-y-auto">
          {results.map((place, index) => (
            <button
              key={place.placeId || index}
              type="button"
              onClick={() => handleSelect(place)}
              className="w-full px-3 py-2 text-left hover-elevate flex items-start gap-2 border-b last:border-b-0"
              data-testid={`${testId}-result-${index}`}
            >
              <MapPin className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium truncate">{place.name}</div>
                <div className="text-sm text-muted-foreground truncate">
                  {place.formattedAddress}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && !isLoading && query.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-center text-muted-foreground">
          No places found
        </div>
      )}

      {selectedPlace?.rawPlaceDetails && (
        <Collapsible
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          className="mt-3"
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between gap-2"
              data-testid={`${testId}-details-toggle`}
            >
              <span className="text-sm font-medium">
                Google Places API Response
              </span>
              {isDetailsOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="rounded-md border bg-muted/50 p-3 overflow-x-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                {JSON.stringify(selectedPlace.rawPlaceDetails, null, 2)}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
