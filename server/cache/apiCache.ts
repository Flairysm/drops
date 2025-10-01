import { Request, Response, NextFunction } from 'express';
import { CacheManager } from './cacheManager';
import crypto from 'crypto';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  shouldCache?: (req: Request, res: Response) => boolean;
  varyHeaders?: string[]; // Headers that affect cache key
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  size: number;
}

export class APICacheMiddleware {
  private static instance: APICacheMiddleware;
  private cacheManager: CacheManager;
  private defaultConfig: CacheConfig = {
    ttl: 300, // 5 minutes
    shouldCache: (req, res) => res.statusCode === 200,
  };

  private constructor() {
    this.cacheManager = CacheManager.getInstance();
  }

  static getInstance(): APICacheMiddleware {
    if (!APICacheMiddleware.instance) {
      APICacheMiddleware.instance = new APICacheMiddleware();
    }
    return APICacheMiddleware.instance;
  }

  // Middleware factory
  createMiddleware(config: Partial<CacheConfig> = {}): (req: Request, res: Response, next: NextFunction) => void {
    const finalConfig = { ...this.defaultConfig, ...config };

    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Skip caching for authenticated admin requests (they need fresh data)
      if (req.url.startsWith('/api/admin') && req.headers.authorization) {
        return next();
      }

      try {
        const cacheKey = this.generateCacheKey(req, finalConfig);
        
        // Try to get from cache
        const cachedResponse = await this.cacheManager.get(cacheKey);
        
        if (cachedResponse) {
          // Set cache headers
          res.set('X-Cache', 'HIT');
          res.set('X-Cache-Key', cacheKey);
          res.set('X-Cache-TTL', finalConfig.ttl.toString());
          
          return res.json(cachedResponse);
        }

        // Cache miss - intercept response
        const originalJson = res.json;
        const originalSend = res.send;
        
        res.json = function(data: any) {
          // Store in cache if conditions are met
          if (finalConfig.shouldCache && finalConfig.shouldCache(req, res)) {
            this.cacheManager.set(cacheKey, data, { ttl: finalConfig.ttl });
          }
          
          // Set cache headers
          res.set('X-Cache', 'MISS');
          res.set('X-Cache-Key', cacheKey);
          res.set('X-Cache-TTL', finalConfig.ttl.toString());
          
          return originalJson.call(this, data);
        }.bind(this);

        res.send = function(data: any) {
          // Store in cache if conditions are met
          if (finalConfig.shouldCache && finalConfig.shouldCache(req, res)) {
            this.cacheManager.set(cacheKey, data, { ttl: finalConfig.ttl });
          }
          
          // Set cache headers
          res.set('X-Cache', 'MISS');
          res.set('X-Cache-Key', cacheKey);
          res.set('X-Cache-TTL', finalConfig.ttl.toString());
          
          return originalSend.call(this, data);
        }.bind(this);

        next();
      } catch (error) {
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  // Cache invalidation middleware
  createInvalidationMiddleware(patterns: string[]): (req: Request, res: Response, next: NextFunction) => void {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Only invalidate on successful mutations
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
        try {
          for (const pattern of patterns) {
            await this.cacheManager.invalidatePattern(pattern);
          }
          
          res.set('X-Cache-Invalidated', patterns.join(', '));
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      }
      
      next();
    };
  }

  // Manual cache operations
  async set(key: string, data: any, ttl: number = 300): Promise<void> {
    await this.cacheManager.set(key, data, { ttl });
  }

  async get<T>(key: string): Promise<T | null> {
    return await this.cacheManager.get<T>(key);
  }

  async delete(key: string): Promise<boolean> {
    return await this.cacheManager.delete(key);
  }

  async invalidatePattern(pattern: string): Promise<number> {
    return await this.cacheManager.invalidatePattern(pattern);
  }

  async clear(): Promise<void> {
    await this.cacheManager.clear();
  }

  // Cache statistics
  getStats(): CacheStats {
    const stats = this.cacheManager.getStats();
    return {
      hits: stats.hits,
      misses: stats.misses,
      sets: stats.sets,
      deletes: stats.deletes,
      hitRate: stats.hitRate,
      size: stats.size,
    };
  }

  private generateCacheKey(req: Request, config: CacheConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // Default key generation
    const baseKey = `${req.method}:${req.originalUrl}`;
    
    // Include vary headers in cache key
    const varyHeaders: Record<string, string> = {};
    if (config.varyHeaders) {
      for (const header of config.varyHeaders) {
        const value = req.headers[header.toLowerCase()];
        if (value) {
          varyHeaders[header] = Array.isArray(value) ? value.join(',') : value;
        }
      }
    }

    // Include query parameters
    const queryString = new URLSearchParams(req.query as any).toString();
    
    // Create hash of the complete key
    const keyData = {
      base: baseKey,
      query: queryString,
      headers: varyHeaders,
    };

    const hash = crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
    return `api:${hash}`;
  }
}

// Predefined cache configurations
export const CacheConfigs = {
  // Public API endpoints - cache for 5 minutes
  publicAPI: {
    ttl: 300,
    shouldCache: (req: Request, res: Response) => res.statusCode === 200,
  },

  // User-specific data - cache for 1 minute
  userData: {
    ttl: 60,
    shouldCache: (req: Request, res: Response) => res.statusCode === 200,
    varyHeaders: ['authorization'],
  },

  // Static data - cache for 1 hour
  staticData: {
    ttl: 3600,
    shouldCache: (req: Request, res: Response) => res.statusCode === 200,
  },

  // Search results - cache for 2 minutes
  searchResults: {
    ttl: 120,
    shouldCache: (req: Request, res: Response) => res.statusCode === 200,
  },

  // Admin data - no caching (always fresh)
  adminData: {
    ttl: 0,
    shouldCache: () => false,
  },
};

// Cache invalidation patterns
export const CachePatterns = {
  // Invalidate all user-related caches
  userRelated: [
    'api:*/users/*',
    'api:*/user/*',
    'api:*/auth/*',
  ],

  // Invalidate all pack-related caches
  packRelated: [
    'api:*/packs/*',
    'api:*/pack/*',
    'api:*/available-packs',
  ],

  // Invalidate all inventory-related caches
  inventoryRelated: [
    'api:*/inventory/*',
    'api:*/cards/*',
  ],

  // Invalidate all transaction-related caches
  transactionRelated: [
    'api:*/transactions/*',
    'api:*/vault/*',
  ],

  // Invalidate all admin-related caches
  adminRelated: [
    'api:*/admin/*',
  ],
};

// Cache warming utilities
export class CacheWarmer {
  private static instance: CacheWarmer;
  private apiCache: APICacheMiddleware;

