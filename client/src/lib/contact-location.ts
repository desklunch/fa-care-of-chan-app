import type { ContactLocation, VendorLocation } from "@shared/schema";

export async function resolveContactLocationTimezone(
  base: VendorLocation,
): Promise<ContactLocation> {
  const result: ContactLocation = {
    city: base.city || "",
    region: base.region || "",
    country: base.country || "",
    placeId: base.placeId,
    regionCode: base.regionCode,
    countryCode: base.countryCode,
    displayName: base.displayName,
  };

  if (!base.placeId) return result;

  try {
    const res = await fetch(
      `/api/places/${encodeURIComponent(base.placeId)}/timezone`,
    );
    if (!res.ok) return result;
    const data = await res.json();
    if (data?.timeZoneId) {
      result.timeZoneId = data.timeZoneId;
      result.timeZoneName = data.timeZoneName;
    }
  } catch (err) {
    console.error("Failed to resolve timezone:", err);
  }

  return result;
}

export function formatLocationDisplay(
  location: ContactLocation | null | undefined,
): string {
  if (!location) return "";
  return (
    location.displayName ||
    [location.city, location.region, location.country].filter(Boolean).join(", ")
  );
}

export function getViewerOffsetLabel(
  location: ContactLocation | null | undefined,
  viewerTz?: string,
): string | null {
  if (!location?.timeZoneId) return null;
  try {
    const viewer =
      viewerTz || Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (viewer === location.timeZoneId) return null;

    const now = new Date();
    const viewerOffset = getOffsetMinutes(viewer, now);
    const contactOffset = getOffsetMinutes(location.timeZoneId, now);
    const diffMinutes = contactOffset - viewerOffset;
    if (diffMinutes === 0) return null;

    const sign = diffMinutes > 0 ? "+" : "-";
    const absMinutes = Math.abs(diffMinutes);
    const hours = Math.floor(absMinutes / 60);
    const minutes = absMinutes % 60;
    const hoursText =
      minutes === 0 ? `${hours}` : `${hours}:${String(minutes).padStart(2, "0")}`;
    const unit = minutes === 0 && hours === 1 ? "hour" : "hours";
    return `${sign}${hoursText} ${unit}`;
  } catch (err) {
    console.error("Failed to compute viewer offset:", err);
    return null;
  }
}

function getOffsetMinutes(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = parseInt(p.value, 10);
  }
  const asUTC = Date.UTC(
    map.year,
    (map.month || 1) - 1,
    map.day,
    map.hour,
    map.minute,
    map.second,
  );
  return Math.round((asUTC - date.getTime()) / 60000);
}

