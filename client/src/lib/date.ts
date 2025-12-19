import { format } from "date-fns";

/**
 * Parse a date-only string (YYYY-MM-DD) as a local date without timezone conversion.
 * This prevents the common issue where "2025-12-01" parsed as UTC midnight
 * displays as "Nov 30" in US timezones.
 * Returns null for invalid inputs.
 */
export function parseDateOnly(dateStr: string | null | undefined): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Format a date-only string (YYYY-MM-DD) for display, avoiding timezone issues.
 * @param dateStr - ISO date string like "2025-12-01"
 * @param formatStr - date-fns format string, defaults to "MMM d, yyyy"
 * @returns formatted string, or empty string if invalid
 */
export function formatDateOnly(dateStr: string | null | undefined, formatStr: string = "MMM d, yyyy"): string {
  const date = parseDateOnly(dateStr);
  if (!date) return "";
  return format(date, formatStr);
}
