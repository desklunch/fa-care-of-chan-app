import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VendorLocation } from "@shared/schema";

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceAutocompleteProps {
  value?: VendorLocation | null;
  onSelect: (location: VendorLocation | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export function PlaceAutocomplete({
  value,
  onSelect,
  placeholder = "Search for a location...",
  className,
  disabled,
  "data-testid": testId,
}: PlaceAutocompleteProps) {
  const [query, setQuery] = useState(value?.displayName || "");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<VendorLocation | null>(value || null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (value) {
      setSelectedLocation(value);
      setQuery(value.displayName || `${value.city}, ${value.region}, ${value.country}`);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
      if (!response.ok) throw new Error("Failed to fetch predictions");
      const data = await response.json();
      setPredictions(data.predictions || []);
      setIsOpen(true);
    } catch (error) {
      console.error("Places autocomplete error:", error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    if (selectedLocation) {
      setSelectedLocation(null);
      onSelect(null);
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(newQuery);
    }, 300);
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setIsLoading(true);
    setIsOpen(false);
    setQuery(prediction.description);

    try {
      const response = await fetch(`/api/places/details?place_id=${prediction.place_id}`);
      if (!response.ok) throw new Error("Failed to fetch place details");
      const data = await response.json();

      const location: VendorLocation = {
        placeId: prediction.place_id,
        city: data.city || "",
        region: data.region || "",
        regionCode: data.regionCode || "",
        country: data.country || "",
        countryCode: data.countryCode || "",
        displayName: prediction.description,
      };

      setSelectedLocation(location);
      onSelect(location);
    } catch (error) {
      console.error("Place details error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSelection = () => {
    setQuery("");
    setSelectedLocation(null);
    setPredictions([]);
    onSelect(null);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-10"
          data-testid={testId}
          onFocus={() => {
            if (predictions.length > 0 && !selectedLocation) {
              setIsOpen(true);
            }
          }}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!isLoading && selectedLocation && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={clearSelection}
            data-testid={`${testId}-clear`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ul className="py-1 max-h-60 overflow-auto">
            {predictions.map((prediction) => (
              <li key={prediction.place_id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover-elevate flex items-start gap-2"
                  onClick={() => handleSelectPrediction(prediction)}
                  data-testid={`${testId}-option-${prediction.place_id}`}
                >
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {prediction.structured_formatting.main_text}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {prediction.structured_formatting.secondary_text}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
