import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MapPin, X, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StructuredAddress {
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  placeId: string;
  formatted: string;
}

export const EMPTY_ADDRESS: StructuredAddress = {
  street1: "",
  street2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  placeId: "",
  formatted: "",
};

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

function parseComponents(
  components: AddressComponent[],
): Omit<StructuredAddress, "placeId" | "formatted"> {
  let streetNumber = "";
  let route = "";
  let subpremise = "";
  let city = "";
  let state = "";
  let postalCode = "";
  let country = "";

  for (const c of components) {
    const t = c.types;
    if (t.includes("street_number")) streetNumber = c.long_name;
    else if (t.includes("route")) route = c.long_name;
    else if (t.includes("subpremise")) subpremise = c.long_name;
    else if (t.includes("locality")) city = c.long_name;
    else if (t.includes("postal_town") && !city) city = c.long_name;
    else if (t.includes("sublocality_level_1") && !city) city = c.long_name;
    else if (t.includes("administrative_area_level_1")) state = c.long_name;
    else if (t.includes("postal_code")) postalCode = c.long_name;
    else if (t.includes("country")) country = c.long_name;
  }

  return {
    street1: [streetNumber, route].filter(Boolean).join(" "),
    street2: subpremise,
    city,
    state,
    postalCode,
    country,
  };
}

export function formatStructuredAddress(a: StructuredAddress): string {
  if (a.formatted) return a.formatted;
  const lines = [
    [a.street1, a.street2].filter(Boolean).join(", "),
    [a.city, a.state, a.postalCode].filter(Boolean).join(" "),
    a.country,
  ].filter(Boolean);
  return lines.join(", ");
}

export function isAddressEmpty(a: StructuredAddress | null | undefined): boolean {
  if (!a) return true;
  return (
    !a.street1 &&
    !a.street2 &&
    !a.city &&
    !a.state &&
    !a.postalCode &&
    !a.country
  );
}

interface AddressFieldEditorProps {
  value: StructuredAddress;
  onChange: (value: StructuredAddress) => void;
  legacyValue?: string | null;
  testId?: string;
  disabled?: boolean;
}

