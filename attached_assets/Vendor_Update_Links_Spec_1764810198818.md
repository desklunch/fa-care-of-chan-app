# Vendor Contact Information Collection Links - Technical Specification

## Overview
The Vendor Update Links feature allows staff to generate secure, single-use URLs that vendors can use to update their own profile information without logging in. This enables efficient vendor data collection and verification while maintaining data integrity through token-based access control.

---

## Core Concepts

### Purpose
- Collect and verify vendor contact information
- Allow vendors to self-update their profile data
- Maintain a fixed, standardized form structure (unlike customizable RFI forms)
- Single-use tokens prevent unauthorized repeated access

### Workflow
```
1. Staff generates link → POST /api/vendors/:id/generate-update-link
2. Staff shares link → Email/message to vendor
3. Vendor opens link → /vendor-update/:token (public)
4. Form pre-fills → Existing vendor data displayed
5. Vendor submits → Updates applied, token marked used
6. Link expires → Cannot be reused
```

### Token Lifecycle
```
Generated → Active → Used/Expired
    │          │          │
    │          │          └─► Token invalidated
    │          └─► Valid for 30 days (default)
    └─► Cryptographically secure 64-char hex
```

---

## Database Schema

### `vendor_update_tokens`
```
vendor_update_tokens:
├── id (serial, PK, NOT NULL)
├── vendorId (FK → vendors.id, cascade delete, NOT NULL)
├── token (varchar 255, unique, NOT NULL)
├── used (boolean, NOT NULL, default: false)
├── expiresAt (timestamp, NOT NULL)
├── createdAt (timestamp)

Indexes:
├── on token
└── on vendorId
```

---

## API Endpoints

### Protected (Requires Authentication)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/vendors/:id/generate-update-link` | Generate new update link for vendor |

#### Generate Link Response
```json
{
  "url": "https://example.com/vendor-update/abc123...",
  "token": "abc123...",
  "expiresAt": "2025-01-03T12:00:00.000Z"
}
```

### Public (No Authentication)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vendor-update/:token` | Get vendor data for form pre-fill |
| POST | `/api/vendor-update/:token` | Submit vendor updates |

---

## Form Fields

### Fixed Form Structure
The update form uses a standardized set of fields (not customizable like RFI forms):

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| businessName | text | Yes | min 1 char |
| serviceIds | number[] | Yes | min 1 selection |
| address | textarea | No | - |
| phone | text | No | - |
| email | text | No | valid email |
| website | url | No | valid URL |
| capabilitiesDeck | url | No | valid URL |
| employeeCount | text | No | - |
| diversityInfo | textarea | No | - |
| chargesSalesTax | boolean | No | - |
| salesTaxNotes | text | No | - |
| locations | jsonb (Location[]) | No | US cities via Google Places autocomplete |

### Restricted Fields (Not Editable by Vendor)
The following vendor fields are NOT exposed in the public form:
- `isPreferred` - Internal preference flag
- `notes` - Internal staff notes

---

## Frontend Page

| Route | Component | Description | Auth Required |
|-------|-----------|-------------|---------------|
| `/vendor-update/:token` | `vendor-update-form.tsx` | Public vendor self-update form | No |

### UI States
1. **Loading** - Spinner while fetching vendor data
2. **Invalid/Expired** - Error card with contact instructions
3. **Form** - Pre-filled form with current vendor data
4. **Success** - Confirmation that link is now expired

---

## TypeScript Types

```typescript
// Token generation response
interface GenerateLinkResponse {
  url: string;
  token: string;
  expiresAt: string;
}

// Location object structure (from Google Places API)
interface Location {
  city: string;
  region: string;
  country: string;
  placeId: string;
  regionCode: string;
  countryCode: string;
  displayName: string;
}

// Vendor with services (returned from GET endpoint)
type VendorWithServices = Vendor & {
  services?: VendorService[];
};

// Update form validation schema
const vendorUpdateSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  capabilitiesDeck: z.string().url("Invalid URL").optional().or(z.literal("")),
  employeeCount: z.string().optional(),
  diversityInfo: z.string().optional(),
  chargesSalesTax: z.boolean().optional(),
  salesTaxNotes: z.string().optional(),
  locations: z.array(z.object({
    city: z.string(),
    region: z.string(),
    country: z.string(),
    placeId: z.string(),
    regionCode: z.string(),
    countryCode: z.string(),
    displayName: z.string(),
  })).optional(),
});

// Submitted data includes service IDs
interface VendorUpdateSubmission extends z.infer<typeof vendorUpdateSchema> {
  serviceIds: number[];
}
```

### Location Object Structure
```json
[
  {
    "city": "New York",
    "region": "New York",
    "country": "United States",
    "placeId": "ChIJOwg_06VPwokRYv534QaPC8g",
    "regionCode": "NY",
    "countryCode": "US",
    "displayName": "New York, New York"
  },
  {
    "city": "Los Angeles",
    "region": "California",
    "country": "United States",
    "placeId": "ChIJE9on3F3HwoAR9AhGJW_fL-I",
    "regionCode": "CA",
    "countryCode": "US",
    "displayName": "Los Angeles, California"
  }
]
```

---

## Storage Interface

```typescript
interface IStorage {
  // Token management
  createVendorUpdateToken(
    vendorId: number, 
    expiresInHours?: number // default: 720 (30 days)
  ): Promise<{ token: string; expiresAt: Date }>;
  
  getVendorByToken(
    token: string
  ): Promise<(Vendor & { services: VendorService[] }) | undefined>;
  
  markTokenAsUsed(token: string): Promise<void>;
  
  deleteExpiredTokens(): Promise<void>;
}
```

---

## Security

### Token Generation
- 64-character hexadecimal string
- Generated using `crypto.getRandomValues()`
- Cryptographically secure random bytes

```typescript
const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');
```

### Token Validation
- Must exist in database
- Must not be marked as `used`
- Must not be past `expiresAt`

```sql
WHERE token = :token
  AND used = false
  AND expires_at > NOW()
```

### Field Restrictions
- Backend validates against whitelist of allowed fields
- Internal fields cannot be modified via public endpoint
- URL normalization applied to website and capabilitiesDeck

---

## URL Normalization

URLs submitted through the form are normalized:
- Hostnames converted to lowercase
- Case-sensitive paths preserved
- Query parameters and fragments preserved

```typescript
if (vendorData.website !== undefined) {
  vendorData.website = normalizeUrl(vendorData.website);
}
if (vendorData.capabilitiesDeck !== undefined) {
  vendorData.capabilitiesDeck = normalizeUrl(vendorData.capabilitiesDeck);
}
```

---

## Service Type Selection

Vendors must select at least one service type from the available options:

### UI Component
- Clickable badge grid
- Toggle selection on click
- Visual distinction for selected vs unselected
- Count display showing number selected

### Validation
- Frontend: Custom validation before form submission
- Backend: Service IDs validated and synced via `setVendorServices()`
