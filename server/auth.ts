import express, { RequestHandler } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { storage } from './storage.js';
import { registrationSchema, loginSchema } from '../shared/schema.js';
import { testDatabaseConnection } from './db.js';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-secret-for-testing';
const JWT_EXPIRES_IN = '7d';

console.log('🔐 JWT Secret configured:', JWT_SECRET ? 'Yes' : 'No');

export function setupAuth(app: express.Application) {
  console.log('🔐 Setting up authentication with real database');

  // Registration endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const result = registrationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: result.error.errors 
        });
      }

      const { username, email, password } = result.data;

      // Check if database is available
      const dbAvailable = await testDatabaseConnection();
      if (!dbAvailable) {
        return res.status(503).json({ 
          message: "Database temporarily unavailable. Please try again later." 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        credits: "300", // Welcome bonus credits
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          email: user.email 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      console.log('✅ Registration successful:', {
        userId: user.id,
        username: user.username,
        email: user.email
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          credits: user.credits
        },
        token: token
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
          errors: result.error.errors 
        });
      }

      const { email, password } = result.data;

      // Check if database is available
      const dbAvailable = await testDatabaseConnection();
      if (!dbAvailable) {
        return res.status(503).json({ 
          message: "Database temporarily unavailable. Please try again later." 
        });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Check if user is active
      if (user.isActive === false) {
        return res.status(403).json({ message: "Account is inactive" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          email: user.email 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      console.log('✅ Login successful:', {
        userId: user.id,
        username: user.username,
        email: user.email
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          credits: user.credits
        },
        token: token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // User endpoint
  app.get('/api/auth/user', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Check if database is available
      const dbAvailable = await testDatabaseConnection();
      if (!dbAvailable) {
        return res.status(503).json({ 
          message: "Database temporarily unavailable. Please try again later." 
        });
      }

      // Get user from database
      const user = await storage.getUser(decoded.userId);
      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }

      console.log('✅ User fetch successful:', {
        userId: user.id,
        username: user.username
      });

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        credits: user.credits,
        role: user.role || 'user'
      });
    } catch (error) {
      console.error("User fetch error:", error);
      res.status(401).json({ message: "Invalid token" });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    res.json({ message: "Logout successful" });
  });
}

// JWT Authentication middleware
export const isAuthenticatedJWT: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    console.log('🔐 Validating JWT token:', token.substring(0, 20) + '...');
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('🔐 JWT token decoded successfully:', { userId: decoded.userId, username: decoded.username });
    
    // Check if database is available
    const dbAvailable = await testDatabaseConnection();
    if (!dbAvailable) {
      return res.status(503).json({ 
        message: "Database temporarily unavailable. Please try again later." 
      });
    }

    // Get user from database
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      console.log('🔐 User not found in database:', decoded.userId);
      return res.status(401).json({ message: "Invalid token" });
    }

    // Attach user to request
    (req as any).user = {
      id: user.id,
      username: user.username,
      email: user.email,
      credits: user.credits,
      role: user.role || 'user'
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Admin authentication middleware
export const isAdminJWT: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if database is available
    const dbAvailable = await testDatabaseConnection();
    if (!dbAvailable) {
      return res.status(503).json({ 
        message: "Database temporarily unavailable. Please try again later." 
      });
    }

    // Get user from database
    const user = await storage.getUser(decoded.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Attach user to request
    (req as any).user = {
      id: user.id,
      username: user.username,
      email: user.email,
      credits: user.credits,
      role: user.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Combined authentication middleware (for compatibility)
export const isAuthenticatedCombined = isAuthenticatedJWT;
export const isAdminCombined = isAdminJWT;

// Legacy middleware (for compatibility)
export const isAuthenticated = isAuthenticatedJWT;
export const isAdmin = isAdminJWT;

// Session middleware (disabled for JWT-only system)
export function getSession() {
  return (req: any, res: any, next: any) => {
    // JWT-only system - no session needed
    next();
  };
}