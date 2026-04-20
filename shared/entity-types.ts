import { z } from "zod";

export const ENTITY_TYPES = [
  "deal",
  "proposal",
  "venue",
  "client",
  "vendor",
  "contact",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const entityTypeSchema = z.enum(ENTITY_TYPES);

export interface EntityMetadata {
  displayName: string;
  permissionPrefix: string;
  routeBase: string;
  iconName: string;
}

export const ENTITY_METADATA: Record<EntityType, EntityMetadata> = {
  deal: {
    displayName: "Deal",
    permissionPrefix: "deals",
    routeBase: "/deals",
    iconName: "Briefcase",
  },
  proposal: {
    displayName: "Proposal",
    permissionPrefix: "proposals",
    routeBase: "/proposals",
    iconName: "FileText",
  },
  venue: {
    displayName: "Venue",
    permissionPrefix: "venues",
    routeBase: "/venues",
    iconName: "Building",
  },
  client: {
    displayName: "Client",
    permissionPrefix: "clients",
    routeBase: "/clients",
    iconName: "Building2",
  },
  vendor: {
    displayName: "Vendor",
    permissionPrefix: "vendors",
    routeBase: "/vendors",
    iconName: "Truck",
  },
  contact: {
    displayName: "Contact",
    permissionPrefix: "contacts",
    routeBase: "/contacts",
    iconName: "User",
  },
};

export function getEntityPermissionPrefix(
  entityType: string,
  overrides?: Readonly<Record<string, string>>,
): string {
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, entityType)) {
    return overrides[entityType];
  }
  return ENTITY_METADATA[entityType as EntityType]?.permissionPrefix ?? entityType;
}
