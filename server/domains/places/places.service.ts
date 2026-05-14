import type { ContactLocation } from "@shared/schema";

const ALLOWED_PLACE_TYPES = new Set([
  "locality",
  "postal_town",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "country",
]);

interface CachedLocation {
  data: ContactLocation;
  expiresAt: number;
}

interface CachedTimezone {
  data: { timeZoneId: string; timeZoneName: string };
  expiresAt: number;
}

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const locationCache = new Map<string, CachedLocation>();
const timezoneCache = new Map<string, CachedTimezone>();

function getApiKey(): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Google Places API key not configured");
  return apiKey;
}

export async function getTimezoneForPlace(
  placeId: string,
): Promise<{ timeZoneId: string; timeZoneName: string }> {
  const cached = timezoneCache.get(placeId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const apiKey = getApiKey();
  const detailsResponse = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "location",
      },
    },
  );
  if (!detailsResponse.ok) {
    throw new Error(`Failed to fetch place location: ${detailsResponse.status}`);
  }
  const placeData = await detailsResponse.json();
  const lat = placeData?.location?.latitude;
  const lng = placeData?.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("Place location unavailable");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const tzResponse = await fetch(
    `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${apiKey}`,
  );
  if (!tzResponse.ok) throw new Error("Failed to fetch timezone");
  const tzData = await tzResponse.json();
  if (tzData.status !== "OK" || !tzData.timeZoneId) {
    throw new Error(`Timezone lookup failed: ${tzData.status}`);
  }

  const result = {
    timeZoneId: tzData.timeZoneId as string,
    timeZoneName: (tzData.timeZoneName as string) ?? tzData.timeZoneId,
  };
  timezoneCache.set(placeId, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

export async function validateAndEnrichLocation(
  input: { placeId?: string } & Partial<ContactLocation>,
): Promise<ContactLocation> {
  if (!input.placeId) {
    throw new Error("location.placeId is required");
  }
  const placeId = input.placeId;

  const cached = locationCache.get(placeId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const apiKey = getApiKey();
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_components,formatted_address,types&key=${apiKey}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch place details: ${response.status}`);
  }
  const data = await response.json();
  if (data.status !== "OK" || !data.result) {
    throw new Error(`Place details lookup failed: ${data.status}`);
  }

  const placeTypes: string[] = data.result.types || [];
  const isAllowed = placeTypes.some((t) => ALLOWED_PLACE_TYPES.has(t));
  if (!isAllowed) {
    throw new Error(
      `Location must be a city, region, or country (got: ${placeTypes.join(", ")})`,
    );
  }

  let city = "";
  let region = "";
  let regionCode = "";
  let country = "";
  let countryCode = "";

  for (const component of data.result.address_components || []) {
    const types: string[] = component.types || [];
    if (types.includes("locality") || types.includes("postal_town")) {
      city = component.long_name;
    } else if (!city && types.includes("sublocality_level_1")) {
      city = component.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      region = component.long_name;
      regionCode = component.short_name;
    } else if (types.includes("country")) {
      country = component.long_name;
      countryCode = component.short_name;
    }
  }

  const tz = await getTimezoneForPlace(placeId);

  const result: ContactLocation = {
    city,
    region,
    country,
    placeId,
    regionCode,
    countryCode,
    displayName:
      input.displayName ||
      data.result.formatted_address ||
      [city, region, country].filter(Boolean).join(", "),
    timeZoneId: tz.timeZoneId,
    timeZoneName: tz.timeZoneName,
  };

  locationCache.set(placeId, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
