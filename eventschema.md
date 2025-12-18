# Event Schedule Schema for Deals

## DealEvent

Each deal can have multiple events stored in `eventSchedule` (JSON array).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (UUID) |
| `label` | string | Yes | Event name (e.g., "Wedding Reception", "Corporate Dinner") |
| `durationDays` | number | Yes | How many days the event lasts |
| `scheduleMode` | `"specific"` \| `"flexible"` | Yes | Whether dates are fixed or flexible |
| `schedules` | EventScheduleItem[] | Yes | Array of date options |

## EventScheduleItem

Each event can have multiple schedule options (primary date, alternatives, or date ranges).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (UUID) |
| `kind` | `"primary"` \| `"alternative"` \| `"range"` | Yes | Type of schedule entry |
| `startDate` | string | Conditional | ISO date string (required for `"primary"` or `"alternative"`) |
| `rangeStartMonth` | number | Conditional | Start month 1-12 (required for `"range"`) |
| `rangeStartYear` | number | Conditional | Start year (required for `"range"`) |
| `rangeEndMonth` | number | Conditional | End month 1-12 (required for `"range"`) |
| `rangeEndYear` | number | Conditional | End year (required for `"range"`) |

## Schedule Mode Logic

- **Specific**: Uses `startDate` with `kind: "primary"` or `"alternative"`
- **Flexible**: Uses month/year range fields with `kind: "range"`
