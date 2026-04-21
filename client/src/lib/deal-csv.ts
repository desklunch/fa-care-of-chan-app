import type {
  DealWithRelations,
  DealLocation,
  DealEvent,
  DealService,
} from "@shared/schema";
import type { DealLinkedClientEntry, DealTagEntry } from "@/pages/deals-sandbox";

export interface DealCsvContext {
  servicesMap?: Map<number, DealService>;
  linkedClientsMap?: Map<string, DealLinkedClientEntry[]>;
  dealTagsMap?: Map<string, DealTagEntry[]>;
}

interface ColumnDef {
  header: string;
  get: (deal: DealWithRelations, ctx: DealCsvContext) => unknown;
}

function fullName(
  user: { firstName?: string | null; lastName?: string | null } | null | undefined,
): string {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

function formatTimestamp(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return String(value);
}

function serializeLocations(locations: DealLocation[] | null | undefined): string {
  if (!locations || locations.length === 0) return "";
  return locations.map((loc) => loc.displayName || "").filter(Boolean).join("; ");
}

function serializeEventSchedule(events: DealEvent[] | null | undefined): string {
  if (!events || events.length === 0) return "";
  return JSON.stringify(events);
}

function serializeServiceIds(
  ids: number[] | null | undefined,
  servicesMap?: Map<number, DealService>,
): string {
  if (!ids || ids.length === 0) return "";
  if (!servicesMap) return ids.join("; ");
  return ids.map((id) => servicesMap.get(id)?.name || `Service ${id}`).join("; ");
}

const COLUMNS: ColumnDef[] = [
  { header: "ID", get: (d) => d.id ?? "" },
  { header: "External ID", get: (d) => d.externalId ?? "" },
  { header: "Deal Number", get: (d) => d.dealNumber ?? "" },
  { header: "Display Name", get: (d) => d.displayName ?? "" },
  { header: "Status ID", get: (d) => d.status ?? "" },
  { header: "Status", get: (d) => d.statusName ?? "" },
  { header: "Client ID", get: (d) => d.clientId ?? "" },
  { header: "Client Name", get: (d) => d.client?.name ?? "" },
  { header: "Locations", get: (d) => serializeLocations(d.locations as DealLocation[] | null) },
  {
    header: "Event Schedule",
    get: (d) => serializeEventSchedule(d.eventSchedule as DealEvent[] | null),
  },
  { header: "Service IDs", get: (d) => (d.serviceIds as number[] | null)?.join("; ") ?? "" },
  {
    header: "Services",
    get: (d, ctx) => serializeServiceIds(d.serviceIds as number[] | null, ctx.servicesMap),
  },
  { header: "Location Notes", get: (d) => d.locationsText ?? "" },
  { header: "Concept", get: (d) => d.concept ?? "" },
  { header: "Notes", get: (d) => d.notes ?? "" },
  { header: "Next Steps", get: (d) => d.nextSteps ?? "" },
  { header: "Primary Contact ID", get: (d) => d.primaryContactId ?? "" },
  {
    header: "Primary Contact",
    get: (d) => fullName(d.primaryContact ?? null),
  },
  { header: "Owner ID", get: (d) => d.ownerId ?? "" },
  { header: "Owner", get: (d) => fullName(d.owner ?? null) },
  { header: "Budget Low", get: (d) => d.budgetLow ?? "" },
  { header: "Budget High", get: (d) => d.budgetHigh ?? "" },
  { header: "Budget Notes", get: (d) => d.budgetNotes ?? "" },
  { header: "Started On", get: (d) => d.startedOn ?? "" },
  { header: "Won On", get: (d) => d.wonOn ?? "" },
  { header: "Proposal Sent On", get: (d) => d.proposalSentOn ?? "" },
  { header: "Last Contact On", get: (d) => d.lastContactOn ?? "" },
  { header: "Earliest Event Date", get: (d) => d.earliestEventDate ?? "" },
  { header: "Project Date", get: (d) => d.projectDate ?? "" },
  { header: "Sort Order", get: (d) => d.sortOrder ?? "" },
  { header: "Created By ID", get: (d) => d.createdById ?? "" },
  { header: "Created By", get: (d) => fullName(d.createdBy ?? null) },
  { header: "Created At", get: (d) => formatTimestamp(d.createdAt) },
  { header: "Updated At", get: (d) => formatTimestamp(d.updatedAt) },
  {
    header: "Tags",
    get: (d, ctx) => {
      if (!d.id) return "";
      const tags = ctx.dealTagsMap?.get(d.id) ?? [];
      return tags.map((t) => t.tagName).join("; ");
    },
  },
  {
    header: "Linked Clients",
    get: (d, ctx) => {
      if (!d.id) return "";
      const linked = ctx.linkedClientsMap?.get(d.id) ?? [];
      return linked
        .map((lc) => (lc.label ? `${lc.clientName} (${lc.label})` : lc.clientName))
        .join("; ");
    },
  },
];

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str: string;
  if (typeof value === "string") {
    str = value;
  } else if (value instanceof Date) {
    str = value.toISOString();
  } else if (typeof value === "object") {
    str = JSON.stringify(value);
  } else {
    str = String(value);
  }
  if (str === "") return "";
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeDealsToCsv(
  deals: DealWithRelations[],
  ctx: DealCsvContext = {},
): string {
  const lines: string[] = [];
  lines.push(COLUMNS.map((c) => escapeCsvValue(c.header)).join(","));
  for (const deal of deals) {
    const row = COLUMNS.map((c) => escapeCsvValue(c.get(deal, ctx)));
    lines.push(row.join(","));
  }
  return lines.join("\r\n");
}

export function downloadDealsCsv(
  deals: DealWithRelations[],
  ctx: DealCsvContext = {},
  filename?: string,
): void {
  const csv = serializeDealsToCsv(deals, ctx);
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const name = filename ?? `deals-${y}-${m}-${d}.csv`;

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
