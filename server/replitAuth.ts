import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

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

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  try {
    // Check if user already exists by looking for a user with this Replit ID in their username or a custom field
    const replitUserId = claims["sub"];
    const email = claims["email"];
    
    // First try to find user by email
    let user = email ? await storage.getUserByEmail(email) : null;
    
    if (!user) {
      // If no user found, create a new one
      user = await storage.createUser({
        email: email || null,
        firstName: claims["first_name"] || null,
        lastName: claims["last_name"] || null,
        profileImageUrl: claims["profile_image_url"] || null,
        username: email || `replit_user_${replitUserId}`,
      });
    }
    
    return user;
  } catch (error) {
    console.error("Error upserting user:", error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      const dbUser = await upsertUser(tokens.claims());
      // Store database user ID in session for later use
      (user as any).dbUserId = dbUser.id;
      verified(null, user);
    } catch (error) {
      console.error("Authentication verification failed:", error);
      verified(error, false);
    }
  };

  // Get all domains including localhost for development
  const domains = process.env.REPLIT_DOMAINS!.split(",");
  if (process.env.NODE_ENV === "development") {
    domains.push("localhost:5000");
    domains.push("localhost");
  }
  
  for (const domain of domains) {
    console.log(`Registering strategy: replitauth:${domain}`);
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log(`Login attempt for hostname: ${req.hostname}`);
    console.log(`Available strategies:`, passport._strategies);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log(`Callback received for hostname: ${req.hostname}`);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Attach database user to request for easier access
    await attachDatabaseUser(req, user);
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    await attachDatabaseUser(req, user);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Helper function to attach database user to request
async function attachDatabaseUser(req: any, sessionUser: any) {
  try {
    let dbUser;
    if (sessionUser.dbUserId) {
      dbUser = await storage.getUser(sessionUser.dbUserId);
    } else if (sessionUser.claims?.email) {
      dbUser = await storage.getUserByEmail(sessionUser.claims.email);
    }
    
    if (dbUser) {
      req.dbUser = dbUser;
    }
  } catch (error) {
    console.error("Error attaching database user:", error);
  }
}

export const isAdmin: RequestHandler = async (req, res, next) => {
  // First check authentication
  const user = req.user as any;
  if (!req.isAuthenticated() || !user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if user has admin role
  const userId = user.claims.sub;
  const dbUser = await storage.getUser(userId);
  if (!dbUser || dbUser.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};
