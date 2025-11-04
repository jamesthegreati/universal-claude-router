/**
 * Performance utilities and optimizations
 */

/**
 * Request coalescer to deduplicate identical in-flight requests
 */
export class RequestCoalescer {
  private pending = new Map<string, Promise<any>>();

  async coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if same request is already in flight
    let promise = this.pending.get(key);

    if (!promise) {
      promise = fn().finally(() => {
        this.pending.delete(key);
      });
      this.pending.set(key, promise);
    }

    return promise as Promise<T>;
  }

  /**
   * Get number of pending requests
   */
  get pendingCount(): number {
    return this.pending.size;
  }
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Event loop optimizer
 */
export class EventLoopOptimizer {
  /**
   * Defer non-critical work to next tick
   */
  static defer(fn: () => void): void {
    setImmediate(fn);
  }

  /**
   * Process items in chunks to avoid blocking event loop
   */
  static async processInChunks<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    chunkSize = 10,
  ): Promise<void> {
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      await Promise.all(chunk.map(processor));

      // Give event loop a chance to breathe
      if (i + chunkSize < items.length) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    }
  }
}

/**
 * Fast string utilities
 */
export class StringOptimizer {
  private internedStrings = new Map<string, string>();

  /**
   * String interning for repeated strings
   */
  intern(str: string): string {
    let interned = this.internedStrings.get(str);
    if (!interned) {
      interned = str;
      this.internedStrings.set(str, str);
    }
    return interned;
  }

  /**
   * Fast string concatenation
   */
  concat(parts: string[]): string {
    return parts.join('');
  }

  /**
   * Clear interned strings cache
   */
  clear(): void {
    this.internedStrings.clear();
  }
}

// Global instances
export const requestCoalescer = new RequestCoalescer();
export const stringOptimizer = new StringOptimizer();
