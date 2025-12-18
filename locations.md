# Deal Locations Schema Specification

## Overview

Deal locations support three types of geographic selections:
- **Cities** (e.g., "Austin, TX")
- **US States** (e.g., "Texas, USA")
- **Countries** (e.g., "France")

This allows deals to be associated with specific cities, entire US states, or entire countries.

## Data Model

### DealLocation Interface

```typescript
interface DealLocation {
  placeId: string;           // Google Places ID (required)
  city?: string;             // City name (optional - null for state/country-only)
  state?: string;            // State/province name (optional - present for cities and US states)
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
| `city` | string | No | City name (e.g., "Austin"). Omitted for state/country-only locations |
| `state` | string | No | Full state/province name (e.g., "Texas"). Present for cities and US states |
| `stateCode` | string | No | State/province abbreviation (e.g., "TX"). Present for cities and US states |
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
  "displayName": "Austin, TX"
}
```

### US State Locations

When a US state is selected (no specific city), the `city` field is omitted:

```json
{
  "placeId": "ChIJSTKCCzZwQIYRPN4IGI8c6xY",
  "state": "Texas",
  "stateCode": "TX",
  "country": "United States",
  "countryCode": "US",
  "displayName": "Texas, USA"
}
```

### Country-Only Locations

When only a country is selected (no specific city or state), the `city`, `state`, and `stateCode` fields are omitted:

```json
{
  "placeId": "ChIJMVd4MymgVA0R99lHx5Y__Ws",
  "country": "France",
  "countryCode": "FR",
  "displayName": "France"
}
```

## API Endpoint

### POST /api/places/location-search

Searches for cities, US states, and countries matching the query.

**Request Body:**
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
  type: "city" | "state" | "country";
}
```

**Example Request:**
```
POST /api/places/location-search
Content-Type: application/json

{ "query": "Texas" }
```

**Example Response:**
```json
{
  "locations": [
    {
      "placeId": "ChIJSTKCCzZwQIYRPN4IGI8c6xY",
      "state": "Texas",
      "stateCode": "TX",
      "country": "United States",
      "countryCode": "US",
      "displayName": "Texas, USA",
      "formattedAddress": "Texas, USA",
      "type": "state"
    },
    {
      "placeId": "ChIJLwPMoJm1RIYRetVp1EtGm10",
      "city": "Austin",
      "state": "Texas",
      "stateCode": "TX",
      "country": "United States",
      "countryCode": "US",
      "displayName": "Austin, TX",
      "formattedAddress": "Austin, TX, USA",
      "type": "city"
    }
  ]
}
```

## UI Behavior

### Search Component

- Placeholder text: "Search for a city, state, or country..."
- Minimum query length: 2 characters
- Debounce delay: 350ms

### Result Display

| Location Type | Icon | Secondary Text |
|---------------|------|----------------|
| City | MapPin | Full formatted address |
| US State | Map | "US State" |
| Country | Globe | "Country" |

### Selected Location Badges

- Cities display with a **MapPin** icon
- US States display with a **Map** icon
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

## Search Priority

Results are returned in this order:
1. Countries (if query matches)
2. US States (if query matches)
3. Cities

## Backward Compatibility

- Existing locations with `city` populated continue to work unchanged
- The schema change is additive (making fields optional)
- No data migration required for existing records
