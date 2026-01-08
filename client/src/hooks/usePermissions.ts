/**
 * Frontend Permission Utilities
 * 
 * React hooks and components for permission-based access control.
 * Uses the cached permission context from the auth user object.
 */

import { useMemo } from "react";
import { useAuth } from "./useAuth";
import type { Permission, PermissionContext } from "@shared/permissions";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessPath,
  getAllowedSearchCategories,
} from "@shared/permissions";

/**
 * Hook to access the user's permission context and check permissions.
 * 
 * @example
 * const { can, canAny, canAll, canAccess } = usePermissions();
 * 
 * if (can('deals.read')) {
 *   // Show deals link
 * }
 */
export function usePermissions() {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Get permission context from user (cached from /api/auth/user response)
  const permissionContext = useMemo(() => {
    return (user as any)?.permissionContext as PermissionContext | undefined;
  }, [user]);

  // Check if user has a specific permission
  const can = useMemo(() => {
    return (permission: Permission): boolean => {
      return hasPermission(permissionContext, permission);
    };
  }, [permissionContext]);

  // Check if user has any of the given permissions
  const canAny = useMemo(() => {
    return (permissions: Permission[]): boolean => {
      return hasAnyPermission(permissionContext, permissions);
    };
  }, [permissionContext]);

  // Check if user has all of the given permissions
  const canAll = useMemo(() => {
    return (permissions: Permission[]): boolean => {
      return hasAllPermissions(permissionContext, permissions);
    };
  }, [permissionContext]);

  // Check if user can access a navigation path
  const canAccess = useMemo(() => {
    return (path: string): boolean => {
      return canAccessPath(permissionContext, path);
    };
  }, [permissionContext]);

  // Get allowed search categories
  const allowedSearchCategories = useMemo(() => {
    return getAllowedSearchCategories(permissionContext);
  }, [permissionContext]);

  // Get the user's role
  const role = permissionContext?.role;

  // Get the user's tier level
  const tier = permissionContext?.tier ?? 0;

  return {
    // Permission context
    permissionContext,
    
    // Permission checking functions
    can,
    canAny,
    canAll,
    canAccess,
    
    // Computed values
    allowedSearchCategories,
    role,
    tier,
    
    // Auth state
    isLoading,
    isAuthenticated,
    
    // Convenience checks
    isAdmin: role === "admin",
    isManager: role === "manager",
    isManagerOrAbove: tier >= 2,
  };
}

/**
 * Hook variant that returns a simple boolean for a single permission.
 * Useful for conditional rendering.
 * 
 * @example
 * const canViewDeals = useHasPermission('deals.read');
 */
export function useHasPermission(permission: Permission): boolean {
  const { can } = usePermissions();
  return can(permission);
}

/**
 * Hook variant that checks multiple permissions (any).
 * 
 * @example
 * const canManageSales = useHasAnyPermission(['deals.write', 'sales.manage']);
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { canAny } = usePermissions();
  return canAny(permissions);
}

/**
 * Hook variant that checks if user can access a path.
 * 
 * @example
 * const canAccessDeals = useCanAccess('/deals');
 */
export function useCanAccess(path: string): boolean {
  const { canAccess } = usePermissions();
  return canAccess(path);
}
