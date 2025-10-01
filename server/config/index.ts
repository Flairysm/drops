import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

// Configuration schema validation
const configSchema = z.object({
  // Server configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('localhost'),
  
  // Database configuration
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  DB_POOL_MIN: z.string().transform(Number).default('2'),
  DB_POOL_MAX: z.string().transform(Number).default('10'),
  DB_TIMEOUT: z.string().transform(Number).default('30000'),
  
  // Authentication configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  SESSION_MAX_AGE: z.string().transform(Number).default('86400000'), // 24 hours
  
  // Security configuration
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Admin configuration
  ADMIN_IP_WHITELIST: z.string().optional(),
  ADMIN_SESSION_TIMEOUT: z.string().transform(Number).default('1800000'), // 30 minutes
  
  // Monitoring configuration
  METRICS_COLLECTION_INTERVAL: z.string().transform(Number).default('60000'), // 1 minute
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).default('30000'), // 30 seconds
  
  // Cache configuration
  REDIS_URL: z.string().optional(),
  CACHE_TTL: z.string().transform(Number).default('3600'), // 1 hour
  
  // Email configuration
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  
  // File upload configuration
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'), // 10MB
  UPLOAD_PATH: z.string().default('./uploads'),
  
  // Logging configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().optional(),
  
  // Feature flags
  ENABLE_REGISTRATION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_MAINTENANCE_MODE: z.string().transform(val => val === 'true').default('false'),
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('false'),
});

// Parse and validate configuration
const parseConfig = () => {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const appConfig = parseConfig();

// Configuration categories
export const serverConfig = {
  env: appConfig.NODE_ENV,
  port: appConfig.PORT,
  host: appConfig.HOST,
  isDevelopment: appConfig.NODE_ENV === 'development',
  isProduction: appConfig.NODE_ENV === 'production',
  isTest: appConfig.NODE_ENV === 'test',
};

export const databaseConfig = {
  url: appConfig.DATABASE_URL,
  pool: {
    min: appConfig.DB_POOL_MIN,
    max: appConfig.DB_POOL_MAX,
    timeout: appConfig.DB_TIMEOUT,
  },
};

export const authConfig = {
  jwt: {
    secret: appConfig.JWT_SECRET,
    expiresIn: appConfig.JWT_EXPIRES_IN,
  },
  session: {
    secret: appConfig.SESSION_SECRET,
    maxAge: appConfig.SESSION_MAX_AGE,
  },
};

export const securityConfig = {
  cors: {
    origin: appConfig.CORS_ORIGIN.split(',').map(origin => origin.trim()),
  },
  rateLimit: {
    windowMs: appConfig.RATE_LIMIT_WINDOW_MS,
    maxRequests: appConfig.RATE_LIMIT_MAX_REQUESTS,
  },
  admin: {
    ipWhitelist: appConfig.ADMIN_IP_WHITELIST?.split(',').map(ip => ip.trim()) || [],
    sessionTimeout: appConfig.ADMIN_SESSION_TIMEOUT,
  },
};

export const monitoringConfig = {
  metrics: {
    collectionInterval: appConfig.METRICS_COLLECTION_INTERVAL,
  },
  healthCheck: {
    interval: appConfig.HEALTH_CHECK_INTERVAL,
  },
};

export const cacheConfig = {
  redis: {
    url: appConfig.REDIS_URL,
  },
  ttl: appConfig.CACHE_TTL,
};

export const emailConfig = {
  smtp: {
    host: appConfig.SMTP_HOST,
    port: appConfig.SMTP_PORT,
    user: appConfig.SMTP_USER,
    pass: appConfig.SMTP_PASS,
  },
  from: appConfig.FROM_EMAIL,
};

export const uploadConfig = {
  maxFileSize: appConfig.MAX_FILE_SIZE,
  uploadPath: appConfig.UPLOAD_PATH,
};

export const loggingConfig = {
  level: appConfig.LOG_LEVEL,
  file: appConfig.LOG_FILE,
};

export const featureFlags = {
  enableRegistration: appConfig.ENABLE_REGISTRATION,
  enableMaintenanceMode: appConfig.ENABLE_MAINTENANCE_MODE,
  enableAnalytics: appConfig.ENABLE_ANALYTICS,
};

// Configuration validation utilities
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check required configurations
  if (!appConfig.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }
  
  if (!appConfig.JWT_SECRET || appConfig.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }
  
  if (!appConfig.SESSION_SECRET || appConfig.SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters long');
  }
  
  // Check database URL format
  if (appConfig.DATABASE_URL && !appConfig.DATABASE_URL.startsWith('postgres://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }
  
  // Check port range
  if (appConfig.PORT < 1 || appConfig.PORT > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  // Check pool configuration
  if (appConfig.DB_POOL_MIN < 1) {
    errors.push('DB_POOL_MIN must be at least 1');
  }
  
  if (appConfig.DB_POOL_MAX < appConfig.DB_POOL_MIN) {
    errors.push('DB_POOL_MAX must be greater than or equal to DB_POOL_MIN');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

// Configuration hot reload (for development)
export const reloadConfig = (): void => {
  if (serverConfig.isDevelopment) {
    console.log('🔄 Reloading configuration...');
    try {
      const newConfig = parseConfig();
      Object.assign(appConfig, newConfig);
      console.log('✅ Configuration reloaded successfully');
    } catch (error) {
      console.error('❌ Failed to reload configuration:', error);
    }
  }
};

// Environment-specific configurations
export const getEnvironmentConfig = () => {
  const baseConfig = {
    server: serverConfig,
    database: databaseConfig,
    auth: authConfig,
    security: securityConfig,
    monitoring: monitoringConfig,
    cache: cacheConfig,
    email: emailConfig,
    upload: uploadConfig,
    logging: loggingConfig,
    features: featureFlags,
  };

  if (serverConfig.isDevelopment) {
    return {
      ...baseConfig,
      logging: {
        ...baseConfig.logging,
        level: 'debug' as const,
      },
      security: {
        ...baseConfig.security,
        rateLimit: {
          ...baseConfig.security.rateLimit,
          maxRequests: 1000, // More lenient in development
        },
      },
    };
  }

  if (serverConfig.isProduction) {
    return {
      ...baseConfig,
      logging: {
        ...baseConfig.logging,
        level: 'info' as const,
      },
      security: {
        ...baseConfig.security,
        rateLimit: {
          ...baseConfig.security.rateLimit,
          maxRequests: 100, // Stricter in production
        },
      },
    };
  }

  return baseConfig;
};

// Configuration export
export default getEnvironmentConfig();