  private constructor() {
    this.apiCache = APICacheMiddleware.getInstance();
  }

  static getInstance(): CacheWarmer {
    if (!CacheWarmer.instance) {
      CacheWarmer.instance = new CacheWarmer();
    }
    return CacheWarmer.instance;
  }

  async warmCache(endpoints: Array<{ url: string; data?: any }>): Promise<void> {
    console.log('🔥 Warming cache for', endpoints.length, 'endpoints...');
    
    for (const endpoint of endpoints) {
      try {
        // This would make actual HTTP requests to warm the cache
        // For now, we'll just log the endpoints
        console.log(`Warming: ${endpoint.url}`);
      } catch (error) {
        console.error(`Failed to warm cache for ${endpoint.url}:`, error);
      }
    }
    
    console.log('✅ Cache warming completed');
  }

  async warmPopularEndpoints(): Promise<void> {
    const popularEndpoints = [
      { url: '/api/available-packs' },
      { url: '/api/auth/user' },
      { url: '/api/vault' },
      { url: '/api/admin/stats' },
    ];

    await this.warmCache(popularEndpoints);
  }
}

// Cache monitoring
export class CacheMonitor {
  private static instance: CacheMonitor;
  private apiCache: APICacheMiddleware;
  private stats: Array<{ timestamp: Date; stats: CacheStats }> = [];

  private constructor() {
    this.apiCache = APICacheMiddleware.getInstance();
    this.startMonitoring();
  }

  static getInstance(): CacheMonitor {
    if (!CacheMonitor.instance) {
      CacheMonitor.instance = new CacheMonitor();
    }
    return CacheMonitor.instance;
  }

  private startMonitoring(): void {
    setInterval(() => {
      const stats = this.apiCache.getStats();
      this.stats.push({
        timestamp: new Date(),
        stats,
      });

      // Keep only last 100 stats
      if (this.stats.length > 100) {
        this.stats.shift();
      }

      // Log cache performance
      if (stats.hitRate < 50) {
        console.warn(`⚠️ Low cache hit rate: ${stats.hitRate.toFixed(2)}%`);
      }
    }, 60000); // Monitor every minute
  }

  getStatsHistory(): Array<{ timestamp: Date; stats: CacheStats }> {
    return [...this.stats];
  }

  getCurrentStats(): CacheStats {
    return this.apiCache.getStats();
  }
}
