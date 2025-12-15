import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useLayout } from "../hooks/layout-context";
import type { NavItem, NavSection } from "../types/layout";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, navigate] = useLocation();
  const { navigation, user } = useLayout();

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

  const handleSelect = useCallback((href: string) => {
    navigate(href);
    onOpenChange(false);
  }, [navigate, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search pages..." 
        data-testid="input-command-search"
      />
      <CommandList>
        <CommandEmpty>No pages found.</CommandEmpty>
        {visibleNavigation.map((section, sectionIndex) => (
          <CommandGroup 
            key={section.heading || `section-${sectionIndex}`}
            heading={section.heading}
          >
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  value={item.name}
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
