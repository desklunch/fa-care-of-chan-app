/**
 * Frontend Permission Utilities
 * 
 * React hooks and components for permission-based access control.
 * Uses the cached permission context from the auth user object.
 * Supports tier override for development testing.
 */

import { useMemo } from "react";
import { useAuth } from "./useAuth";
import { useQuery } from "@tanstack/react-query";
import type { Permission, PermissionContext } from "@shared/permissions";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessPath,
  getAllowedSearchCategories,
  createPermissionContext,
} from "@shared/permissions";
import { useTierOverride } from "@/contexts/tier-override-context";

interface RoleWithPermissions {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
}

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
  const { overrideRole } = useTierOverride();

  const actualPermissionContext = useMemo(() => {
    return (user as any)?.permissionContext as PermissionContext | undefined;
  }, [user]);

  const isActualAdminUser = actualPermissionContext?.role === "admin";
  const shouldFetchRoles = import.meta.env.DEV && isActualAdminUser && !!overrideRole;

  const { data: rolesData } = useQuery<RoleWithPermissions[]>({
    queryKey: ["/api/roles/names"],
    enabled: shouldFetchRoles,
    staleTime: 60000,
  });

  const permissionContext = useMemo(() => {
    if (import.meta.env.DEV && overrideRole && actualPermissionContext && isActualAdminUser) {
      const matchedRole = rolesData?.find(r => r.name === overrideRole);
      const rolePermissions = matchedRole?.permissions as Permission[] | undefined;
      return createPermissionContext(overrideRole, rolePermissions);
    }
    return actualPermissionContext;
  }, [actualPermissionContext, overrideRole, isActualAdminUser, rolesData]);

  const can = useMemo(() => {
    return (permission: Permission): boolean => {
      return hasPermission(permissionContext, permission);
    };
  }, [permissionContext]);

  const canAny = useMemo(() => {
    return (permissions: Permission[]): boolean => {
      return hasAnyPermission(permissionContext, permissions);
    };
  }, [permissionContext]);

  const canAll = useMemo(() => {
    return (permissions: Permission[]): boolean => {
      return hasAllPermissions(permissionContext, permissions);
    };
  }, [permissionContext]);

  const canAccess = useMemo(() => {
    return (path: string): boolean => {
      return canAccessPath(permissionContext, path);
    };
  }, [permissionContext]);

  const allowedSearchCategories = useMemo(() => {
    return getAllowedSearchCategories(permissionContext);
  }, [permissionContext]);

  const role = permissionContext?.role;
  const actualRole = actualPermissionContext?.role;
  const tier = permissionContext?.tier ?? 0;
  const isOverridden = import.meta.env.DEV && !!overrideRole && !!actualPermissionContext;

  return {
    permissionContext,
    
    can,
    canAny,
    canAll,
    canAccess,
    
    allowedSearchCategories,
    role,
    actualRole,
    tier,
    
    isLoading,
    isAuthenticated,
    
    isAdmin: role === "admin",
    isActualAdmin: actualRole === "admin",
    isManager: role === "manager",
    isManagerOrAbove: tier >= 2,
    
    isOverridden,
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
