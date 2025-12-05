import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface ParsedAddress {
  streetAddress1: string;
  streetAddress2: string;
  city: string;
  state: string;
  zipCode: string;
  formattedAddress: string;
}

interface VenueAddressAutocompleteProps {
  value?: string;
  onAddressSelect: (address: ParsedAddress) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

function parseAddressComponents(components: AddressComponent[]): Omit<ParsedAddress, 'formattedAddress'> {
  let streetNumber = "";
  let route = "";
  let city = "";
  let state = "";
  let zipCode = "";
  let subpremise = "";

  for (const component of components) {
    const types = component.types;
    
    if (types.includes("street_number")) {
      streetNumber = component.long_name;
    } else if (types.includes("route")) {
      route = component.long_name;
    } else if (types.includes("subpremise")) {
      subpremise = component.long_name;
    } else if (types.includes("locality")) {
      city = component.long_name;
    } else if (types.includes("sublocality_level_1") && !city) {
      city = component.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      state = component.short_name;
    } else if (types.includes("postal_code")) {
      zipCode = component.long_name;
    }
  }

  const streetAddress1 = [streetNumber, route].filter(Boolean).join(" ");
  const streetAddress2 = subpremise;

  return {
    streetAddress1,
    streetAddress2,
    city,
    state,
    zipCode,
  };
}

export function VenueAddressAutocomplete({
  value = "",
  onAddressSelect,
  placeholder = "Search for a venue address...",
  className,
  disabled,
  "data-testid": testId,
}: VenueAddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setQuery(value);
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
      const response = await fetch(`/api/places/address-autocomplete?input=${encodeURIComponent(input)}`);
      if (!response.ok) throw new Error("Failed to fetch predictions");
      const data = await response.json();
      setPredictions(data.predictions || []);
      setIsOpen(true);
    } catch (error) {
      console.error("Address autocomplete error:", error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

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
      const response = await fetch(`/api/places/address-details?place_id=${prediction.place_id}`);
      if (!response.ok) throw new Error("Failed to fetch address details");
      const data = await response.json();

      const parsedAddress = parseAddressComponents(data.addressComponents || []);
      
      onAddressSelect({
        ...parsedAddress,
        formattedAddress: data.formattedAddress || prediction.description,
      });
      
      setPredictions([]);
    } catch (error) {
      console.error("Address details error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSelection = () => {
    setQuery("");
    setPredictions([]);
    onAddressSelect({
      streetAddress1: "",
      streetAddress2: "",
      city: "",
      state: "",
      zipCode: "",
      formattedAddress: "",
    });
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative flex items-center">
        <MapPin className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-9 pr-10 w-full"
          data-testid={testId}
          onFocus={() => {
            if (predictions.length > 0) {
              setIsOpen(true);
            }
          }}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground pointer-events-none" />
        )}
        {!isLoading && query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 h-7 w-7"
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
