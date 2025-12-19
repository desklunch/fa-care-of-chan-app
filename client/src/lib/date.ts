import { format } from "date-fns";

/**
 * Parse a date-only string (YYYY-MM-DD) as a local date without timezone conversion.
 * This prevents the common issue where "2025-12-01" parsed as UTC midnight
 * displays as "Nov 30" in US timezones.
 */
export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date-only string (YYYY-MM-DD) for display, avoiding timezone issues.
 * @param dateStr - ISO date string like "2025-12-01"
 * @param formatStr - date-fns format string, defaults to "MMM d, yyyy"
 */
export function formatDateOnly(dateStr: string, formatStr: string = "MMM d, yyyy"): string {
  return format(parseDateOnly(dateStr), formatStr);
}
