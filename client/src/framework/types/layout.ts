import { ReactNode } from "react";

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  active?: boolean;
  allowedRoles?: string[];
  badge?: number | string;
}

export interface NavSection {
  heading?: string;
  items: NavItem[];
  allowedRoles?: string[];
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
  variant?: "default" | "outline" | "ghost";
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
  actionButton?: ActionButton;
  customHeaderAction?: ReactNode;
}