export function AddressFieldEditor({
  value,
  onChange,
  legacyValue,
  testId = "address-field",
  disabled,
}: AddressFieldEditorProps) {
  const [query, setQuery] = useState(
    value.formatted || legacyValue || "",
  );
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFields, setShowFields] = useState(
    !isAddressEmpty(value) || !!legacyValue,
  );
  const [fetchError, setFetchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
    setFetchError(null);
    try {
      const response = await fetch(
        `/api/places/address-autocomplete?input=${encodeURIComponent(input)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch address suggestions");
      const data = await response.json();
      setPredictions(data.predictions || []);
      setIsOpen(true);
    } catch (error) {
      console.error("Address autocomplete error:", error);
      setPredictions([]);
      setFetchError(
        "Couldn't load address suggestions. You can still enter the address manually below.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onChange({
      ...EMPTY_ADDRESS,
      formatted: newQuery,
    });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(newQuery), 300);
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setIsLoading(true);
    setFetchError(null);
    setIsOpen(false);
    setQuery(prediction.description);
    try {
      const response = await fetch(
        `/api/places/address-details?place_id=${prediction.place_id}`,
      );
      if (!response.ok) throw new Error("Failed to fetch address details");
      const data = await response.json();
      const parsed = parseComponents(data.addressComponents || []);
      const next: StructuredAddress = {
        ...parsed,
        placeId: prediction.place_id,
        formatted: data.formattedAddress || prediction.description,
      };
      setQuery(next.formatted);
      onChange(next);
      setShowFields(true);
      setPredictions([]);
    } catch (error) {
      console.error("Address details error:", error);
      setFetchError(
        "Couldn't load details for that address. Try another suggestion or enter it manually.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setPredictions([]);
    onChange(EMPTY_ADDRESS);
    setShowFields(false);
  };

  const updateField = (
    key: keyof Omit<StructuredAddress, "placeId" | "formatted">,
    val: string,
  ) => {
    const next = { ...value, [key]: val };
    next.formatted = formatStructuredAddress({ ...next, formatted: "" });
    next.placeId = "";
    onChange(next);
    setQuery(next.formatted);
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="relative">
        <div className="relative flex items-center">
          <MapPin className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            value={query}
            onChange={handleQueryChange}
            placeholder="Search an address..."
            disabled={disabled}
            className="pl-9 pr-10 w-full"
            data-testid={`${testId}-search`}
            onFocus={() => {
              if (predictions.length > 0) setIsOpen(true);
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
              onClick={clearSearch}
              data-testid={`${testId}-clear`}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {fetchError && (
          <p
            className="mt-1 text-xs text-destructive"
            data-testid={`${testId}-fetch-error`}
          >
            {fetchError}
          </p>
        )}

        {isOpen && predictions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
            <ul className="py-1 max-h-60 overflow-auto">
              {predictions.map((p) => (
                <li key={p.place_id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover-elevate flex items-start gap-2"
                    onClick={() => handleSelectPrediction(p)}
                    data-testid={`${testId}-option-${p.place_id}`}
                  >
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {p.structured_formatting.main_text}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.structured_formatting.secondary_text}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {!showFields ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowFields(true)}
          data-testid={`${testId}-manual-entry`}
          disabled={disabled}
        >
          <Pencil className="h-3 w-3 mr-1" />
          Enter address manually
        </Button>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor={`${testId}-street1`} className="text-xs">
              Street Address 1
            </Label>
            <Input
              id={`${testId}-street1`}
              value={value.street1}
              onChange={(e) => updateField("street1", e.target.value)}
              disabled={disabled}
              data-testid={`${testId}-street1`}
            />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor={`${testId}-street2`} className="text-xs">
              Street Address 2
            </Label>
            <Input
              id={`${testId}-street2`}
              value={value.street2}
              onChange={(e) => updateField("street2", e.target.value)}
              disabled={disabled}
              data-testid={`${testId}-street2`}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${testId}-city`} className="text-xs">
              City
            </Label>
            <Input
              id={`${testId}-city`}
              value={value.city}
              onChange={(e) => updateField("city", e.target.value)}
              disabled={disabled}
              data-testid={`${testId}-city`}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${testId}-state`} className="text-xs">
              State / Region
            </Label>
            <Input
              id={`${testId}-state`}
              value={value.state}
              onChange={(e) => updateField("state", e.target.value)}
              disabled={disabled}
              data-testid={`${testId}-state`}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${testId}-postal`} className="text-xs">
              Postal Code
            </Label>
            <Input
              id={`${testId}-postal`}
              value={value.postalCode}
              onChange={(e) => updateField("postalCode", e.target.value)}
              disabled={disabled}
              data-testid={`${testId}-postal`}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${testId}-country`} className="text-xs">
              Country
            </Label>
            <Input
              id={`${testId}-country`}
              value={value.country}
              onChange={(e) => updateField("country", e.target.value)}
              disabled={disabled}
              data-testid={`${testId}-country`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface AddressFieldProps {
  label?: string | null;
  value: StructuredAddress;
  legacyValue?: string | null;
  onSave: (value: StructuredAddress) => void | Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  error?: string | null;
  testId?: string;
}

export function AddressField({
  label,
  value,
  legacyValue,
  onSave,
  disabled,
  isLoading,
  error,
  testId = "field-address",
}: AddressFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<StructuredAddress>(value);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  const empty = isAddressEmpty(value);
  const hasLegacy = !empty ? false : !!(legacyValue && legacyValue.trim());

  const handleSave = async () => {
    try {
      await onSave(draft);
      setIsEditing(false);
    } catch {
      // Stay in edit mode so the user can see the error and retry
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-3" data-testid={`${testId}-editor`}>
        {label && (
          <div className="text-xs font-medium text-muted-foreground">
            {label}
          </div>
        )}
        <AddressFieldEditor
          value={draft}
          onChange={setDraft}
          legacyValue={legacyValue}
          testId={testId}
          disabled={disabled || isLoading}
        />
        {error && (
          <p
            className="text-sm text-destructive"
            data-testid={`${testId}-error`}
          >
            {error}
          </p>
        )}
        <div className="flex gap-3 pt-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
            data-testid={`${testId}-save`}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            data-testid={`${testId}-cancel`}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-start justify-between gap-3 rounded-md py-1",
        !disabled && "hover-elevate cursor-pointer px-2 -mx-2",
      )}
      onClick={() => {
        if (!disabled) setIsEditing(true);
      }}
      data-testid={testId}
    >
      <div className="flex-1 min-w-0">
        {label && (
          <div className="text-xs font-medium text-muted-foreground mb-1">
            {label}
          </div>
        )}
        {empty && !hasLegacy ? (
          <span className="text-sm text-muted-foreground">+ Add</span>
        ) : hasLegacy ? (
          <div
            className="text-sm whitespace-pre-line"
            data-testid={`${testId}-legacy-display`}
          >
            {legacyValue}
          </div>
        ) : (
          <div className="text-sm space-y-0.5" data-testid={`${testId}-display`}>
            {value.street1 && <div>{value.street1}</div>}
            {value.street2 && <div>{value.street2}</div>}
            {(value.city || value.state || value.postalCode) && (
              <div>
                {[
                  value.city,
                  [value.state, value.postalCode].filter(Boolean).join(" "),
                ]
                  .filter(Boolean)
                  .join(", ")}
              </div>
            )}
            {value.country && <div>{value.country}</div>}
          </div>
        )}
      </div>
      {!disabled && (
        <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 mt-1 shrink-0" />
      )}
    </div>
  );
}
