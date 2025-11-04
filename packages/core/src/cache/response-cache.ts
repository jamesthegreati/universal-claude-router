import { LRUCache } from 'lru-cache';
import { createHash } from 'crypto';
import type { ClaudeCodeRequest } from '@ucr/shared';

interface CachedResponse {
  data: any;
  size: number;
  timestamp: number;
}

/**
 * Response cache for non-streaming requests
 * Caches complete responses to avoid redundant API calls
 */
export class ResponseCache {
  private cache: LRUCache<string, CachedResponse>;

  constructor() {
    this.cache = new LRUCache({
      max: 500, // Max 500 cached responses
      ttl: 5 * 60 * 1000, // 5 minutes
      sizeCalculation: (value) => value.size,
      maxSize: 50 * 1024 * 1024, // 50MB total
    });
  }

  /**
   * Generate cache key from request
   */
  private getCacheKey(request: ClaudeCodeRequest): string {
    const key = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
    };
    return createHash('sha256').update(JSON.stringify(key)).digest('hex');
  }

  /**
   * Get cached response
   */
  async get(request: ClaudeCodeRequest): Promise<any | null> {
    // Don't cache streaming requests
    if (request.stream) return null;

    const key = this.getCacheKey(request);
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  /**
   * Store response in cache
   */
  async set(request: ClaudeCodeRequest, response: any): Promise<void> {
    // Don't cache streaming requests
    if (request.stream) return;

    const key = this.getCacheKey(request);
    const size = JSON.stringify(response).length;

    this.cache.set(key, {
      data: response,
      size,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all cached responses
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize || 0,
      maxSize: 50 * 1024 * 1024,
    };
  }
}

// Global response cache instance
export const responseCache = new ResponseCache();
