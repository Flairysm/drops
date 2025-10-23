import { Request, Response, NextFunction } from 'express';
import { isProduction } from './config/environment';

// Log levels
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

// Structured logging interface
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Performance metrics
interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  slowRequests: number;
  lastReset: Date;
}

class Logger {
  private static instance: Logger;
  private metrics: PerformanceMetrics;

  private constructor() {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      slowRequests: 0,
      lastReset: new Date()
    };
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatLog(entry: LogEntry): string {
    const logData = {
      ...entry,
      timestamp: new Date().toISOString(),
      environment: isProduction ? 'production' : 'development'
    };

    return JSON.stringify(logData);
  }

  public log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    const formattedLog = this.formatLog(entry);
    
    // Console output with colors for development
    if (!isProduction) {
      const colors = {
        [LogLevel.ERROR]: '\x1b[31m', // Red
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.INFO]: '\x1b[36m',  // Cyan
        [LogLevel.DEBUG]: '\x1b[90m'  // Gray
      };
      console.log(`${colors[level]}${level}\x1b[0m: ${message}`, context || '');
    } else {
      // In production, log to console (can be redirected to file or external service)
      console.log(formattedLog);
    }
  }

  public error(message: string, error?: Error, context?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    const formattedLog = this.formatLog(entry);
    console.error(formattedLog);
  }

  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  public debug(message: string, context?: Record<string, any>): void {
    if (!isProduction) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  // Performance tracking
  public trackRequest(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function(data) {
      const duration = Date.now() - startTime;
      const logger = Logger.getInstance();
      
      // Update metrics
      logger.updateMetrics(duration, res.statusCode >= 400);
      
      // Log request details
      const logContext = {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id
      };

      if (res.statusCode >= 400) {
        logger.error(`Request failed: ${req.method} ${req.path}`, undefined, logContext);
      } else if (duration > 2000) {
        logger.warn(`Slow request: ${req.method} ${req.path}`, logContext);
      } else {
        logger.debug(`Request completed: ${req.method} ${req.path}`, logContext);
      }

      return originalSend.call(this, data);
    };

    next();
  }

  private updateMetrics(duration: number, isError: boolean): void {
    this.metrics.requestCount++;
    
    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.requestCount - 1) + duration) / 
      this.metrics.requestCount;
    
    // Track slow requests (>2 seconds)
    if (duration > 2000) {
      this.metrics.slowRequests++;
    }
    
    // Update error rate
    if (isError) {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.requestCount - 1) + 1) / 
                               this.metrics.requestCount;
    } else {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.requestCount - 1)) / 
                               this.metrics.requestCount;
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      slowRequests: 0,
      lastReset: new Date()
    };
  }

  // Security event logging
  public logSecurityEvent(event: string, details: Record<string, any>): void {
    this.warn(`Security Event: ${event}`, {
      ...details,
      timestamp: new Date().toISOString(),
      type: 'security'
    });
  }

  // Business event logging
  public logBusinessEvent(event: string, details: Record<string, any>): void {
    this.info(`Business Event: ${event}`, {
      ...details,
      timestamp: new Date().toISOString(),
      type: 'business'
    });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Middleware for request tracking
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.trackRequest(req, res, next);
};

// Health check system
export const healthCheck = {
  database: async (): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> => {
    try {
      // This would be implemented with your actual database connection
      // For now, returning healthy
      return { status: 'healthy' };
    } catch (error) {
      logger.error('Database health check failed', error as Error);
      return { status: 'unhealthy', details: (error as Error).message };
    }
  },

  redis: async (): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> => {
    try {
      // Implement Redis health check if you're using Redis
      return { status: 'healthy' };
    } catch (error) {
      logger.error('Redis health check failed', error as Error);
      return { status: 'unhealthy', details: (error as Error).message };
    }
  },

  overall: async (): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, any>;
    metrics: PerformanceMetrics;
  }> => {
    const checks = {
      database: await healthCheck.database(),
      redis: await healthCheck.redis(),
    };

    const metrics = logger.getMetrics();
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (Object.values(checks).some(check => check.status === 'unhealthy')) {
      status = 'unhealthy';
    } else if (metrics.errorRate > 0.05 || metrics.slowRequests > 10) { // 5% error rate or >10 slow requests
      status = 'degraded';
    }

    return {
      status,
      checks,
      metrics
    };
  }
};

// Error tracking and alerting
export const errorTracker = {
  trackError: (error: Error, context?: Record<string, any>) => {
    logger.error('Application Error', error, context);
    
    // In production, you might want to send this to an external service like Sentry
    if (isProduction) {
      // Example: Sentry.captureException(error, { extra: context });
    }
  },

  trackUnhandledRejection: (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', new Error(reason), {
      promise: promise.toString(),
      reason
    });
  },

  trackUncaughtException: (error: Error) => {
    logger.error('Uncaught Exception', error);
    // In production, you might want to gracefully shutdown
    if (isProduction) {
      process.exit(1);
    }
  }
};

// Initialize error tracking
if (isProduction) {
  process.on('unhandledRejection', errorTracker.trackUnhandledRejection);
  process.on('uncaughtException', errorTracker.trackUncaughtException);
}

// Performance monitoring
export const performanceMonitor = {
  startTimer: (label: string) => {
    const start = process.hrtime.bigint();
    return {
      end: () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1000000; // Convert to milliseconds
        logger.debug(`Performance: ${label}`, { duration });
        return duration;
      }
    };
  },

  measureAsync: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const timer = performanceMonitor.startTimer(label);
    try {
      const result = await fn();
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  }
};