# Mobile App Backend Support - Implementation Plan

**Document Version:** 1.1  
**Created:** January 23, 2026  
**Last Updated:** January 23, 2026  
**Status:** Draft - Revised After Architect Review

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 23, 2026 | Initial draft |
| 1.1 | Jan 23, 2026 | Addressed architect feedback: CSRF security fix, shorter access token TTL, proper request context handling, refresh token rotation strategy, explicit CORS allowlist, revised implementation order |

---

## Executive Summary

This document outlines the implementation plan for preparing the Care of Chan OS backend to support a React Native + Expo Go mobile application. The mobile app will share the existing Express API backend while requiring a parallel authentication mechanism that works without browser cookies.

---

## Current Backend Architecture Analysis

### Authentication System (server/googleAuth.ts)

**Current Implementation:**
- **Primary Auth:** Google Sign-In with server-side ID token verification
- **Session Management:** `express-session` with PostgreSQL session store (`connect-pg-simple`)
- **Session Duration:** 7 days
- **Session Cookie:** HttpOnly, Secure, SameSite not explicitly set
- **User Identification:** `session.userId` stored after successful auth

**Key Code Pattern:**
```typescript
// Current session-based auth check (googleAuth.ts:212-224)
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const session = req.session as any;
  if (!session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  (req as any).user = { claims: session.claims };
  next();
};
```

**Domain Restriction:** Only `@careofchan.com` email addresses allowed (with specific exceptions for `omar@functionalartists.ai`, `omar@omar.city`).

### CSRF Protection (server/middleware/csrf.ts)

**Current Implementation:**
- Uses `csrf-csrf` (double submit cookie pattern)
- Token validation tied to `session.id`
- Excluded paths: `/api/auth/*` callbacks, `/api/activity/`, `/api/places/`
- Non-API paths are excluded
- Requests without session are skipped

**Problem for Mobile:** CSRF requires `session.id` as the identifier, which won't exist for JWT-authenticated mobile requests.

### Permission System (server/middleware/permissions.ts)

**Current Implementation:**
- Role-based: `admin`, `manager`, `employee`, `viewer`
- Permission context cached in session
- Middleware loads user from database using `session.userId`

**Key Functions:**
- `loadPermissions` - Loads and caches user permissions
- `requirePermission(permission)` - Enforces specific permission
- `requireAnyPermission([permissions])` - Enforces any of listed permissions

### CORS Configuration

**Current State:** No explicit CORS middleware configured. The application expects same-origin requests only.

### File Uploads (server/routes.ts)

**Current Implementation:**
- Photos/files uploaded as base64-encoded data in JSON body
- Uses `sharp` for image processing and thumbnail generation
- Stores files in Object Storage service
- 50MB request body limit configured

**Relevant Endpoints:**
- `POST /api/photos/upload` - Direct base64 upload
- `POST /api/photos/upload-url` - Get presigned URL for client-side upload
- `POST /api/venue-files/upload` - Venue file upload
- `POST /api/floorplans/upload` - Floorplan upload

---

## Implementation Plan

### Phase 1: Database Migration & JWT Infrastructure

**Objective:** Set up the foundation before modifying any shared middleware.

#### 1.1 Create Refresh Tokens Table (Migration First)

```sql
-- Migration: add_refresh_tokens_table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash
  token_family UUID NOT NULL,              -- For rotation detection
  device_id VARCHAR(64),                   -- Device fingerprint
  device_info VARCHAR(255),                -- Human-readable device name
  user_agent VARCHAR(512),                 -- Browser/app user agent
  ip_address VARCHAR(45),                  -- IPv4 or IPv6
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason VARCHAR(50),              -- 'logout', 'rotation', 'security', 'expired'
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(token_family);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Cleanup job: Delete expired/revoked tokens older than 30 days
-- Can be run via cron or scheduled task
```

#### 1.2 Install Dependencies

```bash
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

**Note:** No need for `bcryptjs` - we'll use Node's built-in `crypto` for SHA-256 hashing.

#### 1.3 Create JWT Service (server/lib/jwt.ts)

```typescript
// server/lib/jwt.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// SECURITY: Use dedicated JWT secret, not shared with session
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Short-lived access tokens for security
const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';  // 15 minutes
const REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d'; // 30 days

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access';
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenFamily: string;  // UUID for rotation tracking
  type: 'refresh';
  iat: number;
  exp: number;
}

