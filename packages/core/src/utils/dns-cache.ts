import { lookup } from 'dns/promises';
import { LRUCache } from 'lru-cache';

/**
 * DNS cache to reduce DNS lookup overhead
 */
export class DNSCache {
  private cache: LRUCache<string, string>;

  constructor() {
    this.cache = new LRUCache({
      max: 500,
      ttl: 5 * 60 * 1000, // 5 minutes
    });
  }

  /**
   * Resolve hostname to IP address with caching
   */
  async resolve(hostname: string): Promise<string> {
    let ip = this.cache.get(hostname);

    if (!ip) {
      try {
        const result = await lookup(hostname);
        ip = result.address;
        this.cache.set(hostname, ip);
      } catch (error) {
        // If DNS lookup fails, return hostname as-is
        return hostname;
      }
    }

    return ip;
  }

  /**
   * Clear DNS cache
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
    };
  }
}

// Global DNS cache instance
export const dnsCache = new DNSCache();
