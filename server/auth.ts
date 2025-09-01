import bcrypt from 'bcrypt';
import session from 'express-session';
import type { Express, RequestHandler } from 'express';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';
import { registrationSchema, loginSchema } from '@shared/schema';

const SALT_ROUNDS = 12;

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
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
      secure: false, // Always false for local development
      maxAge: sessionTtl,
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

      res.json({ 
        message: "Login successful", 
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email 
        } 
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

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const userId = (req.session as any)?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Attach user to request
  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  (req as any).user = user;
  next();
};

// Admin middleware
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