export function generateAccessToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
}

export function generateRefreshToken(userId: string, tokenFamily: string): string {
  return jwt.sign(
    { userId, tokenFamily, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return payload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return payload;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getTokenExpiryDate(expiresIn: string): Date {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error('Invalid expiry format');
  
  const value = parseInt(match[1]);
  const unit = match[2];
  const now = new Date();
  
  switch (unit) {
    case 's': return new Date(now.getTime() + value * 1000);
    case 'm': return new Date(now.getTime() + value * 60 * 1000);
    case 'h': return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'd': return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    default: throw new Error('Invalid time unit');
  }
}
```

#### 1.4 Create Refresh Token Storage (server/lib/refresh-tokens.ts)

```typescript
// server/lib/refresh-tokens.ts
import { db } from '../db';
import { refreshTokens } from '@shared/schema';
import { eq, and, isNull, lt } from 'drizzle-orm';
import { hashToken, getTokenExpiryDate } from './jwt';
import { v4 as uuidv4 } from 'uuid';

interface CreateTokenParams {
  userId: string;
  token: string;
  tokenFamily: string;
  deviceId?: string;
  deviceInfo?: string;
  userAgent?: string;
  ipAddress?: string;
}

export async function storeRefreshToken(params: CreateTokenParams): Promise<void> {
  const tokenHash = hashToken(params.token);
  const expiresAt = getTokenExpiryDate(process.env.JWT_REFRESH_EXPIRES || '30d');
  
  await db.insert(refreshTokens).values({
    userId: params.userId,
    tokenHash,
    tokenFamily: params.tokenFamily,
    deviceId: params.deviceId,
    deviceInfo: params.deviceInfo,
    userAgent: params.userAgent,
    ipAddress: params.ipAddress,
    expiresAt,
  });
}

export async function validateRefreshToken(token: string): Promise<{ valid: boolean; userId?: string; tokenFamily?: string }> {
  const tokenHash = hashToken(token);
  
  const result = await db.select()
    .from(refreshTokens)
    .where(and(
      eq(refreshTokens.tokenHash, tokenHash),
      isNull(refreshTokens.revokedAt),
      gt(refreshTokens.expiresAt, new Date())
    ))
    .limit(1);
  
  if (result.length === 0) {
    return { valid: false };
  }
  
  // Update last used timestamp
  await db.update(refreshTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
  
  return { 
    valid: true, 
    userId: result[0].userId,
    tokenFamily: result[0].tokenFamily
  };
}

export async function rotateRefreshToken(oldToken: string, newToken: string, tokenFamily: string): Promise<void> {
  const oldTokenHash = hashToken(oldToken);
  
  // Revoke the old token
  await db.update(refreshTokens)
    .set({ revokedAt: new Date(), revokedReason: 'rotation' })
    .where(eq(refreshTokens.tokenHash, oldTokenHash));
}

export async function revokeTokenFamily(tokenFamily: string, reason: string = 'security'): Promise<void> {
  // SECURITY: If token reuse detected, revoke entire family
  await db.update(refreshTokens)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(
      eq(refreshTokens.tokenFamily, tokenFamily),
      isNull(refreshTokens.revokedAt)
    ));
}

export async function revokeUserTokens(userId: string, reason: string = 'logout'): Promise<void> {
  await db.update(refreshTokens)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(
      eq(refreshTokens.userId, userId),
      isNull(refreshTokens.revokedAt)
    ));
}

export async function cleanupExpiredTokens(): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const result = await db.delete(refreshTokens)
    .where(lt(refreshTokens.expiresAt, thirtyDaysAgo));
  
  return result.rowCount || 0;
}
```

---

### Phase 2: Mobile Authentication Routes

**Objective:** Add new mobile-specific auth routes without modifying existing middleware yet.

#### 2.1 Create Mobile Auth Routes (server/routes/mobile-auth.ts)

```typescript
// server/routes/mobile-auth.ts
import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { storage } from '../storage';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken,
  verifyRefreshToken,
  hashToken 
} from '../lib/jwt';
import { 
  storeRefreshToken, 
  validateRefreshToken, 
  rotateRefreshToken,
  revokeTokenFamily,
  revokeUserTokens 
} from '../lib/refresh-tokens';
import { v4 as uuidv4 } from 'uuid';
import { logAuditEvent } from '../audit';

