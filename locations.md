# Deal Locations Schema Specification

## Overview

Deal locations support both **cities** (e.g., "Austin, TX, USA") and **countries** (e.g., "France"). This allows deals to be associated with specific cities within a country or with an entire country when a specific city is not applicable.

## Data Model

### DealLocation Interface

```typescript
interface DealLocation {
  placeId: string;           // Google Places ID (required)
  city?: string;             // City name (optional - null for country-only)
  state?: string;            // State/province name (optional)
  stateCode?: string;        // State/province abbreviation (optional)
  country: string;           // Country name (required)
  countryCode: string;       // ISO country code (required)
  displayName: string;       // Human-readable display name (required)
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `placeId` | string | Yes | Unique identifier from Google Places API |
| `city` | string | No | City name (e.g., "Austin"). Omitted for country-only locations |
| `state` | string | No | Full state/province name (e.g., "Texas") |
| `stateCode` | string | No | State/province abbreviation (e.g., "TX") |
| `country` | string | Yes | Full country name (e.g., "United States") |
| `countryCode` | string | Yes | ISO 3166-1 alpha-2 country code (e.g., "US") |
| `displayName` | string | Yes | Formatted display string for UI rendering |

## Location Types

### City Locations

When a specific city is selected, all fields are populated:

```json
{
  "placeId": "ChIJLwPMoJm1RIYRetVp1EtGm10",
  "city": "Austin",
  "state": "Texas",
  "stateCode": "TX",
  "country": "United States",
  "countryCode": "US",
  "displayName": "Austin, TX, USA"
}
```

### Country-Only Locations

When only a country is selected (no specific city), the `city`, `state`, and `stateCode` fields are omitted:

```json
{
  "placeId": "ChIJMVd4MymgVA0R99lHx5Y__Ws",
  "country": "France",
  "countryCode": "FR",
  "displayName": "France"
}
```

## API Endpoint

### GET /api/places/location-search

Searches for both cities and countries matching the query.

**Query Parameters:**
- `query` (required): Search term (minimum 2 characters)

**Response:**
```typescript
interface LocationResult {
  placeId: string;
  city?: string;
  state?: string;
  stateCode?: string;
  country: string;
  countryCode: string;
  displayName: string;
  formattedAddress: string;
  type: "city" | "country";
}
```

**Example Request:**
```
GET /api/places/location-search?query=France
```

**Example Response:**
```json
[
  {
    "placeId": "ChIJMVd4MymgVA0R99lHx5Y__Ws",
    "country": "France",
    "countryCode": "FR",
    "displayName": "France",
    "formattedAddress": "France",
    "type": "country"
  },
  {
    "placeId": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
    "city": "Paris",
    "state": "Ile-de-France",
    "stateCode": "IDF",
    "country": "France",
    "countryCode": "FR",
    "displayName": "Paris, France",
    "formattedAddress": "Paris, France",
    "type": "city"
  }
]
```

## UI Behavior

### Search Component

- Placeholder text: "Search for a city or country..."
- Minimum query length: 2 characters
- Debounce delay: 350ms

### Result Display

| Location Type | Icon | Secondary Text |
|---------------|------|----------------|
| City | MapPin | Full formatted address |
| Country | Globe | "Country" |

### Selected Location Badges

- Cities display with a **MapPin** icon
- Countries display with a **Globe** icon
- Badge shows the `displayName` value

## Validation

The Zod schema enforces:

```typescript
const dealLocationSchema = z.object({
  placeId: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  country: z.string(),
  countryCode: z.string(),
  displayName: z.string(),
});
```

## Database Storage

Locations are stored as a JSONB array in the `deals` table:

```sql
locations JSONB DEFAULT '[]'::jsonb
```

## Backward Compatibility

- Existing locations with `city` populated continue to work unchanged
- The schema change is additive (making fields optional)
- No data migration required for existing records
