// Environment configuration and validation
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isTest = process.env.NODE_ENV === 'test';

// Database configuration
export const databaseConfig = {
  url: process.env.DATABASE_URL || '',
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
};

// JWT configuration
export const jwtConfig = {
  secret: process.env.JWT_SECRET || '',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
};

// Session configuration
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || '',
  name: process.env.SESSION_NAME || 'session',
  secure: isProduction,
  httpOnly: true,
  sameSite: isProduction ? 'strict' as const : 'lax' as const,
  maxAge: parseInt(process.env.SESSION_MAX_AGE || '604800000'), // 7 days
};

// Admin configuration
export const adminConfig = {
  email: process.env.ADMIN_EMAIL || '',
  password: process.env.ADMIN_PASSWORD || '',
};

// Server configuration
export const serverConfig = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  cors: {
    origin: isProduction 
      ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
      : true,
    credentials: true,
  },
};

// Redis configuration (if using Redis)
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: isProduction 
    ? parseInt(process.env.RATE_LIMIT_MAX || '100')
    : parseInt(process.env.RATE_LIMIT_MAX_DEV || '1000'),
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

// Logging configuration
export const loggingConfig = {
  level: isProduction ? 'info' : 'debug',
  format: isProduction ? 'json' : 'pretty',
  enableConsole: true,
  enableFile: isProduction,
  filePath: process.env.LOG_FILE_PATH || './logs/app.log',
  maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10MB',
  maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
};

// Security configuration
export const securityConfig = {
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
  lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000'), // 15 minutes
  enableCSP: isProduction,
  enableHSTS: isProduction,
  enableXSSProtection: true,
};

// Game configuration
export const gameConfig = {
  diceCost: parseInt(process.env.DICE_GAME_COST || '250'),
  energyMatchCost: parseInt(process.env.ENERGY_MATCH_COST || '200'),
  findPikachuCost: parseInt(process.env.FIND_PIKACHU_COST || '150'),
  maxGamesPerMinute: parseInt(process.env.MAX_GAMES_PER_MINUTE || '10'),
};

// Pack configuration
export const packConfig = {
  maxPacksPerMinute: parseInt(process.env.MAX_PACKS_PER_MINUTE || '20'),
  defaultPackPrice: parseInt(process.env.DEFAULT_PACK_PRICE || '100'),
  maxPackPrice: parseInt(process.env.MAX_PACK_PRICE || '10000'),
};

// Monitoring configuration
export const monitoringConfig = {
  enableMetrics: isProduction,
  metricsPort: parseInt(process.env.METRICS_PORT || '9090'),
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'), // 30 seconds
  slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '2000'), // 2 seconds
  errorRateThreshold: parseFloat(process.env.ERROR_RATE_THRESHOLD || '0.05'), // 5%
};

// Email configuration (if using email notifications)
export const emailConfig = {
  provider: process.env.EMAIL_PROVIDER || 'smtp',
  host: process.env.EMAIL_HOST || '',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
  },
  from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
};

// File upload configuration
export const uploadConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
  allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/gif').split(','),
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  enableCompression: process.env.ENABLE_IMAGE_COMPRESSION === 'true',
};

// Validation function
export const validateEnvironment = (): void => {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }

  // Validate JWT secret strength
  if (jwtConfig.secret.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  // Validate admin credentials
  if (adminConfig.email.length < 5 || adminConfig.password.length < 8) {
    console.error('❌ Admin credentials must be properly configured');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
};

// Export all configurations
export const config = {
  isProduction,
  isDevelopment,
  isTest,
  database: databaseConfig,
  jwt: jwtConfig,
  session: sessionConfig,
  admin: adminConfig,
  server: serverConfig,
  redis: redisConfig,
  rateLimit: rateLimitConfig,
  logging: loggingConfig,
  security: securityConfig,
  game: gameConfig,
  pack: packConfig,
  monitoring: monitoringConfig,
  email: emailConfig,
  upload: uploadConfig,
};
