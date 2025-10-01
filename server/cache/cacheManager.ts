import { EventEmitter } from 'events';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum number of items
  refreshThreshold?: number; // Refresh when TTL is below this threshold
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
}

export class CacheManager extends EventEmitter {
  private static instance: CacheManager;
  private cache: Map<string, { value: any; expires: number; accessCount: number }> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    size: 0,
    memoryUsage: 0,
  };
  private defaultTTL: number = 3600; // 1 hour
  private maxSize: number = 10000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.startCleanup();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    item.accessCount++;
    this.stats.hits++;
    this.updateHitRate();
    
    this.emit('cacheHit', { key, value: item.value });
    return item.value;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.defaultTTL;
    const expires = Date.now() + (ttl * 1000);

    // Check if we need to evict items
    if (this.cache.size >= this.maxSize) {
      await this.evictLeastUsed();
    }

    this.cache.set(key, {
      value,
      expires,
      accessCount: 0,
    });

    this.stats.sets++;
    this.updateStats();
    
    this.emit('cacheSet', { key, value, ttl });
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.updateStats();
      this.emit('cacheDelete', { key });
    }
    return deleted;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: 0,
    };
    this.emit('cacheClear');
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern);
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        await this.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private async evictLeastUsed(): Promise<void> {
    let leastUsedKey = '';
    let leastAccessCount = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.accessCount < leastAccessCount) {
        leastAccessCount = item.accessCount;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      await this.delete(leastUsedKey);
    }
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.updateStats();
      this.emit('cacheCleanup', { cleanedCount });
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.estimateMemoryUsage();
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const [key, item] of this.cache.entries()) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(item.value).length * 2;
      totalSize += 24; // Object overhead
    }
    return totalSize;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}
