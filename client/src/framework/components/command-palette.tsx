import { useEffect, useState, useCallback, useMemo } from "react";
import { useProtectedLocation } from "@/hooks/useProtectedLocation";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useLayout } from "../hooks/layout-context";
import { usePermissions } from "@/hooks/usePermissions";
import type { NavItem, NavSection } from "../types/layout";
import type { VenueWithRelations, VenueCollectionWithCreator, Deal, Client, Contact, Industry } from "@shared/schema";
import { MapPin, FolderOpen, Tickets, Building2, User } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, navigate] = useProtectedLocation();
  const [search, setSearch] = useState("");
  const { navigation, user } = useLayout();
  const { can } = usePermissions();

  // Fetch venues for global search
  const { data: venues = [] } = useQuery<VenueWithRelations[]>({
    queryKey: ["/api/venues"],
    enabled: open,
  });

  // Fetch collections for global search
  const { data: collections = [] } = useQuery<VenueCollectionWithCreator[]>({
    queryKey: ["/api/venue-collections"],
    enabled: open,
  });

  // Permission-based visibility for search result sections
  const canViewDeals = can("deals.read");
  const canViewClients = can("clients.read");
  const canViewContacts = can("contacts.read");

  // Fetch deals for global search (only if user has permission)
  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
    enabled: open && canViewDeals,
  });

  // Fetch clients for global search (only if user has permission)
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: open && canViewClients,
  });

  // Fetch contacts for global search (only if user has permission)
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    enabled: open && canViewContacts,
  });

  // Fetch industries for client industry lookup
  const { data: industries = [] } = useQuery<Industry[]>({
    queryKey: ["/api/industries"],
    enabled: open,
  });

  // Create industry lookup map
  const industryMap = useMemo(() => {
    return new Map(industries.map((i) => [i.id, i.name]));
  }, [industries]);

  const filterByRole = useCallback((items: NavItem[]) => {
    return items.filter((item) => {
      // New permission-based check takes priority
      if (item.requiredPermission) {
        return can(item.requiredPermission);
      }
      // Legacy role-based check for backward compatibility
      if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
      if (!user?.role) return false;
      return item.allowedRoles.includes(user.role!);
    });
  }, [user?.role, can]);

  const filterSections = useCallback((sections: NavSection[]) => {
    return sections
      .filter((section) => {
        // New permission-based check takes priority
        if (section.requiredPermission) {
          return can(section.requiredPermission);
        }
        // Legacy role-based check for backward compatibility
        if (!section.allowedRoles || section.allowedRoles.length === 0) return true;
        if (!user?.role) return false;
        return section.allowedRoles.includes(user.role);
      })
      .map((section) => ({
        ...section,
        items: filterByRole(section.items).filter(item => item.active !== false),
      }))
      .filter((section) => section.items.length > 0);
  }, [user?.role, filterByRole, can]);

  const visibleNavigation = filterSections(navigation);

  // Filter venues based on search
  const filteredVenues = useMemo(() => {
    if (!search.trim()) return venues.slice(0, 5);
    const searchLower = search.toLowerCase();
    return venues
      .filter((venue) => 
        venue.name.toLowerCase().includes(searchLower) ||
        venue.streetAddress1?.toLowerCase().includes(searchLower) ||
        venue.city?.toLowerCase().includes(searchLower) ||
        venue.neighborhood?.toLowerCase().includes(searchLower)
      )
      .slice(0, 10);
  }, [venues, search]);

  // Filter collections based on search
  const filteredCollections = useMemo(() => {
    if (!search.trim()) return collections.slice(0, 5);
    const searchLower = search.toLowerCase();
    return collections
      .filter((collection) =>
        collection.name.toLowerCase().includes(searchLower) ||
        collection.description?.toLowerCase().includes(searchLower)
      )
      .slice(0, 10);
  }, [collections, search]);

  // Filter deals based on search
  const filteredDeals = useMemo(() => {
    if (!search.trim()) return deals.slice(0, 5);
    const searchLower = search.toLowerCase();
    return deals
      .filter((deal) =>
        deal.displayName?.toLowerCase().includes(searchLower)
      )
      .slice(0, 10);
  }, [deals, search]);

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients.slice(0, 5);
    const searchLower = search.toLowerCase();
    return clients
      .filter((client) =>
        client.name.toLowerCase().includes(searchLower)
      )
      .slice(0, 10);
  }, [clients, search]);

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts.slice(0, 5);
    const searchLower = search.toLowerCase();
    return contacts
      .filter((contact) => {
        const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
        return fullName.includes(searchLower) ||
          contact.firstName.toLowerCase().includes(searchLower) ||
          contact.lastName.toLowerCase().includes(searchLower);
      })
      .slice(0, 10);
  }, [contacts, search]);

  const handleSelect = useCallback((href: string) => {
    navigate(href);
    onOpenChange(false);
    setSearch("");
  }, [navigate, onOpenChange]);

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const hasVenueResults = filteredVenues.length > 0;
  const hasCollectionResults = filteredCollections.length > 0;
  const hasDealResults = canViewDeals && filteredDeals.length > 0;
  const hasClientResults = canViewClients && filteredClients.length > 0;
  const hasContactResults = canViewContacts && filteredContacts.length > 0;
  const hasSearchResults = search.trim() && (hasVenueResults || hasCollectionResults || hasDealResults || hasClientResults || hasContactResults);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search for anything…" 
        data-testid="input-command-search"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {/* Navigation Pages */}
        {visibleNavigation.map((section, sectionIndex) => (
          <CommandGroup 
            key={section.heading || `section-${sectionIndex}`}
            heading={section.heading || "Pages"}
          >
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={`page-${item.name}`}
                  onSelect={() => handleSelect(item.href)}
                  className="cursor-pointer"
                  data-testid={`command-item-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}

        {/* Venues */}
        {hasVenueResults && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Venues">
              {filteredVenues.map((venue) => (
                <CommandItem
                  key={venue.id}
                  value={`venue-${venue.name}-${venue.id}`}
                  onSelect={() => handleSelect(`/venues/${venue.id}`)}
                  className="cursor-pointer"
                  data-testid={`command-item-venue-${venue.id}`}
                >
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{venue.name}</span>
                    {venue.neighborhood && (
                      <span className="text-xs text-muted-foreground">
                        {venue.neighborhood}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Collections */}
        {hasCollectionResults && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Collections">
              {filteredCollections.map((collection) => (
                <CommandItem
                  key={collection.id}
                  value={`collection-${collection.name}-${collection.id}`}
                  onSelect={() => handleSelect(`/venue-collections/${collection.id}`)}
                  className="cursor-pointer"
                  data-testid={`command-item-collection-${collection.id}`}
                >
                  <FolderOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{collection.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {collection.venueCount} {collection.venueCount === 1 ? "venue" : "venues"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Deals */}
        {hasDealResults && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Deals">
              {filteredDeals.map((deal) => (
                <CommandItem
                  key={deal.id}
                  value={`deal-${deal.displayName}-${deal.id}`}
                  onSelect={() => handleSelect(`/deals/${deal.id}`)}
                  className="cursor-pointer"
                  data-testid={`command-item-deal-${deal.id}`}
                >
                  <Tickets className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{deal.displayName}</span>
                    {deal.status && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {deal.status.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Clients */}
        {hasClientResults && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clients">
              {filteredClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={`client-${client.name}-${client.id}`}
                  onSelect={() => handleSelect(`/clients/${client.id}`)}
                  className="cursor-pointer"
                  data-testid={`command-item-client-${client.id}`}
                >
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{client.name}</span>
                    {client.industryId && industryMap.get(client.industryId) && (
                      <span className="text-xs text-muted-foreground">
                        {industryMap.get(client.industryId)}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Contacts */}
        {hasContactResults && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Contacts">
              {filteredContacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={`contact-${contact.firstName}-${contact.lastName}-${contact.id}`}
                  onSelect={() => handleSelect(`/contacts/${contact.id}`)}
                  className="cursor-pointer"
                  data-testid={`command-item-contact-${contact.id}`}
                >
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{contact.firstName} {contact.lastName}</span>
                    {contact.jobTitle && (
                      <span className="text-xs text-muted-foreground">
                        {contact.jobTitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}