const router = Router();
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// POST /api/mobile/auth/google
router.post('/google', async (req, res) => {
  try {
    const { idToken, deviceId, deviceInfo } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token required' });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    
    if (!payload?.email) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Domain restriction
    const email = payload.email.toLowerCase();
    const allowedEmails = ['omar@functionalartists.ai', 'omar@omar.city'];
    const isAllowedDomain = email.endsWith('@careofchan.com');
    const isAllowedException = allowedEmails.includes(email);
    
    if (!isAllowedDomain && !isAllowedException) {
      return res.status(403).json({ 
        message: 'Access denied',
        reason: 'domain',
        detail: 'Only @careofchan.com email addresses are allowed'
      });
    }

    // Get or create user
    let user = await storage.getUserByEmail(email);
    if (!user) {
      const newUserId = `google-${payload.sub}`;
      await storage.upsertUser({
        id: newUserId,
        email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        profileImageUrl: payload.picture,
      });
      user = await storage.getUser(newUserId);
    }

    if (!user) {
      return res.status(500).json({ message: 'Failed to create user' });
    }

    // Generate tokens
    const tokenFamily = uuidv4();
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id, tokenFamily);

    // Store refresh token
    await storeRefreshToken({
      userId: user.id,
      token: refreshToken,
      tokenFamily,
      deviceId,
      deviceInfo,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    // Audit log
    await logAuditEvent({
      userId: user.id,
      action: 'mobile_login',
      entityType: 'user',
      entityId: user.id,
      metadata: { deviceInfo, provider: 'google' },
    });

    res.json({
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      },
    });
  } catch (error: any) {
    console.error('Mobile auth error:', error);
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
});

// POST /api/mobile/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    // Verify JWT structure
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Validate against database
    const validation = await validateRefreshToken(refreshToken);
    
    if (!validation.valid) {
      // SECURITY: Token was revoked or reused - revoke entire family
      if (payload.tokenFamily) {
        await revokeTokenFamily(payload.tokenFamily, 'reuse_detected');
      }
      return res.status(401).json({ message: 'Refresh token invalid or expired' });
    }

    // Get user for new access token
    const user = await storage.getUser(validation.userId!);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Rotate refresh token (issue new one, revoke old)
    const newRefreshToken = generateRefreshToken(user.id, validation.tokenFamily!);
    await rotateRefreshToken(refreshToken, newRefreshToken, validation.tokenFamily!);
    
    // Store new refresh token
    await storeRefreshToken({
      userId: user.id,
      token: newRefreshToken,
      tokenFamily: validation.tokenFamily!,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    // Generate new access token
    const accessToken = generateAccessToken(user);

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

// POST /api/mobile/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const { refreshToken, logoutAll } = req.body;

    let userId: string | undefined;

    // Try to get userId from access token
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = verifyAccessToken(authHeader.slice(7));
        userId = payload.userId;
      } catch (e) {
        // Access token expired, try refresh token
      }
    }

    // Revoke refresh token(s)
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        userId = userId || payload.userId;
        
        if (logoutAll && userId) {
          await revokeUserTokens(userId, 'logout_all');
        } else if (payload.tokenFamily) {
          await revokeTokenFamily(payload.tokenFamily, 'logout');
        }
      } catch (e) {
        // Token already invalid
      }
    }

    if (userId) {
      await logAuditEvent({
        userId,
        action: logoutAll ? 'mobile_logout_all' : 'mobile_logout',
        entityType: 'user',
        entityId: userId,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

// GET /api/mobile/auth/session
router.get('/session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.json({ authenticated: false });
    }

    const payload = verifyAccessToken(authHeader.slice(7));
    const user = await storage.getUser(payload.userId);

    if (!user || !user.isActive) {
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      },
    });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

export default router;
```

#### 2.2 Register Mobile Auth Routes

Add to `server/routes.ts`:

```typescript
import mobileAuthRoutes from './routes/mobile-auth';

// In registerRoutes function, BEFORE setupAuth:
app.use('/api/mobile/auth', mobileAuthRoutes);
```

**Important:** Mobile auth routes should be registered before `setupAuth` to avoid session middleware overhead for mobile requests.

---

### Phase 3: Unified Authentication Middleware

**Objective:** Modify existing middleware to accept both session cookies (web) and JWT Bearer tokens (mobile) safely.

#### 3.1 Extend Request Type (server/types/express.d.ts)

```typescript
// server/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      authMethod?: 'session' | 'jwt';
      userId?: string;
      userEmail?: string;
      userRole?: string;
      permissionContext?: PermissionContext;
    }
  }
}
```

#### 3.2 Update isAuthenticated Middleware

```typescript
// server/googleAuth.ts - Modified isAuthenticated
import { verifyAccessToken } from './lib/jwt';

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check for JWT first (mobile)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      
      // Set request context (DO NOT mutate req.session)
      req.authMethod = 'jwt';
      req.userId = payload.userId;
      req.userEmail = payload.email;
      req.userRole = payload.role;
      (req as any).user = { 
        claims: { 
          sub: payload.userId, 
          email: payload.email 
        } 
      };
      
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }

  // Fall back to session auth (web)
  const session = req.session as any;
  if (!session?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  req.authMethod = 'session';
  req.userId = session.userId;
  (req as any).user = { claims: session.claims };
  
  next();
};
```

#### 3.3 Update Permission Middleware

```typescript
// server/middleware/permissions.ts - Updated loadPermissions
export const loadPermissions: RequestHandler = async (req, res, next) => {
  // Support both JWT and session auth
  const userId = req.userId || (req.session as any)?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // For JWT auth, we can't cache in session - load fresh each time
  // (Consider Redis cache for production optimization)
  if (req.authMethod === 'jwt') {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      req.permissionContext = createPermissionContext(user.role as Role);
      req.userId = userId;
      return next();
    } catch (error) {
      return res.status(500).json({ message: 'Failed to load permissions' });
    }
  }

  // Session auth - use existing caching logic
  const session = req.session as any;
  
  if (session.permissionContext) {
    req.permissionContext = session.permissionContext;
    req.userId = session.userId;
    (req as any).user = { claims: session.claims };
    return next();
  }

  // Load and cache in session
  try {
    const user = await storage.getUser(session.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const permissionContext = createPermissionContext(user.role as Role);
    session.permissionContext = permissionContext;
    
    req.permissionContext = permissionContext;
    req.userId = session.userId;
    (req as any).user = { claims: session.claims };
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load permissions' });
  }
};
```

#### 3.4 Update CSRF Middleware (Security Fix)

**CRITICAL:** Only skip CSRF for validated JWT requests, not just any Authorization header.

```typescript
// server/middleware/csrf.ts - Updated shouldSkipCsrf
function shouldSkipCsrf(req: Request): boolean {
  // Skip CSRF only for VALIDATED JWT requests
  // req.authMethod is set by isAuthenticated after successful JWT verification
  if (req.authMethod === 'jwt') {
    return true;
  }
  
  // Existing skip logic for excluded paths
  if (EXCLUDED_PATHS.some(path => req.path.startsWith(path))) {
    return true;
  }
  
  if (!req.path.startsWith('/api/')) {
    return true;
  }
  
  const session = (req as any).session;
  if (!session?.id) {
    return true;
  }
  
  return false;
}
```

**Note:** This requires CSRF middleware to run AFTER `isAuthenticated` in the middleware chain.

**Middleware Order in server/routes.ts:**
```typescript
// Current order (must be maintained):
await setupAuth(app);        // 1. Sets up session + isAuthenticated
setupCsrf(app);              // 2. CSRF runs after auth, can check req.authMethod
app.use(requestContextMiddleware);  // 3. Request context
```

---

### Phase 4: CORS Configuration

**Objective:** Allow cross-origin requests from mobile apps with explicit allowlist.

#### 4.1 Install CORS Package

```bash
npm install cors
npm install -D @types/cors
```

#### 4.2 Configure CORS Middleware

```typescript
// server/cors.ts
import cors from 'cors';

