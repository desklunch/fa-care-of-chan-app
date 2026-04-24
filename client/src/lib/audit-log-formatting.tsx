import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  User,
  Contact,
  Client,
  Tag,
  DealStatusRecord,
  Deal,
  Venue,
  Vendor,
  AppFeature,
  FeatureCategory,
  Industry,
} from "@shared/schema";

export const FIELD_LABELS: Record<string, string> = {
  ownerId: "Owner",
  createdById: "Created By",
  updatedById: "Updated By",
  performedBy: "Performed By",
  assignedUserId: "Assigned To",
  primaryContactId: "Primary Contact",
  contactId: "Contact",
  clientId: "Client",
  tagIds: "Tags",
  status: "Status",
  statusId: "Status",
  displayName: "Name",
  dealNumber: "Deal Number",
  locations: "Locations",
  locationsText: "Locations",
  eventSchedule: "Event Schedule",
  serviceIds: "Services",
  concept: "Concept",
  notes: "Notes",
  nextSteps: "Next Steps",
  budgetHigh: "Budget (High)",
  budgetLow: "Budget (Low)",
  budgetNotes: "Budget Notes",
  startedOn: "Started",
  wonOn: "Won",
  proposalSentOn: "Proposal Sent",
  lastContactOn: "Last Contact",
  earliestEventDate: "Earliest Event Date",
  projectDate: "Project Date",
  sortOrder: "Sort Order",
  dueDate: "Due Date",
  completed: "Completed",
  completedAt: "Completed At",
  title: "Title",
  description: "Description",
  name: "Name",
  email: "Email",
  firstName: "First Name",
  lastName: "Last Name",
  role: "Role",
  externalId: "External ID",
  isActive: "Active",
  isDefault: "Default",
  venueId: "Venue",
  vendorId: "Vendor",
  featureId: "Feature",
  categoryId: "Category",
  industryId: "Industry",
};

const USER_FIELDS = new Set([
  "ownerId",
  "createdById",
  "updatedById",
  "performedBy",
  "assignedUserId",
]);
const CONTACT_FIELDS = new Set(["primaryContactId", "contactId"]);
const CLIENT_FIELDS = new Set(["clientId"]);
const TAG_LIST_FIELDS = new Set(["tagIds"]);
const DEAL_STATUS_FIELDS = new Set(["status", "statusId"]);
const VENUE_FIELDS = new Set(["venueId"]);
const VENDOR_FIELDS = new Set(["vendorId"]);
const FEATURE_FIELDS = new Set(["featureId"]);
const FEATURE_CATEGORY_FIELDS = new Set(["categoryId"]);
const INDUSTRY_FIELDS = new Set(["industryId"]);

export function humanizeFieldKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\bIds?\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!spaced) return key;
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

function userDisplay(u: User): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return name || u.email || u.id;
}

function contactDisplay(c: Contact): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return name || c.id;
}

export interface ResolvedEntity {
  name: string;
  href?: string;
}

export interface AuditValueResolvers {
  resolveValue: (key: string, value: unknown, entityType?: string) => unknown;
  formatValue: (key: string, value: unknown, entityType?: string) => string;
  resolveEntity: (
    entityType: string | null | undefined,
    entityId: string | null | undefined,
  ) => ResolvedEntity | null;
}

