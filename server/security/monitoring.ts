// Security monitoring and logging
import { Request, Response, NextFunction } from 'express';

interface SecurityEvent {
  timestamp: string;
  ip: string;
  userAgent: string;
  url: string;
  method: string;
  event: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
}

export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log suspicious activity patterns
  const suspiciousPatterns = [
    { pattern: /\.\./, name: 'Directory Traversal' },
    { pattern: /<script/i, name: 'XSS Attempt' },
    { pattern: /union.*select/i, name: 'SQL Injection' },
    { pattern: /javascript:/i, name: 'JavaScript Injection' },
    { pattern: /eval\(/i, name: 'Code Injection' },
    { pattern: /base64/i, name: 'Base64 Encoding' },
    { pattern: /cmd\.exe/i, name: 'Command Injection' },
    { pattern: /\.php/i, name: 'PHP File Access' },
  ];

  const checkSuspiciousActivity = (input: string): SecurityEvent | null => {
    for (const { pattern, name } of suspiciousPatterns) {
      if (pattern.test(input)) {
        return {
          timestamp: new Date().toISOString(),
          ip: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          url: req.url,
          method: req.method,
          event: name,
          severity: 'high',
          details: { input: input.substring(0, 100) }
        };
      }
    }
    return null;
  };

  // Check URL for suspicious patterns
  const urlThreat = checkSuspiciousActivity(req.url);
  if (urlThreat) {
    console.warn('🚨 SECURITY THREAT DETECTED:', JSON.stringify(urlThreat));
  }

  // Check body for suspicious patterns
  if (req.body && typeof req.body === 'object') {
    const bodyString = JSON.stringify(req.body);
    const bodyThreat = checkSuspiciousActivity(bodyString);
    if (bodyThreat) {
      console.warn('🚨 SECURITY THREAT IN BODY:', JSON.stringify(bodyThreat));
    }
  }

  // Check query parameters
  if (req.query && typeof req.query === 'object') {
    const queryString = JSON.stringify(req.query);
    const queryThreat = checkSuspiciousActivity(queryString);
    if (queryThreat) {
      console.warn('🚨 SECURITY THREAT IN QUERY:', JSON.stringify(queryThreat));
    }
  }

  // Log response time for performance monitoring
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration > 2000) {
      console.warn(`🐌 Slow request: ${req.method} ${req.path} - ${duration}ms from ${req.ip}`);
    }
    
    // Log high response times as potential DoS
    if (duration > 10000) {
      console.error(`🚨 CRITICAL: Very slow request: ${req.method} ${req.path} - ${duration}ms from ${req.ip}`);
    }
  });

  next();
};

// Authentication failure monitoring
export const authFailureLogger = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Check if this is an authentication failure
    if (res.statusCode === 401 || res.statusCode === 403) {
      const authEvent: SecurityEvent = {
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        url: req.url,
        method: req.method,
        event: 'Authentication Failure',
        severity: 'medium',
        details: { 
          statusCode: res.statusCode,
          body: typeof data === 'string' ? data.substring(0, 100) : 'JSON response'
        }
      };
      
      console.warn('🔐 AUTH FAILURE:', JSON.stringify(authEvent));
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Rate limit violation monitoring
export const rateLimitLogger = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Check if this is a rate limit violation
    if (res.statusCode === 429) {
      const rateLimitEvent: SecurityEvent = {
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        url: req.url,
        method: req.method,
        event: 'Rate Limit Exceeded',
        severity: 'medium',
        details: { 
          statusCode: res.statusCode,
          retryAfter: res.get('Retry-After')
        }
      };
      
      console.warn('⏰ RATE LIMIT EXCEEDED:', JSON.stringify(rateLimitEvent));
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};
