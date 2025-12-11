import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ChevronUp,
  LogOut,
  Sun,
  Moon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLayout } from "../hooks/layout-context";
import { useTheme } from "@/lib/theme-provider";
import Logo from "./logo";
import type { NavItem, NavSection } from "../types/layout";

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const { user, navigation, onSignOut } = useLayout();
  const { resolvedTheme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMediumScreen, setIsMediumScreen] = useState(false);
  const prevLocationRef = useRef("");

  const [groupCollapsedState, setGroupCollapsedState] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    const saved = sessionStorage.getItem("sidebar-groups-collapsed");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    const initial: Record<string, boolean> = {};
    navigation.forEach((section) => {
      if (section.heading) {
        initial[section.heading] = section.defaultCollapsed ?? false;
      }
    });
    return initial;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "sidebar-groups-collapsed",
        JSON.stringify(groupCollapsedState)
      );
    }
  }, [groupCollapsedState]);

  const toggleGroup = (heading: string) => {
    setGroupCollapsedState((prev) => ({
      ...prev,
      [heading]: !prev[heading],
    }));
  };

  const filterByRole = (items: NavItem[]) => {
    if (!user?.role) return items;
    return items.filter((item) => {
      if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
      return item.allowedRoles.includes(user.role!);
    });
  };

  const filterSections = (sections: NavSection[]) => {
    return sections
      .filter((section) => {
        if (!section.allowedRoles || section.allowedRoles.length === 0) return true;
        if (!user?.role) return false;
        return section.allowedRoles.includes(user.role);
      })
      .map((section) => ({
        ...section,
        items: filterByRole(section.items),
      }))
      .filter((section) => section.items.length > 0);
  };

  const visibleNavigation = filterSections(navigation);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const wasMediumScreen = isMediumScreen;
      const nowMediumScreen = width >= 768 && width < 1024;
      const isSmallScreen = width < 768;
      const isLargeScreen = width >= 1024;

      setIsMediumScreen(nowMediumScreen);

      if (isSmallScreen) {
        setIsCollapsed(false);
      } else if (nowMediumScreen && !wasMediumScreen) {
        setIsCollapsed(true);
      } else if (isLargeScreen && wasMediumScreen) {
        setIsCollapsed(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [isMediumScreen]);

  const isSmallScreen =
    typeof window !== "undefined" && window.innerWidth < 768;
  const showExpanded = isSmallScreen
    ? true
    : isMediumScreen
      ? isHovered
      : !isCollapsed;

  useEffect(() => {
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "";
    if (prevLocationRef.current !== currentPath && prevLocationRef.current !== "") {
      onMobileClose();
      if (isMediumScreen) {
        setIsHovered(false);
      }
    }
    prevLocationRef.current = currentPath;
  }, [typeof window !== "undefined" ? window.location.pathname : "", isMediumScreen, onMobileClose]);

  const handleMouseEnter = () => {
    if (isMediumScreen) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (isMediumScreen) {
      setIsHovered(false);
    }
  };

  if (!isMobileOpen && typeof window !== "undefined" && window.innerWidth < 768) {
    return null;
  }

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "bg-sidebar border-r border-sidebar-border z-50 transition-all duration-200",
          "flex flex-col h-full",
          "lg:relative lg:z-auto",
          isCollapsed && !isMediumScreen && "lg:w-[72px]",
          !isCollapsed && !isMediumScreen && "lg:w-[280px]",
          "md:relative md:z-50",
          isMediumScreen && isHovered && "md:w-[280px] md:shadow-xl",
          isMediumScreen && !isHovered && "md:w-[72px]",
          isMobileOpen ? "fixed inset-y-0 left-0 w-[280px]" : "hidden md:flex"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-testid="sidebar-main"
      >
        <div className="h-[72px] border-b border-sidebar-border flex items-center justify-between p-3 pl-4">
          <Button
            variant="ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-0 flex items-center gap-4 transparent"
            data-testid="button-toggle-sidebar"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Logo width="36" collapsed={!showExpanded} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileClose}
            className="h-8 w-8 p-0 md:hidden"
            data-testid="button-close-sidebar"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>

          {showExpanded && !isMediumScreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0 hidden lg:flex"
              data-testid="button-collapse-sidebar"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 py-3 space-y-1" data-testid="nav-sidebar">
          {visibleNavigation.map((section, sectionIndex) => {
            const isGroupCollapsed = section.heading
              ? groupCollapsedState[section.heading] || false
              : false;

            return (
              <div
                className={sectionIndex === 0 ? "" : "mt-4"}
                key={section.heading || `section-${sectionIndex}`}
              >
                {section.heading && showExpanded && (
                  <button
                    onClick={() => toggleGroup(section.heading!)}
                    className={cn(
                      "w-full h-8 rounded-md flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-3 pr-1 py-1 mb-1 hover:bg-sidebar-accent transition-colors",
                      sectionIndex === 0 ? "mt-0" : "mt-2"
                    )}
                    data-testid={`button-toggle-section-${section.heading.toLowerCase().replace(/\s+/g, "-")}`}
                    aria-label={`Toggle ${section.heading} section`}
                  >
                    <span>{section.heading}</span>
                    {isGroupCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </button>
                )}

                {!isGroupCollapsed && (
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isEnabled = item.active !== false;
                      const isActive = typeof window !== "undefined" && window.location.pathname === item.href;

                      const navItemClasses = cn(
                        "flex items-center gap-3 px-3 py-2 font-medium  rounded-lg transition-colors duration-150 relative",
                        isEnabled && "hover:bg-sidebar-accent",
                        isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
                        !showExpanded && "justify-center",
                        !isEnabled && "opacity-40 cursor-not-allowed pointer-events-none"
                      );

                      const navContent = isEnabled ? (
                        <Link
                          href={item.href}
                          className={navItemClasses}
                          aria-label={showExpanded ? undefined : item.name}
                          data-testid={`link-nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                          {showExpanded && (
                            <span className="text-sm flex-1">{item.name}</span>
                          )}
                          {item.badge !== undefined && item.badge !== null && (
                            <span
                              className={cn(
                                "rounded-full bg-primary text-foreground font-semibold flex items-center justify-center",
                                showExpanded
                                  ? "h-5 min-w-[20px] px-1.5 text-xs"
                                  : "absolute -top-0.5 -right-0.5 h-3 w-3 text-[8px]"
                              )}
                              data-testid={`badge-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                            >
                              {showExpanded
                                ? typeof item.badge === "number" && item.badge > 9
                                  ? "9+"
                                  : item.badge
                                : ""}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <div className={navItemClasses}>
                          <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                          {showExpanded && (
                            <span className="text-sm">{item.name}</span>
                          )}
                        </div>
                      );

                      return (
                        <li key={item.name}>
                          {!showExpanded ? (
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                {navContent}
                              </TooltipTrigger>
                              <TooltipContent side="right" sideOffset={8}>
                                {item.name}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            navContent
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className={cn("flex gap-1", !showExpanded && "justify-center")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="h-9 w-9"
              data-testid="button-theme-toggle"
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            {import.meta.env.DEV && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="h-9 w-9"
                data-testid="button-clear-storage"
                aria-label="Clear local storage (dev only)"
                title="Clear local storage"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {user && (
          <div className="border-t border-sidebar-border p-3">
            <div
              className={cn(
                "flex items-center gap-3",
                !showExpanded && "justify-center"
              )}
            >
              <Link
                href="/profile"
                className={cn(
                  "flex items-center gap-3 hover-elevate p-1 -m-1 min-w-0",
                  showExpanded ? "flex-1" : ""
                )}
                data-testid="link-user-profile"
              >
                <Avatar className="h-9 w-9 flex-shrink-0">
                  <AvatarImage
                    src={user.profileImageUrl}
                    alt={user.fullName || user.username}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(user.fullName || user.username)}
                  </AvatarFallback>
                </Avatar>
                {showExpanded && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.fullName || user.username}
                    </p>
                  </div>
                )}
              </Link>
              {showExpanded && onSignOut && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOut}
                  className="h-8 w-8 p-0 flex-shrink-0"
                  data-testid="button-sign-out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
