import { ReactNode } from "react";
import type { Permission } from "@shared/permissions";

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  active?: boolean;
  /** @deprecated Use requiredPermission instead for centralized permission control */
  allowedRoles?: string[];
  /** Required permission to view this nav item */
  requiredPermission?: Permission;
  badge?: number | string;
}

export interface NavSection {
  heading?: string;
  items: NavItem[];
  /** @deprecated Use requiredPermission instead for centralized permission control */
  allowedRoles?: string[];
  /** Required permission to view this section */
  requiredPermission?: Permission;
  defaultCollapsed?: boolean;
}

export interface LayoutUser {
  id: number | string;
  username: string;
  email: string;
  fullName?: string;
  role?: string;
  profileImageUrl?: string;
}

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface ActionButton {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: any;
  variant?: "default" | "outline" | "ghost" | "destructive";
}

export interface LayoutConfig {
  user: LayoutUser | null;
  navigation: NavSection[];
  onSignOut?: () => void;
  onEditProfile?: () => void;
  logo?: ReactNode;
  onSearch?: () => void;
  searchShortcut?: string;
  headerActions?: ActionButton[];
  sidebarFooter?: ReactNode;
}

export interface PageLayoutProps {
  children: ReactNode;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: ActionButton;
  additionalActions?: ActionButton[];
}
