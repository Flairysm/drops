import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { isProduction } from './config/environment';

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
});

// Rate limiting configurations
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skip?: (req: Request) => boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: options.skip,
    handler: (req: Request, res: Response) => {
      console.warn(`🚨 Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later.'
});

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // Different limits for prod/dev
  skip: (req: Request) => {
    // Skip rate limiting for certain paths in development
    if (!isProduction) {
      return req.path.includes('/favicon.ico') || 
             req.path.includes('/@vite/') ||
             req.path.includes('/node_modules/') ||
             req.path.includes('/src/') ||
             req.path.includes('/play');
    }
    return false;
  }
});

export const gameRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 game actions per minute
  message: 'Too many game actions, please slow down.'
});

export const packRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 pack operations per minute
  message: 'Too many pack operations, please slow down.'
});

// Input validation and sanitization
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove any potentially dangerous characters
  const sanitizeString = (str: string): string => {
    return str.replace(/[<>\"'%;()&+]/g, '');
  };

  // Sanitize string inputs in body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key] as string);
      }
    }
  }

  next();
};

// Security logging middleware
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log suspicious activity
  const suspiciousPatterns = [
    /\.\./, // Directory traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript injection
  ];

  const checkSuspiciousActivity = (input: string) => {
    return suspiciousPatterns.some(pattern => pattern.test(input));
  };

  // Check URL for suspicious patterns
  if (checkSuspiciousActivity(req.url)) {
    console.warn(`🚨 Suspicious URL detected: ${req.ip} - ${req.url}`);
  }

  // Check body for suspicious patterns
  if (req.body && JSON.stringify(req.body).match(/<script|javascript:|\.\./i)) {
    console.warn(`🚨 Suspicious request body detected: ${req.ip} - ${req.url}`);
  }

  // Log response time for performance monitoring
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 2000) { // Log slow requests
      console.warn(`🐌 Slow request: ${req.method} ${req.path} - ${duration}ms from ${req.ip}`);
    }
  });

  next();
};

// CORS configuration
export const corsConfig = {
  origin: isProduction 
    ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'])
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

// Environment validation
export const validateEnvironment = () => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'DATABASE_URL',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }

  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
};

// Security headers for API responses
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server identification
  res.removeHeader('X-Powered-By');
  
  next();
};
