import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';

/**
 * Metadata cache for expensive operations
 * Caches token counts, model info, and routing decisions
 */
export class MetadataCache {
  private tokenCountCache: LRUCache<string, number>;

  constructor() {
    // Cache token counts (expensive operation)
    this.tokenCountCache = new LRUCache({
      max: 1000,
      ttl: 10 * 60 * 1000, // 10 minutes
    });
  }

  /**
   * Get cached token count or calculate and cache it
   */
  getTokenCount(text: string): number {
    const key = createHash('md5').update(text).digest('hex');
    let count = this.tokenCountCache.get(key);

    if (count === undefined) {
      count = this.calculateTokens(text);
      this.tokenCountCache.set(key, count);
    }

    return count;
  }

  /**
   * Fast token approximation (4 chars ≈ 1 token)
   * This is much faster than exact tokenization
   */
  private calculateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Clear token count cache
   */
  clear(): void {
    this.tokenCountCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      tokenCountCacheSize: this.tokenCountCache.size,
    };
  }
}

// Global metadata cache instance
export const metadataCache = new MetadataCache();
