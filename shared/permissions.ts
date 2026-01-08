/**
 * Centralized Permission System
 * 
 * This module defines the role hierarchy and permission mappings for the application.
 * It provides utilities for checking permissions that can be used on both frontend and backend.
 * 
 * Role Hierarchy:
 * - admin: Full access to everything
 * - manager (tier 2): Access to deals, sales management, and all employee permissions
 * - employee (tier 1): Basic access to venues, clients, contacts, vendors
 * 
 * Future extensibility:
 * - Additional tier 2 roles (sales-manager, venue-manager) can be added
 * - Each tier 2 role inherits tier 1 permissions and has specific tier 2 permissions
 */

// ============================================
// ROLE DEFINITIONS
// ============================================

export const ROLES = {
  admin: 'admin',
  manager: 'manager',
  employee: 'employee',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Role tiers for hierarchy
// Higher tier = more permissions
// Multiple roles can exist at the same tier level
export const ROLE_TIERS: Record<Role, number> = {
  admin: 3,
  manager: 2,
  employee: 1,
};

// ============================================
// PERMISSION DEFINITIONS
// ============================================

// Permission format: resource.action
// Resources align with main application features
// Actions: read, write, delete, manage (full control)

export const PERMISSIONS = {
  // Venues - all authenticated users
  'venues.read': 'venues.read',
  'venues.write': 'venues.write',
  'venues.delete': 'venues.delete',
  
  // Clients - all authenticated users
  'clients.read': 'clients.read',
  'clients.write': 'clients.write',
  'clients.delete': 'clients.delete',
  
  // Contacts - all authenticated users
  'contacts.read': 'contacts.read',
  'contacts.write': 'contacts.write',
  'contacts.delete': 'contacts.delete',
  
  // Vendors - all authenticated users
  'vendors.read': 'vendors.read',
  'vendors.write': 'vendors.write',
  'vendors.delete': 'vendors.delete',
  
  // Deals - managers and admins only
  'deals.read': 'deals.read',
  'deals.write': 'deals.write',
  'deals.delete': 'deals.delete',
  
  // Sales management - managers and admins only
  'sales.read': 'sales.read',
  'sales.manage': 'sales.manage',
  
  // Team management - admins only for role changes
  'team.read': 'team.read',
  'team.manage': 'team.manage',
  
  // Invites - admins only
  'invites.read': 'invites.read',
  'invites.manage': 'invites.manage',
  
  // Audit logs - admins only
  'audit.read': 'audit.read',
  'audit.export': 'audit.export',
  
  // App features/issues - read by all, manage by admins
  'app_features.read': 'app_features.read',
  'app_features.vote': 'app_features.vote',
  'app_features.manage': 'app_features.manage',
  
  // Releases - admins only
  'releases.read': 'releases.read',
  'releases.manage': 'releases.manage',
  
  // Admin settings - admins only
  'admin.settings': 'admin.settings',
  'admin.analytics': 'admin.analytics',
  
  // Vendor tokens - admins only
  'vendor_tokens.manage': 'vendor_tokens.manage',
  
  // Theme editor - admins only
  'theme.manage': 'theme.manage',
  
  // Global search scopes
  'search.deals': 'search.deals',
  'search.all': 'search.all',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ============================================
// ROLE-PERMISSION MAPPINGS
// ============================================

// Base permissions for each tier
// Tier 1 (employee) permissions - basic CRUD for general entities
const TIER_1_PERMISSIONS: Permission[] = [
  'venues.read',
  'venues.write',
  // Note: venues.delete is tier 2+ (manager/admin only)
  'clients.read',
  'clients.write',
  'clients.delete',
  'contacts.read',
  'contacts.write',
  'contacts.delete',
  'vendors.read',
  // Note: vendors.write and vendors.delete are admin only
  'team.read',
  'app_features.read',
  'app_features.vote',
];

// Tier 2 (manager) permissions - includes all tier 1 + deals and venue deletion
const TIER_2_PERMISSIONS: Permission[] = [
  ...TIER_1_PERMISSIONS,
  'venues.delete', // Managers can delete venues
  'deals.read',
  'deals.write',
  'deals.delete',
  'sales.read',
  'sales.manage',
  'search.deals',
];

// Tier 3 (admin) permissions - includes all lower tiers
const TIER_3_PERMISSIONS: Permission[] = [
  ...TIER_2_PERMISSIONS,
  'vendors.write', // Admin-only: Create/update vendors
  'vendors.delete', // Admin-only: Delete vendors
  'team.manage',
  'invites.read',
  'invites.manage',
  'audit.read',
  'audit.export',
  'app_features.manage',
  'releases.read',
  'releases.manage',
  'admin.settings',
  'admin.analytics',
  'vendor_tokens.manage',
  'theme.manage',
  'search.all',
];

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  employee: TIER_1_PERMISSIONS,
  manager: TIER_2_PERMISSIONS,
  admin: TIER_3_PERMISSIONS,
};

// ============================================
// PERMISSION UTILITIES
// ============================================

/**
 * Get all permissions for a given role
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the given permissions
 */
export function roleHasAnyPermission(role: Role, permissions: Permission[]): boolean {
  const rolePerms = getPermissionsForRole(role);
  return permissions.some(p => rolePerms.includes(p));
}

/**
 * Check if a role has all of the given permissions
 */
export function roleHasAllPermissions(role: Role, permissions: Permission[]): boolean {
  const rolePerms = getPermissionsForRole(role);
  return permissions.every(p => rolePerms.includes(p));
}

/**
 * Get the tier level for a role
 */
export function getRoleTier(role: Role): number {
  return ROLE_TIERS[role] || 0;
}

/**
 * Check if a role is at or above a certain tier
 */
export function isRoleAtLeastTier(role: Role, tier: number): boolean {
  return getRoleTier(role) >= tier;
}

/**
 * Check if a role is admin
 */
export function isAdminRole(role: Role): boolean {
  return role === ROLES.admin;
}

/**
 * Check if a role is manager or above
 */
export function isManagerOrAbove(role: Role): boolean {
  return getRoleTier(role) >= ROLE_TIERS.manager;
}

// ============================================
// PERMISSION CONTEXT (for caching)
// ============================================

/**
 * Resolved permissions for a user - used for caching in session
 */
export interface PermissionContext {
  role: Role;
  permissions: Permission[];
  tier: number;
}

/**
 * Create a permission context for a user
 * This should be called on login and cached in the session
 */
export function createPermissionContext(role: Role): PermissionContext {
  return {
    role,
    permissions: getPermissionsForRole(role),
    tier: getRoleTier(role),
  };
}

/**
 * Check if a permission context has a specific permission
 */
export function hasPermission(context: PermissionContext | null | undefined, permission: Permission): boolean {
  if (!context) return false;
  return context.permissions.includes(permission);
}

/**
 * Check if a permission context has any of the given permissions
 */
export function hasAnyPermission(context: PermissionContext | null | undefined, permissions: Permission[]): boolean {
  if (!context) return false;
  return permissions.some(p => context.permissions.includes(p));
}

/**
 * Check if a permission context has all of the given permissions
 */
export function hasAllPermissions(context: PermissionContext | null | undefined, permissions: Permission[]): boolean {
  if (!context) return false;
  return permissions.every(p => context.permissions.includes(p));
}

// ============================================
// NAVIGATION PERMISSIONS
// ============================================

// Map navigation paths to required permissions
// Used by both frontend routing and command palette
export const NAV_PERMISSIONS: Record<string, Permission> = {
  '/venues': 'venues.read',
  '/clients': 'clients.read',
  '/contacts': 'contacts.read',
  '/vendors': 'vendors.read',
  '/deals': 'deals.read',
  '/sales/manage': 'sales.manage',
  '/team': 'team.read',
  '/admin/invites': 'invites.read',
  '/admin/logs': 'audit.read',
  '/admin/analytics': 'admin.analytics',
  '/app/features': 'app_features.read',
  '/app/issues': 'app_features.read',
  '/app/releases': 'releases.read',
  '/admin/vendor-services': 'admin.settings',
  '/admin/theme': 'theme.manage',
};

/**
 * Check if a user can access a navigation path
 */
export function canAccessPath(context: PermissionContext | null | undefined, path: string): boolean {
  // Check for exact match first
  const requiredPermission = NAV_PERMISSIONS[path];
  if (requiredPermission) {
    return hasPermission(context, requiredPermission);
  }
  
  // Check for path prefixes (e.g., /venues/123 should check /venues)
  for (const [navPath, permission] of Object.entries(NAV_PERMISSIONS)) {
    if (path.startsWith(navPath + '/')) {
      return hasPermission(context, permission);
    }
  }
  
  // Default: allow access for authenticated users
  return true;
}

// ============================================
// SEARCH PERMISSIONS
// ============================================

// Map search categories to required permissions
export const SEARCH_PERMISSIONS: Record<string, Permission> = {
  venues: 'venues.read',
  clients: 'clients.read',
  contacts: 'contacts.read',
  vendors: 'vendors.read',
  deals: 'deals.read',
  team: 'team.read',
};

/**
 * Get allowed search categories based on permissions
 */
export function getAllowedSearchCategories(context: PermissionContext | null | undefined): string[] {
  if (!context) return [];
  
  return Object.entries(SEARCH_PERMISSIONS)
    .filter(([_, permission]) => context.permissions.includes(permission))
    .map(([category]) => category);
}
