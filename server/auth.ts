import bcrypt from 'bcrypt';
import session from 'express-session';
import type { Express, RequestHandler } from 'express';
import connectPg from 'connect-pg-simple';
import jwt from 'jsonwebtoken';
import { storage } from './storage';
import { registrationSchema, loginSchema } from '@shared/schema';

const SALT_ROUNDS = 12;
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = '7d'; // 7 days

export function getSession() {
  // TEMPORARY: Use memory store to test if PostgreSQL store is the issue
  console.log('🔐 Setting up session middleware with:', {
    store: 'Memory (temporary)',
    ttl: SESSION_TTL,
    secure: false,
    httpOnly: true
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    // store: sessionStore, // Commented out PostgreSQL store temporarily
    resave: true,
    saveUninitialized: false,
    name: 'drops.sid',
    cookie: {
      httpOnly: true,
      secure: false, // TEMPORARILY DISABLE SECURE COOKIES TO TEST
      maxAge: SESSION_TTL,
      sameSite: 'lax',
      path: '/',
      domain: undefined,
    },
  });
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  
  // Development mode: Create admin user if it doesn't exist
  if (process.env.NODE_ENV === 'development') {
    try {
      setTimeout(async () => {
        try {
          let adminUser = await storage.getUserByEmail('admin@drops.app');
          if (!adminUser) {
            const hashedPassword = await bcrypt.hash('admin123', 12);
            adminUser = await storage.createUser({
              username: 'admin',
              email: 'admin@drops.app',
              password: hashedPassword,
              role: 'admin',
              credits: "1000",
            });
            console.log('✅ Created admin user for development (admin@drops.app / admin123)');
          }
        } catch (error) {
          console.log('Note: Admin user creation will happen after database connection');
        }
      }, 2000);
    } catch (error) {
      // Silent fail - will try again later
    }
  }
  
  // Registration endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const result = registrationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.flatten().fieldErrors 
        });
      }

      const { username, email, password, phoneNumber } = result.data;

      // Check if user already exists
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        phoneNumber,
      });

      // Log them in by setting session
      (req.session as any).userId = user.id;

      res.json({ 
        message: "Registration successful", 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.flatten().fieldErrors 
        });
      }

      const { email, password } = result.data;

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Check if user has a password (for migration compatibility)
      if (!user.password) {
        return res.status(400).json({ message: "Account needs to be updated. Please contact support." });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Check if user is banned or suspended
      if (user.isBanned) {
        return res.status(403).json({ message: "Account is banned" });
      }
      if (user.isSuspended) {
        return res.status(403).json({ message: "Account is suspended" });
      }

      // Log them in by setting session
      (req.session as any).userId = user.id;
      
      // Generate JWT token as backup authentication method
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          email: user.email 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      console.log('🔐 Login successful - Session set:', {
        userId: user.id,
        sessionId: req.sessionID,
        sessionData: req.session,
        jwtToken: token.substring(0, 20) + '...' // Log first 20 chars for debugging
      });

      // Save session to ensure it's persisted
      req.session.save((err) => {
        if (err) {
          console.error('❌ Error saving session:', err);
        } else {
          console.log('✅ Session saved successfully');
          console.log('🔐 Session cookie should be set:', {
            sessionId: req.sessionID,
            cookieName: 'drops.sid',
            cookieValue: req.sessionID,
            maxAge: req.session.cookie.maxAge
          });
          
          // Debug: Check if session is actually in store
          console.log('🔐 Current session data:', {
            sessionId: req.sessionID,
            userId: (req.session as any).userId,
            sessionExists: !!req.session
          });
        }
      });

      // Set cookie manually to ensure it's sent
      res.cookie('drops.sid', req.sessionID, {
        httpOnly: true,
        secure: false, // TEMPORARILY DISABLE SECURE COOKIES
        maxAge: SESSION_TTL,
        sameSite: 'lax',
        path: '/',
      });

      res.json({ 
        message: "Login successful", 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        },
        // Add session ID to response for debugging
        sessionId: req.sessionID,
        // Add JWT token for frontend to store
        token: token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });
}

// JWT Authentication middleware
export const isAuthenticatedJWT: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  console.log('🔐 JWT Authentication middleware called:', {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    tokenPreview: token ? token.substring(0, 20) + '...' : null
  });
  
  if (!token) {
    console.log('❌ No JWT token provided - returning 401');
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('✅ JWT token verified:', { userId: decoded.userId, username: decoded.username });
    
    // Attach user to request
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      console.log('❌ User not found in database - returning 401');
      return res.status(401).json({ message: "User not found" });
    }

    console.log('✅ User authenticated successfully via JWT:', { userId: user.id, username: user.username });
    (req as any).user = user;
    next();
  } catch (error) {
    console.log('❌ JWT token verification failed:', error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Session Authentication middleware (original)
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  console.log('🔐 Session Authentication middleware called:', {
    sessionId: req.sessionID,
    sessionData: req.session,
    userId: (req.session as any)?.userId,
    cookies: req.headers.cookie,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
    referer: req.headers.referer
  });
  
  const userId = (req.session as any)?.userId;
  
  if (!userId) {
    console.log('❌ No userId in session - returning 401');
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Attach user to request
  const user = await storage.getUser(userId);
  if (!user) {
    console.log('❌ User not found in database - returning 401');
    return res.status(401).json({ message: "User not found" });
  }

  console.log('✅ User authenticated successfully via session:', { userId, username: user.username });
  (req as any).user = user;
  next();
};

// Combined Authentication middleware (tries JWT first, then session)
export const isAuthenticatedCombined: RequestHandler = async (req, res, next) => {
  // Try JWT first
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log('✅ JWT authentication successful:', { userId: decoded.userId, username: decoded.username });
      
      const user = await storage.getUser(decoded.userId);
      if (user) {
        (req as any).user = user;
        return next();
      }
    } catch (error) {
      console.log('❌ JWT authentication failed, trying session:', error);
    }
  }
  
  // Fall back to session authentication
  const userId = (req.session as any)?.userId;
  if (userId) {
    const user = await storage.getUser(userId);
    if (user) {
      console.log('✅ Session authentication successful:', { userId, username: user.username });
      (req as any).user = user;
      return next();
    }
  }
  
  console.log('❌ Both JWT and session authentication failed - returning 401');
  return res.status(401).json({ message: "Unauthorized" });
};

// Admin middleware (session-based)
export const isAdmin: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Attach user to request and check admin role
  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }

  (req as any).user = user;
  next();
};

// Combined Admin middleware (JWT + session with admin role check)
export const isAdminCombined: RequestHandler = async (req, res, next) => {
  // Try JWT first
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log('✅ JWT authentication successful for admin:', { userId: decoded.userId, username: decoded.username });
      
      const user = await storage.getUser(decoded.userId);
      if (user && user.role === 'admin') {
        (req as any).user = user;
        return next();
      } else if (user && user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
    } catch (error) {
      console.log('❌ JWT authentication failed for admin, trying session:', error);
    }
  }
  
  // Fall back to session authentication
  const userId = (req.session as any)?.userId;
  if (userId) {
    const user = await storage.getUser(userId);
    if (user && user.role === 'admin') {
      console.log('✅ Session authentication successful for admin:', { userId, username: user.username });
      (req as any).user = user;
      return next();
    } else if (user && user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
  }
  
  console.log('❌ Both JWT and session authentication failed for admin - returning 401');
  return res.status(401).json({ message: "Unauthorized" });
};