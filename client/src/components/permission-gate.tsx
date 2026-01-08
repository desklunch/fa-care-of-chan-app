/**
 * PermissionGate Component
 * 
 * A declarative component for conditionally rendering content based on permissions.
 * Supports showing/hiding content, disabling interactions, or rendering fallback content.
 */

import type { ReactNode } from "react";
import { usePermissions, useCanAccess } from "@/hooks/usePermissions";
import type { Permission } from "@shared/permissions";

interface PermissionGateProps {
  /** Single permission required */
  permission?: Permission;
  
  /** Multiple permissions - user must have ANY of these */
  anyPermission?: Permission[];
  
  /** Multiple permissions - user must have ALL of these */
  allPermissions?: Permission[];
  
  /** Path-based permission check */
  path?: string;
  
  /** Content to render when permission is granted */
  children: ReactNode;
  
  /** Content to render when permission is denied (optional) */
  fallback?: ReactNode;
  
  /**
   * Behavior when permission is denied:
   * - 'hide': Don't render anything (default)
   * - 'disable': Render children but wrap in a disabled state
   * - 'fallback': Render the fallback content
   */
  behavior?: "hide" | "disable" | "fallback";
}

/**
 * Gate component that conditionally renders content based on permissions.
 * 
 * @example
 * // Hide content if user doesn't have permission
 * <PermissionGate permission="deals.read">
 *   <Link to="/deals">View Deals</Link>
 * </PermissionGate>
 * 
 * @example
 * // Show different content for unauthorized users
 * <PermissionGate 
 *   permission="admin.settings" 
 *   behavior="fallback"
 *   fallback={<span>Admin only</span>}
 * >
 *   <AdminPanel />
 * </PermissionGate>
 * 
 * @example
 * // Disable content for unauthorized users
 * <PermissionGate permission="deals.write" behavior="disable">
 *   <Button>Create Deal</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  anyPermission,
  allPermissions,
  path,
  children,
  fallback = null,
  behavior = "hide",
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions();
  const canAccessPath = useCanAccess(path || "");

  // Determine if user has permission
  let hasAccess = true;

  if (permission) {
    hasAccess = can(permission);
  } else if (anyPermission && anyPermission.length > 0) {
    hasAccess = canAny(anyPermission);
  } else if (allPermissions && allPermissions.length > 0) {
    hasAccess = canAll(allPermissions);
  } else if (path) {
    hasAccess = canAccessPath;
  }

  // Render based on access and behavior
  if (hasAccess) {
    return <>{children}</>;
  }

  switch (behavior) {
    case "hide":
      return null;
    case "fallback":
      return <>{fallback}</>;
    case "disable":
      return (
        <div className="opacity-50 pointer-events-none" aria-disabled="true">
          {children}
        </div>
      );
    default:
      return null;
  }
}

/**
 * Convenience component for hiding links to inaccessible paths.
 * 
 * @example
 * <PathGate path="/deals">
 *   <Link to="/deals">Deals</Link>
 * </PathGate>
 */
export function PathGate({
  path,
  children,
  fallback = null,
}: {
  path: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const canAccess = useCanAccess(path);
  
  if (canAccess) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

/**
 * Convenience component for admin-only content.
 */
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isAdmin } = usePermissions();
  
  if (isAdmin) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

/**
 * Convenience component for manager-or-above content.
 */
export function ManagerOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isManagerOrAbove } = usePermissions();
  
  if (isManagerOrAbove) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}
