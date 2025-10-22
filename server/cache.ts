import Redis from 'ioredis';
import { log } from './vite';

// ============================================================================
// REDIS CACHE CONFIGURATION
// ============================================================================

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Create Redis client
export const redis = new Redis(redisConfig);

// Handle Redis connection events
redis.on('connect', () => {
  log('✅ Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
  if (process.env.NODE_ENV === 'production') {
    // In production, we might want to exit if Redis is critical
    // For now, we'll continue without caching
    log('⚠️  Continuing without Redis caching');
  }
});

redis.on('close', () => {
  log('🔌 Redis connection closed');
});

// ============================================================================
// CACHE UTILITIES
// ============================================================================

export class CacheManager {
  private static instance: CacheManager;
  private isRedisAvailable: boolean = true;

  private constructor() {
    // Check Redis availability
    redis.ping().catch(() => {
      this.isRedisAvailable = false;
      log('⚠️  Redis not available, using in-memory fallback');
    });
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // ============================================================================
  // CACHE OPERATIONS
  // ============================================================================

  async get<T>(key: string): Promise<T | null> {
    if (!this.isRedisAvailable) {
      return null;
    }

    try {
      const value = await redis.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    if (!this.isRedisAvailable) {
      return false;
    }

    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isRedisAvailable) {
      return false;
    }

    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isRedisAvailable) {
      return false;
    }

    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  // ============================================================================
  // CACHE PATTERNS
  // ============================================================================

  // Cache with automatic invalidation
  async cacheWithInvalidation<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 300,
    invalidateKeys: string[] = []
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();
    
    // Cache the result
    await this.set(key, data, ttlSeconds);
    
    // Set up invalidation keys
    if (invalidateKeys.length > 0) {
      await this.set(`${key}:invalidate`, invalidateKeys, ttlSeconds);
    }

    return data;
  }

  // Invalidate related cache entries
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.isRedisAvailable) {
      return 0;
    }

    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }

  // ============================================================================
  // SPECIFIC CACHE KEYS
  // ============================================================================

  // User-related cache keys
  static getUserKey(userId: string): string {
    return `user:${userId}`;
  }

  static getUserCardsKey(userId: string, page: number = 1, limit: number = 16): string {
    return `user_cards:${userId}:${page}:${limit}`;
  }

  static getUserCardsCountKey(userId: string): string {
    return `user_cards_count:${userId}`;
  }

  // Pack-related cache keys
  static getMysteryPacksKey(): string {
    return 'mystery_packs:active';
  }

  static getClassicPacksKey(): string {
    return 'classic_packs:active';
  }

  static getSpecialPacksKey(): string {
    return 'special_packs:active';
  }

  // Feed-related cache keys
  static getGlobalFeedKey(limit: number, minTier: string): string {
    return `global_feed:${limit}:${minTier}`;
  }

  // Shipping-related cache keys
  static getShippingRequestsKey(status?: string): string {
    return status ? `shipping_requests:${status}` : 'shipping_requests:all';
  }

  // ============================================================================
  // CACHE INVALIDATION HELPERS
  // ============================================================================

  // Invalidate all user-related cache
  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidatePattern(`user:${userId}*`);
    await this.invalidatePattern(`user_cards:${userId}*`);
  }

  // Invalidate all pack-related cache
  async invalidatePackCache(): Promise<void> {
    await this.invalidatePattern('mystery_packs:*');
    await this.invalidatePattern('classic_packs:*');
    await this.invalidatePattern('special_packs:*');
  }

  // Invalidate all feed-related cache
  async invalidateFeedCache(): Promise<void> {
    await this.invalidatePattern('global_feed:*');
  }

  // Invalidate all shipping-related cache
  async invalidateShippingCache(): Promise<void> {
    await this.invalidatePattern('shipping_requests:*');
  }
}

// Export singleton instance
export const cache = CacheManager.getInstance();

// ============================================================================
// CACHE MIDDLEWARE
// ============================================================================

export function withCache<T>(
  keyGenerator: (req: any) => string,
  ttlSeconds: number = 300,
  invalidateKeys: string[] = []
) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const req = args[0]; // Assuming first argument is request
      const key = keyGenerator(req);
      
      return cache.cacheWithInvalidation(
        key,
        () => method.apply(this, args),
        ttlSeconds,
        invalidateKeys
      );
    };
  };
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function checkCacheHealth(): Promise<{ status: string; latency?: number }> {
  try {
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    
    return {
      status: 'healthy',
      latency
    };
  } catch (error) {
    return {
      status: 'unhealthy'
    };
  }
}
