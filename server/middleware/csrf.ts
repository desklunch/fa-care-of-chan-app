import { Request, Response, NextFunction } from "express";
import Tokens from "csrf";

const tokens = new Tokens();

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const EXCLUDED_PATHS = new Set([
  "/api/auth/callback",
  "/api/auth/replit/callback",
  "/api/auth/google/callback",
]);

declare global {
  namespace Express {
    interface Session {
      csrfSecret?: string;
    }
  }
}

function getCsrfSecret(req: Request): string {
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = tokens.secretSync();
  }
  return req.session.csrfSecret;
}

export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  const secret = getCsrfSecret(req);
  const token = tokens.create(secret);
  
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  
  (req as any).csrfToken = token;
  
  next();
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }
  
  if (EXCLUDED_PATHS.has(req.path)) {
    return next();
  }
  
  if (!req.path.startsWith("/api/")) {
    return next();
  }
  
  const secret = req.session?.csrfSecret;
  if (!secret) {
    return res.status(403).json({ 
      message: "CSRF validation failed: No session",
      code: "CSRF_NO_SESSION" 
    });
  }
  
  const tokenFromHeader = req.get(CSRF_HEADER_NAME);
  const tokenFromCookie = req.cookies?.[CSRF_COOKIE_NAME];
  
  const tokenToValidate = tokenFromHeader || tokenFromCookie;
  
  if (!tokenToValidate) {
    return res.status(403).json({ 
      message: "CSRF validation failed: No token provided",
      code: "CSRF_NO_TOKEN" 
    });
  }
  
  if (!tokens.verify(secret, tokenToValidate)) {
    return res.status(403).json({ 
      message: "CSRF validation failed: Invalid token",
      code: "CSRF_INVALID_TOKEN" 
    });
  }
  
  next();
}

export function getCsrfToken(req: Request): string {
  return (req as any).csrfToken || "";
}