// Explicit allowlist of origins
const ALLOWED_WEB_ORIGINS = [
  // Production
  /\.replit\.app$/,
  /\.replit\.dev$/,
  // Development
  'http://localhost:5000',
  'http://localhost:3000',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check against allowlist
    const isAllowed = ALLOWED_WEB_ORIGINS.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      return callback(null, true);
    }
    
    // Reject unknown origins for web requests
    console.warn(`CORS: Rejected origin ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,  // Only for web origins (session cookies)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);
```

#### 4.3 Apply CORS in server/index.ts

```typescript
// server/index.ts - Add before other middleware
import { corsMiddleware } from './cors';

app.use(corsMiddleware);

// ... rest of middleware
```

---

### Phase 5: Client Token Management

#### 5.1 Mobile App Token Refresh Strategy

The mobile app should implement proactive token refresh:

```typescript
// Mobile app token management (React Native/Expo)
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

// Refresh token 1 minute before expiry
const REFRESH_BUFFER_MS = 60 * 1000;

async function getValidAccessToken(): Promise<string | null> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
  
  if (!accessToken || !expiry) {
    return null;
  }
  
  const expiryTime = parseInt(expiry, 10);
  const now = Date.now();
  
  // Token still valid
  if (now < expiryTime - REFRESH_BUFFER_MS) {
    return accessToken;
  }
  
  // Need to refresh
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return null;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/mobile/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      // Refresh failed - user needs to re-login
      await clearTokens();
      return null;
    }
    
    const data = await response.json();
    await storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
    return data.accessToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

async function storeTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
  const expiry = Date.now() + (expiresIn * 1000);
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiry.toString());
}

async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
}
```

#### 5.2 API Request Interceptor

```typescript
// Mobile app API client
async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = await getValidAccessToken();
  
  if (!accessToken && !endpoint.includes('/auth/')) {
    throw new Error('Not authenticated');
  }
  
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  headers.set('Content-Type', 'application/json');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  // Handle 401 - token expired between check and request
  if (response.status === 401 && accessToken) {
    await clearTokens();
    throw new Error('Session expired');
  }
  
  return response;
}
```

---

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `JWT_SECRET` | Dedicated secret for JWT signing (min 32 chars) | **Yes** | None |
| `JWT_ACCESS_EXPIRES` | Access token expiry | No | `15m` |
| `JWT_REFRESH_EXPIRES` | Refresh token expiry | No | `30d` |

**Security Note:** `JWT_SECRET` should be different from `SESSION_SECRET` to limit blast radius if either is compromised.

---

## Implementation Order (Revised)

| Order | Phase | Task | Estimated Effort | Dependencies |
|-------|-------|------|------------------|--------------|
| 1 | 1.1 | Create refresh_tokens migration | 30 min | None |
| 2 | 1.2 | Install JWT dependencies | 5 min | None |
| 3 | 1.3 | Create JWT service | 1.5 hours | 1.2 |
| 4 | 1.4 | Create refresh token storage | 1 hour | 1.1, 1.3 |
| 5 | 2.1 | Create mobile auth routes | 2 hours | 1.3, 1.4 |
| 6 | 2.2 | Register mobile routes | 15 min | 2.1 |
| 7 | - | **Test mobile auth in isolation** | 1 hour | 2.2 |
| 8 | 3.1 | Extend Request types | 15 min | None |
| 9 | 3.2 | Update isAuthenticated | 1 hour | 3.1 |
| 10 | 3.3 | Update permission middleware | 1 hour | 3.2 |
| 11 | 3.4 | Update CSRF middleware | 30 min | 3.2 |
| 12 | - | **Test web app still works** | 30 min | 3.4 |
| 13 | 4.1-4.3 | Configure CORS | 30 min | None |
| 14 | - | **Full integration testing** | 2 hours | All above |

**Total Estimated Effort:** ~12 hours

**Key Change:** Mobile auth routes are tested in isolation (step 7) before modifying shared middleware. Web app is verified after shared middleware changes (step 12).

---

## Technical Decisions Log

### Decision 1: JWT vs OAuth2 Refresh Tokens
**Decision:** Use self-contained JWTs with database-backed refresh tokens.  
**Rationale:** JWTs allow stateless verification for most requests while refresh tokens in the database enable revocation and multi-device management.

### Decision 2: Shared Auth Middleware vs Separate Routes
**Decision:** Modify existing `isAuthenticated` to handle both auth types.  
**Rationale:** Avoids code duplication and ensures all existing route protections automatically work for mobile.

### Decision 3: CSRF Exemption Strategy (REVISED)
**Decision:** Skip CSRF only after JWT is validated (check `req.authMethod === 'jwt'`).  
**Rationale:** Original approach of checking Authorization header presence was a security vulnerability - it would bypass CSRF for any request with a Bearer token, even invalid ones. The revised approach only skips CSRF after the middleware has confirmed the JWT is valid.

### Decision 4: Short Access Token TTL (REVISED)
**Decision:** Access token: 15 minutes, Refresh token: 30 days.  
**Rationale:** Original 7-day access token was too long for mobile security. Short-lived access tokens limit exposure if a token is stolen. Refresh tokens enable seamless UX while maintaining security through rotation.

### Decision 5: Dedicated JWT Secret (REVISED)
**Decision:** Require separate `JWT_SECRET` environment variable.  
**Rationale:** Sharing `SESSION_SECRET` increases blast radius if compromised. Separate secrets isolate web and mobile auth systems.

### Decision 6: Request Context vs Session Mutation (REVISED)
**Decision:** Use `req.userId`, `req.authMethod` instead of mutating `req.session` for JWT requests.  
**Rationale:** Original approach of setting `req.session` for JWT requests could confuse middleware that expects real session state (CSRF, permission caching). Using separate request properties keeps the two auth methods cleanly separated.

### Decision 7: Refresh Token Rotation
**Decision:** Implement refresh token rotation with revoke-on-reuse detection.  
**Rationale:** If a refresh token is reused (indicating potential theft), the entire token family is revoked, forcing re-authentication on all devices. This limits damage from token theft.

### Decision 8: Implementation Order (REVISED)
**Decision:** Add and test mobile routes before modifying shared middleware.  
**Rationale:** Allows incremental rollout and testing without risking web app breakage. Mobile auth can be fully tested in isolation before any shared code is modified.

---

## Security Considerations

1. **Token Storage on Mobile:** Tokens must be stored in Expo SecureStore (encrypted storage), never in AsyncStorage.

2. **Refresh Token Rotation:** New refresh token issued on each use. Old token immediately revoked.

3. **Reuse Detection:** If a revoked refresh token is used (indicating theft), the entire token family is revoked, forcing re-login on all devices.

4. **Short Access Token TTL:** 15-minute access tokens limit exposure window if stolen.

5. **Device Binding:** Refresh tokens track device ID and user agent for security auditing.

6. **Rate Limiting:** Add rate limiting to auth endpoints:
   - `/api/mobile/auth/google`: 5 attempts per minute per IP
   - `/api/mobile/auth/refresh`: 30 attempts per minute per IP
   - `/api/mobile/auth/logout`: 10 attempts per minute per IP
   - Consider using `express-rate-limit` package with Redis store for distributed rate limiting.

7. **Audit Logging:** All mobile auth events logged to existing audit_logs table.

8. **Dedicated Secrets:** JWT_SECRET separate from SESSION_SECRET.

---

## Rollback Plan

If issues arise after deployment:

1. **Phase 2 (Mobile Routes):** Simply don't use mobile endpoints - web app unaffected
2. **Phase 3 (Shared Middleware):** Revert isAuthenticated to session-only check
3. **Phase 4 (CORS):** Remove CORS middleware - web app unaffected
4. **Feature Flag:** Wrap JWT verification in a flag that can be disabled

---

## Testing Plan

### Unit Tests
- [ ] JWT generation and verification
- [ ] Access token expiration handling
- [ ] Refresh token rotation logic
- [ ] Token reuse detection
- [ ] Domain restriction enforcement

### Integration Tests
- [ ] Mobile auth flow end-to-end
- [ ] Refresh token rotation
- [ ] Token family revocation on reuse
- [ ] Dual auth middleware (session + JWT)
- [ ] Permission checks with JWT auth
- [ ] CORS headers verification

### Web App Regression Tests
- [ ] Session login still works
- [ ] Session logout still works
- [ ] CSRF protection still works
- [ ] All existing API routes accessible
- [ ] Permission checks unchanged

### Manual Testing Checklist
- [ ] Web app continues to work with session auth
- [ ] Mobile app can authenticate with Google
- [ ] Protected routes accessible with JWT
- [ ] Token refresh works correctly
- [ ] Logout invalidates refresh token
- [ ] "Logout all devices" works
- [ ] Stolen token scenario - reuse triggers family revocation

---

## Open Questions

1. **Push Notifications:** Is push notification support needed in Phase 1?
2. **Offline Mode:** What level of offline support is expected?
3. **Device Limits:** Should there be a maximum number of active devices per user?
4. **Biometric Auth:** Should the mobile app support Face ID / Touch ID for re-authentication?

---

## References

- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Google Sign-In for Expo](https://docs.expo.dev/guides/google-authentication/)
- [JWT Best Practices](https://auth0.com/blog/jwt-security-best-practices/)
- [Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