export function useAuditValueResolvers(): AuditValueResolvers {
  const staleTime = 5 * 60 * 1000;
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    staleTime,
  });
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    staleTime,
  });
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    staleTime,
  });
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    staleTime,
  });
  const { data: dealStatuses = [] } = useQuery<DealStatusRecord[]>({
    queryKey: ["/api/deal-statuses"],
    staleTime,
  });
  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
    staleTime,
  });
  const { data: venues = [] } = useQuery<Venue[]>({
    queryKey: ["/api/venues"],
    staleTime,
  });
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
    staleTime,
  });
  const { data: features = [] } = useQuery<AppFeature[]>({
    queryKey: ["/api/features"],
    staleTime,
  });
  const { data: featureCategories = [] } = useQuery<FeatureCategory[]>({
    queryKey: ["/api/categories", "includeInactive"],
    queryFn: async () => {
      const res = await fetch("/api/categories?includeInactive=true", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to load categories: ${res.status}`);
      return res.json();
    },
    staleTime,
  });
  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
    staleTime,
  });

  return useMemo<AuditValueResolvers>(() => {
    const userMap = new Map(users.map((u) => [u.id, userDisplay(u)]));
    const contactMap = new Map(contacts.map((c) => [c.id, contactDisplay(c)]));
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));
    const tagMap = new Map(tags.map((t) => [t.id, t.name]));
    const statusMap = new Map(
      dealStatuses.map((s) => [s.id, s.name]),
    );
    const dealMap = new Map(deals.map((d) => [d.id, d.displayName]));
    const venueMap = new Map(venues.map((v) => [v.id, v.name]));
    const vendorMap = new Map(vendors.map((v) => [v.id, v.businessName]));
    const featureMap = new Map(features.map((f) => [f.id, f.title]));
    const featureCategoryMap = new Map(
      featureCategories.map((c) => [c.id, c.name]),
    );
    const industryMap = new Map(industries.map((i) => [i.id, i.name]));

    function resolveValue(key: string, value: unknown, entityType?: string): unknown {
      if (value === null || value === undefined) return value;
      if (USER_FIELDS.has(key) && typeof value === "string") {
        return userMap.get(value) ?? value;
      }
      if (CONTACT_FIELDS.has(key) && typeof value === "string") {
        return contactMap.get(value) ?? value;
      }
      if (CLIENT_FIELDS.has(key) && typeof value === "string") {
        return clientMap.get(value) ?? value;
      }
      if (VENUE_FIELDS.has(key) && typeof value === "string") {
        return venueMap.get(value) ?? value;
      }
      if (VENDOR_FIELDS.has(key) && typeof value === "string") {
        return vendorMap.get(value) ?? value;
      }
      if (FEATURE_FIELDS.has(key) && typeof value === "string") {
        return featureMap.get(value) ?? value;
      }
      if (
        FEATURE_CATEGORY_FIELDS.has(key) &&
        typeof value === "string" &&
        (entityType === undefined || entityType === "feature" || entityType === "category")
      ) {
        return featureCategoryMap.get(value) ?? value;
      }
      if (INDUSTRY_FIELDS.has(key) && typeof value === "string") {
        return industryMap.get(value) ?? value;
      }
      if (TAG_LIST_FIELDS.has(key) && Array.isArray(value)) {
        return value.map((id) => tagMap.get(String(id)) ?? id);
      }
      if (DEAL_STATUS_FIELDS.has(key) && (entityType === undefined || entityType === "deal")) {
        const numeric =
          typeof value === "number"
            ? value
            : typeof value === "string" && /^\d+$/.test(value)
              ? Number(value)
              : null;
        if (numeric !== null) {
          return statusMap.get(numeric) ?? value;
        }
      }
      return value;
    }

    function resolveEntity(
      entityType: string | null | undefined,
      entityId: string | null | undefined,
    ): ResolvedEntity | null {
      if (!entityType || !entityId) return null;
      switch (entityType) {
        case "user":
          return { name: userMap.get(entityId) ?? entityId, href: `/team/${entityId}` };
        case "contact":
          return { name: contactMap.get(entityId) ?? entityId, href: `/contacts/${entityId}` };
        case "client":
          return { name: clientMap.get(entityId) ?? entityId, href: `/clients/${entityId}` };
        case "deal":
          return { name: dealMap.get(entityId) ?? entityId, href: `/deals/${entityId}` };
        case "venue":
          return { name: venueMap.get(entityId) ?? entityId, href: `/venues/${entityId}` };
        case "vendor":
          return { name: vendorMap.get(entityId) ?? entityId, href: `/vendors/${entityId}` };
        case "feature":
          return { name: featureMap.get(entityId) ?? entityId, href: `/app/features/${entityId}` };
        case "category":
        case "featureCategory":
        case "feature_category": {
          const name = featureCategoryMap.get(entityId);
          return name ? { name } : null;
        }
        case "industry": {
          const name = industryMap.get(entityId);
          return name ? { name } : null;
        }
        case "tag": {
          const name = tagMap.get(entityId);
          return name ? { name } : null;
        }
        default:
          return null;
      }
    }

    function formatValue(key: string, value: unknown, entityType?: string): string {
      const resolved = resolveValue(key, value, entityType);
      if (resolved === null || resolved === undefined) return "—";
      if (typeof resolved === "string") return resolved || "—";
      if (typeof resolved === "number" || typeof resolved === "boolean") {
        return String(resolved);
      }
      if (Array.isArray(resolved)) {
        if (resolved.length === 0) return "—";
        return resolved
          .map((v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)))
          .join(", ");
      }
      if (typeof resolved === "object") return JSON.stringify(resolved);
      return String(resolved);
    }

    return { resolveValue, formatValue, resolveEntity };
  }, [
    users,
    contacts,
    clients,
    tags,
    dealStatuses,
    deals,
    venues,
    vendors,
    features,
    featureCategories,
    industries,
  ]);
}
