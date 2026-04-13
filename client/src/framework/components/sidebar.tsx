import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  PanelLeftClose,
  ChevronRight,
  PanelRightOpen,
  ChevronUp,
  LogOut,
  Sun,
  Moon,
  Trash2,
  Search,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLayout } from "../hooks/layout-context";
import { useTheme } from "@/lib/theme-provider";
import { usePermissions } from "@/hooks/usePermissions";
import { useTierOverride } from "@/contexts/tier-override-context";
import Logo from "./logo";
import { NotificationBell } from "@/components/notification-bell";
import type { NavItem, NavSection } from "../types/layout";
import type { Role } from "@shared/permissions";

function DevRoleSelector({
  overrideRole,
  setOverrideRole,
  clearOverride,
}: {
  overrideRole: Role | null;
  setOverrideRole: (role: Role) => void;
  clearOverride: () => void;
}) {
  const { data: roles } = useQuery<
    { id: number; name: string; description: string | null }[]
  >({
    queryKey: ["/api/roles/names"],
    enabled: import.meta.env.DEV,
  });

  return (
    <div className="w-full">
      <Select
        value={overrideRole || "actual"}
        onValueChange={(value) => {
          if (value === "actual") {
            clearOverride();
          } else {
            setOverrideRole(value as Role);
          }
        }}
      >
        <SelectTrigger
          className="h-9 text-xs"
          data-testid="select-tier-override"
        >
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="actual" data-testid="option-tier-actual">
            Admin (actual)
          </SelectItem>
          {roles?.map((r) => (
            <SelectItem
              key={r.id}
              value={r.name}
              data-testid={`option-role-${r.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  onSearch?: () => void;
}

export default function Sidebar({
  isMobileOpen,
  onMobileClose,
  onSearch,
}: SidebarProps) {
  const { user, navigation, onSignOut } = useLayout();
  const { resolvedTheme, setTheme } = useTheme();
  const { can, isActualAdmin, role, isOverridden } = usePermissions();
  const { overrideRole, setOverrideRole, clearOverride } = useTierOverride();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMediumScreen, setIsMediumScreen] = useState(false);
  const prevLocationRef = useRef("");

  const [groupCollapsedState, setGroupCollapsedState] = useState<
    Record<string, boolean>
  >(() => {
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
        JSON.stringify(groupCollapsedState),
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
  };

  const filterSections = (sections: NavSection[]) => {
    return sections
      .filter((section) => {
        // New permission-based check takes priority
        if (section.requiredPermission) {
          return can(section.requiredPermission);
        }
        // Legacy role-based check for backward compatibility
        if (!section.allowedRoles || section.allowedRoles.length === 0)
          return true;
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
    if (
      prevLocationRef.current !== currentPath &&
      prevLocationRef.current !== ""
    ) {
      onMobileClose();
      if (isMediumScreen) {
        setIsHovered(false);
      }
    }
    prevLocationRef.current = currentPath;
  }, [
    typeof window !== "undefined" ? window.location.pathname : "",
    isMediumScreen,
    onMobileClose,
  ]);

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
          "bg-sidebar border-r border-sidebar-border z-1000 transition-all duration-[2000ms] [transition-timing-function:cubic-bezier(0.33,1,0.68,1)]",
          "flex flex-col h-full ",
          "lg:relative lg:z-1000",
          isCollapsed && !isMediumScreen && "lg:w-[72px]",
          !isCollapsed && !isMediumScreen && "lg:w-[280px]",
          "md:relative md:z-50",
          isMediumScreen && isHovered && "md:w-[280px] md:shadow-xl",
          isMediumScreen && !isHovered && "md:!w-[72px]",
          "md:flex",
          isMobileOpen
            ? "fixed inset-y-0 left-0 w-[85vw] max-w-[85vw] translate-x-0 rounded-r-lg"
            : "fixed inset-y-0 left-0 w-[85vw] max-w-[85vw] -translate-x-full pointer-events-none rounded-r-lg md:pointer-events-auto md:relative md:translate-x-0 md:w-auto md:rounded-none",
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-testid="sidebar-main"
      >
        <div className="h-[72px] border-b border-sidebar-border flex items-center justify-start gap-6 p-3  ">
          <Button
            variant="ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-0  w-full flex flex-2 items-center justify-start gap-3  focus:ring-0 focus:ring-offset-0  h-[36px] bg-sidebar hover:bg-background "
            data-testid="button-toggle-sidebar"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Logo width="42" collapsed={!showExpanded} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileClose}
            className="h-8 w-8 p-0 md:hidden flex-0 "
            data-testid="button-close-sidebar"
            aria-label="Close menu"
          >
            <PanelRightOpen className="h-5 w-5" />
          </Button>

          {showExpanded && !isMediumScreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0 hidden lg:flex text-muted-foreground"
              data-testid="button-collapse-sidebar"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {onSearch && (
          <div className="px-4 pt-3 pb-0 bg-sidebar fle">
            {showExpanded ? (
              <Button
                variant="ghost"
                onClick={onSearch}
                className=" px-2 w-full bg-secondary justify-between gap-2 text-muted-foreground font-normal"
                data-testid="button-search-trigger"
              >
                <span className="text-xs flex gap-2 font-medium opacity-60 hover:opacity-100">
                  <Search className="h-4 w-4" />
                  Search
                </span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            ) : (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={onSearch}
                    className="w-full justify-start p-2.5"
                    data-testid="button-search-trigger-collapsed"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Search (⌘K)
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {role === "admin" && (
          <div className="px-4 pt-2 pb-2 bg-sidebar">
            {showExpanded ? (
              <NotificationBell variant="sidebar" />
            ) : (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div>
                    <NotificationBell variant="sidebar-collapsed" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Notifications
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        <nav
          className={cn(
            "flex-1 overflow-y-auto p-2 py-3 space-y-1",
            !showExpanded && "cursor-pointer",
          )}
          data-testid="nav-sidebar"
          onClick={!showExpanded ? () => setIsCollapsed(false) : undefined}
        >
          {showExpanded &&
            visibleNavigation.map((section, sectionIndex) => {
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
                        "w-full outline-none ring-ring focus:ring-2   h-8 rounded-md flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-3 pr-1 py-1 mb-1 hover:bg-sidebar-accent transition-colors",
                        sectionIndex === 0 ? "mt-0" : "mt-2",
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
                        const isActive =
                          typeof window !== "undefined" &&
                          window.location.pathname === item.href;

                        const navItemClasses = cn(
                          "flex justify-start items-center gap-3 px-3 py-2 font-medium  rounded-lg transition-colors duration-150 relative outline-none ring-ring focus:ring-2   ",
                          isEnabled && "hover:bg-primary/20 hover:text-primary",
                          isActive &&
                            "bg-primary text-primary-foreground font-semibold hover:bg-primary/50 hover:text-foreground",
                          !showExpanded && "",
                          !isEnabled &&
                            "opacity-40 cursor-not-allowed pointer-events-none",
                        );

                        const navContent = isEnabled ? (
                          <Link
                            href={item.href}
                            className={navItemClasses}
                            aria-label={showExpanded ? undefined : item.name}
                            data-testid={`link-nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                            onClick={onMobileClose}
                          >
                            <Icon
                              className="h-5 w-5 flex-shrink-0 stroke-[1.5px] "
                              aria-hidden="true"
                            />
                            {showExpanded && (
                              <span className="text-[14px] leading-[10px] flex-1 font-medium ">
                                {item.name}
                              </span>
                            )}
                            {item.badge !== undefined &&
                              item.badge !== null && (
                                <span
                                  className={cn(
                                    "rounded-full bg-primary text-foreground font-semibold flex items-center justify-center",
                                    showExpanded
                                      ? "h-5 min-w-[20px] px-1.5 text-xs"
                                      : "absolute -top-0.5 -right-0.5 h-3 w-3 text-[8px]",
                                  )}
                                  data-testid={`badge-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  {showExpanded
                                    ? typeof item.badge === "number" &&
                                      item.badge > 9
                                      ? "9+"
                                      : item.badge
                                    : ""}
                                </span>
                              )}
                          </Link>
                        ) : (
                          <div className={navItemClasses}>
                            <Icon
                              className="h-5 w-5 flex-shrink-0"
                              aria-hidden="true"
                            />
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

        <div className="border-t border-sidebar-border p-2">
          <div
            className={cn(
              "flex gap-3 items-center",
              !showExpanded && "justify-center",
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              className="h-9 w-12"
              data-testid="button-theme-toggle"
              aria-label={
                resolvedTheme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            {import.meta.env.DEV && showExpanded && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="h-9 w-12"
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
          <div
            className={cn(
              "border-t border-sidebar-border p-3 space-y-4 pt-4",
              !showExpanded && "border-none",
            )}
          >
            {import.meta.env.DEV && isActualAdmin && showExpanded && (
              <DevRoleSelector
                overrideRole={overrideRole}
                setOverrideRole={setOverrideRole}
                clearOverride={clearOverride}
              />
            )}
            <div
              className={cn(
                "flex items-center gap-3",
                !showExpanded && "justify-start",
              )}
            >
              <Link
                href={`/team/${user.id}`}
                className={cn(
                  "flex items-center gap-3 hover-elevate p-1 -m-1 min-w-0",
                  showExpanded ? "flex-1" : "",
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
