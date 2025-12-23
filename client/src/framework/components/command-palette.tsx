import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
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
import type { NavItem, NavSection } from "../types/layout";
import type { VenueWithRelations, VenueCollectionWithCreator, Deal } from "@shared/schema";
import { MapPin, FolderOpen, Ticket } from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const { navigation, user } = useLayout();

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

  // Fetch deals for global search
  const { data: deals = [] } = useQuery<Deal[]>({
    queryKey: ["/api/deals"],
    enabled: open,
  });

  const filterByRole = useCallback((items: NavItem[]) => {
    if (!user?.role) return items;
    return items.filter((item) => {
      if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
      return item.allowedRoles.includes(user.role!);
    });
  }, [user?.role]);

  const filterSections = useCallback((sections: NavSection[]) => {
    return sections
      .filter((section) => {
        if (!section.allowedRoles || section.allowedRoles.length === 0) return true;
        if (!user?.role) return false;
        return section.allowedRoles.includes(user.role);
      })
      .map((section) => ({
        ...section,
        items: filterByRole(section.items).filter(item => item.active !== false),
      }))
      .filter((section) => section.items.length > 0);
  }, [user?.role, filterByRole]);

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
  const hasDealResults = filteredDeals.length > 0;
  const hasSearchResults = search.trim() && (hasVenueResults || hasCollectionResults || hasDealResults);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search pages, venues, collections, and deals..." 
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
                  <Ticket className="mr-2 h-4 w-4 text-muted-foreground" />
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
