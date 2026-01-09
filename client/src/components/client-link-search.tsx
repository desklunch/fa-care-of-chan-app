import { Building2, Handshake } from "lucide-react";
import {
  EntityLinkSearch,
  type EntityLinkConfig,
} from "@/components/entity-link-search";
import type { Client, Vendor } from "@shared/schema";

export const clientLinkConfig: EntityLinkConfig<Client> = {
  entityType: "client",
  queryKey: ["/api/clients"],
  searchPlaceholder: "Search clients to link...",
  icon: Building2,
  linkEndpoint: (contactId, entityId) =>
    `/api/contacts/${contactId}/clients/${entityId}`,
  unlinkEndpoint: (contactId, entityId) =>
    `/api/contacts/${contactId}/clients/${entityId}`,
  cacheInvalidationKey: (contactId) => ["/api/contacts", contactId, "clients"],
  toastMessages: {
    linked: "Client linked",
    linkedDescription: "Client has been linked to this contact.",
    unlinked: "Client unlinked",
    unlinkedDescription: "Client has been removed from this contact.",
  },
  emptyStateText: (query) => `No clients found matching "${query}"`,
  mapToLinkable: (client) => ({
    id: client.id,
    displayName: client.name,
    badgeText: undefined,
  }),
  testIdPrefix: "client",
};

export const vendorLinkConfig: EntityLinkConfig<Vendor> = {
  entityType: "vendor",
  queryKey: ["/api/vendors"],
  searchPlaceholder: "Search vendors to link...",
  icon: Handshake,
  linkEndpoint: (contactId, entityId) =>
    `/api/contacts/${contactId}/vendors/${entityId}`,
  unlinkEndpoint: (contactId, entityId) =>
    `/api/contacts/${contactId}/vendors/${entityId}`,
  cacheInvalidationKey: (contactId) => ["/api/contacts", contactId, "vendors"],
  toastMessages: {
    linked: "Vendor linked",
    linkedDescription: "Vendor has been linked to this contact.",
    unlinked: "Vendor unlinked",
    unlinkedDescription: "Vendor has been removed from this contact.",
  },
  emptyStateText: (query) => `No vendors found matching "${query}"`,
  mapToLinkable: (vendor) => ({
    id: vendor.id,
    displayName: vendor.businessName,
    badgeText: undefined,
  }),
  testIdPrefix: "vendor",
};

interface ClientLinkSearchProps {
  contactId: string;
  linkedClients: Client[];
  onLink: (client: Client) => void;
  onUnlink: (clientId: string) => void;
  disabled?: boolean;
  showLinkedClients?: boolean;
  autoFocus?: boolean;
  onClose?: () => void;
}

export function ClientLinkSearch({
  contactId,
  linkedClients,
  onLink,
  onUnlink,
  disabled = false,
  showLinkedClients = true,
  autoFocus = false,
  onClose,
}: ClientLinkSearchProps) {
  return (
    <EntityLinkSearch
      contactId={contactId}
      linkedEntities={linkedClients}
      config={clientLinkConfig}
      onLink={onLink as (entity: { id: string }) => void}
      onUnlink={onUnlink}
      disabled={disabled}
      showLinkedEntities={showLinkedClients}
      autoFocus={autoFocus}
      onClose={onClose}
    />
  );
}

interface VendorLinkSearchProps {
  contactId: string;
  linkedVendors: Vendor[];
  onLink: (vendor: Vendor) => void;
  onUnlink: (vendorId: string) => void;
  disabled?: boolean;
  showLinkedVendors?: boolean;
  autoFocus?: boolean;
  onClose?: () => void;
}

export function VendorLinkSearch({
  contactId,
  linkedVendors,
  onLink,
  onUnlink,
  disabled = false,
  showLinkedVendors = true,
  autoFocus = false,
  onClose,
}: VendorLinkSearchProps) {
  return (
    <EntityLinkSearch
      contactId={contactId}
      linkedEntities={linkedVendors}
      config={vendorLinkConfig}
      onLink={onLink as (entity: { id: string }) => void}
      onUnlink={onUnlink}
      disabled={disabled}
      showLinkedEntities={showLinkedVendors}
      autoFocus={autoFocus}
      onClose={onClose}
    />
  );
}
