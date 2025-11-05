import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  l1Size: number;
  l2Size: number;
}

/**
 * Multi-layer cache for maximum performance
 * L1: Hot cache for frequently accessed data (small, fast)
 * L2: Warm cache for less frequent data (larger, longer TTL)
 */
export class MultiLayerCache {
  private l1Cache: LRUCache<string, any>;
  private l2Cache: LRUCache<string, any>;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor() {
    // L1: Very fast, small, hot data
    this.l1Cache = new LRUCache({
      max: 100, // 100 entries
      ttl: 60 * 1000, // 1 minute
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });

    // L2: Larger, longer TTL
    this.l2Cache = new LRUCache({
      max: 1000, // 1000 entries
      ttl: 5 * 60 * 1000, // 5 minutes
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });
  }

  async get(key: string): Promise<any | null> {
    // Try L1 first
    let value = this.l1Cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }

    // Try L2
    value = this.l2Cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      // Promote to L1
      this.l1Cache.set(key, value);
      return value;
    }

    this.stats.misses++;
    return null;
  }

  async set(key: string, value: any, hot = false): Promise<void> {
    if (hot) {
      this.l1Cache.set(key, value);
    } else {
      this.l2Cache.set(key, value);
    }
  }

  clear(layer?: 'l1' | 'l2'): void {
    if (layer === 'l1') {
      this.l1Cache.clear();
    } else if (layer === 'l2') {
      this.l2Cache.clear();
    } else {
      this.l1Cache.clear();
      this.l2Cache.clear();
    }
  }

  async clearAll(): Promise<void> {
    this.l1Cache.clear();
    this.l2Cache.clear();
  }

  getStats(): CacheStats {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      l1Size: this.l1Cache.size,
      l2Size: this.l2Cache.size,
    };
  }
}

// Global cache instance
export const cacheManager = new MultiLayerCache();

/**
 * Generate cache key from any object
 * Uses MD5 for better performance (cache keys don't need cryptographic security)
 */
export function generateCacheKey(obj: any): string {
  return createHash('md5').update(JSON.stringify(obj)).digest('hex');
}
