/**
 * Permission Middleware
 * 
 * Express middleware for enforcing permissions on routes.
 * Uses the centralized permission system from shared/permissions.ts.
 */

import type { RequestHandler, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import {
  Permission,
  Role,
  createPermissionContext,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  PermissionContext,
} from "../../shared/permissions";

// Extend Express Request to include permission context
declare global {
  namespace Express {
    interface Request {
      permissionContext?: PermissionContext;
      userId?: string;
    }
  }
}

/**
 * Middleware that ensures user is authenticated and loads permission context.
 * This should be applied early in the middleware chain for protected routes.
 */
export const loadPermissions: RequestHandler = async (req, res, next) => {
  const session = req.session as any;

  if (!session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if permission context is already cached in session
  if (session.permissionContext) {
    req.permissionContext = session.permissionContext;
    req.userId = session.userId;
    (req as any).user = { claims: session.claims };
    return next();
  }

  // Load user from database and create permission context
  try {
    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Create and cache permission context in session
    const permissionContext = createPermissionContext(user.role as Role);
    session.permissionContext = permissionContext;
    
    req.permissionContext = permissionContext;
    req.userId = session.userId;
    (req as any).user = { claims: session.claims };
    
    next();
  } catch (error) {
    console.error("Error loading permissions:", error);
    return res.status(500).json({ message: "Failed to load permissions" });
  }
};

/**
 * Clear cached permission context from session.
 * Call this when a user's role changes to force re-evaluation.
 */
export function clearPermissionCache(session: any): void {
  if (session) {
    delete session.permissionContext;
  }
}

/**
 * Middleware factory that requires a specific permission.
 * 
 * @example
 * router.get('/deals', requirePermission('deals.read'), dealsHandler);
 */
export function requirePermission(permission: Permission): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Ensure permissions are loaded
    if (!req.permissionContext) {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Load permissions if not already loaded
      try {
        const user = await storage.getUser(session.userId);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }
        req.permissionContext = createPermissionContext(user.role as Role);
        req.userId = session.userId;
        (req as any).user = { claims: session.claims };
      } catch (error) {
        return res.status(500).json({ message: "Failed to load permissions" });
      }
    }

    if (!hasPermission(req.permissionContext, permission)) {
      return res.status(403).json({ 
        message: "Forbidden",
        required: permission,
      });
    }

    next();
  };
}

/**
 * Middleware factory that requires any of the specified permissions.
 * 
 * @example
 * router.get('/data', requireAnyPermission(['deals.read', 'sales.read']), handler);
 */
export function requireAnyPermission(permissions: Permission[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.permissionContext) {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const user = await storage.getUser(session.userId);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }
        req.permissionContext = createPermissionContext(user.role as Role);
        req.userId = session.userId;
        (req as any).user = { claims: session.claims };
      } catch (error) {
        return res.status(500).json({ message: "Failed to load permissions" });
      }
    }

    if (!hasAnyPermission(req.permissionContext, permissions)) {
      return res.status(403).json({ 
        message: "Forbidden",
        required: permissions,
      });
    }

    next();
  };
}

/**
 * Middleware factory that requires all of the specified permissions.
 * 
 * @example
 * router.delete('/user/:id', requireAllPermissions(['team.manage', 'admin.settings']), handler);
 */
export function requireAllPermissions(permissions: Permission[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.permissionContext) {
      const session = req.session as any;
      if (!session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      try {
        const user = await storage.getUser(session.userId);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }
        req.permissionContext = createPermissionContext(user.role as Role);
        req.userId = session.userId;
        (req as any).user = { claims: session.claims };
      } catch (error) {
        return res.status(500).json({ message: "Failed to load permissions" });
      }
    }

    if (!hasAllPermissions(req.permissionContext, permissions)) {
      return res.status(403).json({ 
        message: "Forbidden",
        required: permissions,
      });
    }

    next();
  };
}

/**
 * Utility to check permissions in route handlers.
 * Useful when permission check depends on request data.
 * 
 * @example
 * if (!checkPermission(req, 'deals.write')) {
 *   return res.status(403).json({ message: 'Forbidden' });
 * }
 */
export function checkPermission(req: Request, permission: Permission): boolean {
  return hasPermission(req.permissionContext, permission);
}

/**
 * Utility to check any permission in route handlers.
 */
export function checkAnyPermission(req: Request, permissions: Permission[]): boolean {
  return hasAnyPermission(req.permissionContext, permissions);
}

/**
 * Utility to get the user's permission context from a request.
 */
export function getPermissionContext(req: Request): PermissionContext | undefined {
  return req.permissionContext;
}
