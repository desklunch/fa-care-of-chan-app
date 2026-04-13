import { OAuth2Client } from "google-auth-library";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

async function verifyGoogleToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error("Invalid token payload");
  }
  return payload;
}

async function upsertUser(payload: any): Promise<{ user: any; userId: string }> {
  const existingUser = await storage.getUserByEmail(payload.email);
  
  if (existingUser) {
    await storage.updateUser(existingUser.id, {
      firstName: payload.given_name || existingUser.firstName,
      lastName: payload.family_name || existingUser.lastName,
      profileImageUrl: payload.picture || existingUser.profileImageUrl,
    });
    const updatedUser = await storage.getUser(existingUser.id);
    return { user: updatedUser, userId: existingUser.id };
  }

  await storage.upsertUser({
    id: payload.sub,
    email: payload.email,
    firstName: payload.given_name,
    lastName: payload.family_name,
    profileImageUrl: payload.picture,
  });

  const newUser = await storage.getUser(payload.sub);
  return { user: newUser, userId: payload.sub };
}

async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
  id_token?: string;
  scope?: string;
}> {
  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "postmessage",
  );
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    console.warn("Google token exchange did not return a refresh token. User may need to re-authorize when access token expires.");
  }
  return {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token || undefined,
    expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
    id_token: tokens.id_token || undefined,
    scope: tokens.scope || undefined,
  };
}

export async function refreshDriveAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expiry_date: number;
}> {
  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    "postmessage",
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return {
    access_token: credentials.access_token!,
    expiry_date: credentials.expiry_date || Date.now() + 3600 * 1000,
  };
}

