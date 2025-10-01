import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Rate limiting configurations
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req: Request, res: Response) => {
      console.log(`🚫 Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests from this IP, please try again later.',
        retryAfter: Math.round(options.windowMs / 1000),
      });
    },
  });
};

// Admin-specific rate limiting
export const adminRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many admin requests from this IP, please try again later.',
});

// Login rate limiting (stricter)
export const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again later.',
  skipSuccessfulRequests: true,
});

// API rate limiting (general)
export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many API requests from this IP, please try again later.',
});

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// IP whitelist middleware for admin endpoints
export const adminIPWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // Allow localhost in development
    if (process.env.NODE_ENV === 'development') {
      if (clientIP === '127.0.0.1' || clientIP === '::1' || clientIP === '::ffff:127.0.0.1') {
        return next();
      }
    }

    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      console.log(`🚫 Admin access denied for IP: ${clientIP}`);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized to access admin endpoints.',
      });
    }

    next();
  };
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    };

    // Log admin requests with more detail
    if (req.url.startsWith('/api/admin')) {
      console.log(`🔐 Admin Request:`, logData);
    } else if (req.url.startsWith('/api/')) {
      console.log(`🌐 API Request:`, logData);
    }

    return originalSend.call(this, data);
  };

  next();
};

// CORS configuration for admin endpoints
export const adminCors = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://yourdomain.com', // Replace with your production domain
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potentially dangerous characters
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

// Admin session timeout middleware
export const adminSessionTimeout = (timeoutMs: number = 30 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.url.startsWith('/api/admin') && req.session) {
      const now = Date.now();
      const lastActivity = req.session.lastActivity || now;
      
      if (now - lastActivity > timeoutMs) {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });
        
        return res.status(401).json({
          error: 'Session expired',
          message: 'Your admin session has expired. Please log in again.',
        });
      }
      
      req.session.lastActivity = now;
    }
    
    next();
  };
};
