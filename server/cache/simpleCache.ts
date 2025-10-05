/**
 * Simple In-Memory Cache Service
 * Provides basic caching functionality for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

export class SimpleCache {
  private static instance: SimpleCache;
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0
  };

  private constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  public static getInstance(): SimpleCache {
    if (!SimpleCache.instance) {
      SimpleCache.instance = new SimpleCache();
    }
    return SimpleCache.instance;
  }

  /**
   * Get data from cache
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size--;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set data in cache
   */
  public set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    };

    const existed = this.cache.has(key);
    this.cache.set(key, entry);
    this.stats.sets++;
    
    if (!existed) {
      this.stats.size++;
    }
  }

  /**
   * Delete data from cache
   */
  public delete(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.stats.deletes++;
      this.stats.size--;
    }
    return existed;
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    this.stats.size -= cleaned;
    
    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Get cache size
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists in cache
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.size--;
      return false;
    }
    
    return true;
  }
}

// Cache key generators
export const CacheKeys = {
  // Pack data
  pack: (packId: string) => `pack:${packId}`,
  packCards: (packId: string) => `pack:cards:${packId}`,
  
  // Inventory data
  inventoryAll: () => 'inventory:all',
  inventoryByTier: (tier: string) => `inventory:tier:${tier}`,
  inventoryCard: (cardId: string) => `inventory:card:${cardId}`,
  
  // User data
  user: (userId: string) => `user:${userId}`,
  userCards: (userId: string) => `user:cards:${userId}`,
  userPacks: (userId: string) => `user:packs:${userId}`,
  
  // Global feed
  globalFeed: (limit?: number, minTier?: string) => 
    `global:feed:${limit || 10}:${minTier || 'all'}`,
  
  // Mystery packs
  mysteryPack: () => 'mystery:packs:all',
  mysteryPackCards: (packId: string) => `mystery:pack:cards:${packId}`,
  
  // Classic packs
  classicPack: () => 'classic:packs:all',
  classicPackCards: (packId: string) => `classic:pack:cards:${packId}`,
  
  // Special packs
  specialPack: () => 'special:packs:all',
  specialPackCards: (packId: string) => `special:pack:cards:${packId}`,
};

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  SHORT: 2 * 60 * 1000,      // 2 minutes
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 15 * 60 * 1000,      // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const;

// Cache decorator for methods
export function cached(ttl: number = CacheTTL.MEDIUM, keyGenerator?: (...args: any[]) => string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = SimpleCache.getInstance();

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator ? keyGenerator(...args) : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      // Try to get from cache first
      const cached = cache.get(key);
      if (cached !== null) {
        console.log(`🎯 Cache HIT: ${key}`);
        return cached;
      }

      // Execute method and cache result
      console.log(`💾 Cache MISS: ${key}`);
      const result = await method.apply(this, args);
      cache.set(key, result, ttl);
      
      return result;
    };

    return descriptor;
  };
}