export async function getDriveAccessToken(session: any): Promise<string | null> {
  if (!session?.driveAccessToken) {
    return null;
  }

  const bufferMs = 5 * 60 * 1000;
  if (session.driveTokenExpiry && Date.now() < session.driveTokenExpiry - bufferMs) {
    return session.driveAccessToken;
  }

  if (!session.driveRefreshToken) {
    return null;
  }

  try {
    const refreshed = await refreshDriveAccessToken(session.driveRefreshToken);
    session.driveAccessToken = refreshed.access_token;
    session.driveTokenExpiry = refreshed.expiry_date;
    return refreshed.access_token;
  } catch (error) {
    console.error("Failed to refresh Drive token:", error);
    session.driveAccessToken = null;
    session.driveTokenExpiry = null;
    return null;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential } = req.body;
      
      if (!credential) {
        return res.status(400).json({ message: "No credential provided" });
      }

      const payload = await verifyGoogleToken(credential);
      
      const email = payload.email?.toLowerCase();
      const allowedEmails = ["omar@functionalartists.ai", "omar@omar.city"];
      const isAllowedDomain = email?.endsWith("@careofchan.com");
      const isAllowedException = allowedEmails.includes(email || "");
      
      if (!email || (!isAllowedDomain && !isAllowedException)) {
        return res.status(403).json({ 
          message: "Access denied",
          reason: "domain",
          detail: "Only @careofchan.com email addresses are allowed"
        });
      }

      const { user, userId } = await upsertUser(payload);
      
      (req.session as any).userId = userId;
      (req.session as any).email = payload.email;
      (req.session as any).claims = {
        sub: userId,
        email: payload.email,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
      };

      res.json({ success: true, user });
    } catch (error: any) {
      console.error("Google auth error:", error);
      res.status(401).json({ message: "Authentication failed", error: error.message });
    }
  });

  app.post("/api/auth/google-code", async (req, res) => {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ message: "No authorization code provided" });
      }

      if (!GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ message: "Google client secret not configured" });
      }

      const tokens = await exchangeCodeForTokens(code);

      let payload: any = null;
      if (tokens.id_token) {
        payload = await verifyGoogleToken(tokens.id_token);
      }

      const sess = req.session as any;

      if (payload) {
        const email = payload.email?.toLowerCase();
        const allowedEmails = ["omar@functionalartists.ai", "omar@omar.city"];
        const isAllowedDomain = email?.endsWith("@careofchan.com");
        const isAllowedException = allowedEmails.includes(email || "");

        if (!email || (!isAllowedDomain && !isAllowedException)) {
          return res.status(403).json({
            message: "Access denied",
            reason: "domain",
            detail: "Only @careofchan.com email addresses are allowed"
          });
        }

        if (!sess.userId) {
          const { user, userId } = await upsertUser(payload);
          sess.userId = userId;
          sess.email = payload.email;
          sess.claims = {
            sub: userId,
            email: payload.email,
            given_name: payload.given_name,
            family_name: payload.family_name,
            picture: payload.picture,
          };
        }
      }

      sess.driveAccessToken = tokens.access_token;
      sess.driveRefreshToken = tokens.refresh_token || sess.driveRefreshToken;
      sess.driveTokenExpiry = tokens.expiry_date;
      if (tokens.scope) {
        sess.driveGrantedScopes = tokens.scope;
      }

      res.json({ success: true, driveConnected: true });
    } catch (error: any) {
      console.error("Google code exchange error:", error);
      res.status(401).json({ message: "Failed to exchange authorization code", error: error.message });
    }
  });

  app.get("/api/auth/drive-status", async (req, res) => {
    const sess = req.session as any;
    if (!sess?.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hasToken = !!sess.driveAccessToken;
    const hasRefreshToken = !!sess.driveRefreshToken;
    const isExpired = sess.driveTokenExpiry ? Date.now() > sess.driveTokenExpiry : true;
    const grantedScopes = (sess.driveGrantedScopes as string) || "";
    const hasSheetsScope = grantedScopes.includes("spreadsheets");
    const needsScopeUpgrade = hasToken && !hasSheetsScope;

    res.json({
      connected: hasToken && (hasRefreshToken || !isExpired),
      needsReauth: !hasToken || (isExpired && !hasRefreshToken) || needsScopeUpgrade,
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  app.get("/api/auth/session", (req, res) => {
    const session = req.session as any;
    if (session?.userId) {
      res.json({ 
        authenticated: true, 
        userId: session.userId,
        email: session.email,
        driveConnected: !!session.driveAccessToken,
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  if (process.env.NODE_ENV === "development") {
    app.post("/api/auth/dev-login", async (req, res) => {
      try {
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({ message: "Email required" });
        }

        const allowedDevEmails = ["omar@functionalartists.ai"];
        if (!allowedDevEmails.includes(email.toLowerCase())) {
          return res.status(403).json({ message: "Email not allowed for dev login" });
        }

        let user = await storage.getUserByEmail(email);
        
        if (!user) {
          const devUserId = `dev-${Date.now()}`;
          await storage.upsertUser({
            id: devUserId,
            email: email,
            firstName: "Omar",
            lastName: "Dev",
            role: "admin",
          });
          user = await storage.getUser(devUserId);
        }

        if (!user) {
          return res.status(500).json({ message: "Failed to create dev user" });
        }

        (req.session as any).userId = user.id;
        (req.session as any).email = email;
        (req.session as any).claims = {
          sub: user.id,
          email: email,
          given_name: user.firstName,
          family_name: user.lastName,
        };

        res.json({ success: true, user });
      } catch (error: any) {
        console.error("Dev login error:", error);
        res.status(500).json({ message: "Dev login failed", error: error.message });
      }
    });
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const session = req.session as any;
  
  if (!session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = {
    claims: session.claims
  };
  
  next();
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  const session = req.session as any;
  if (!session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  
  (req as any).user = {
    claims: session.claims
  };
  
  next();
};

export const isManagerOrAdmin: RequestHandler = async (req, res, next) => {
  const session = req.session as any;
  if (!session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(session.userId);
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return res.status(403).json({ message: "Forbidden: Manager or Admin access required" });
  }
  
  (req as any).user = {
    claims: session.claims
  };
  
  next();
};
