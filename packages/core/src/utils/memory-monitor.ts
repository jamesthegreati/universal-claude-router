import { cacheManager } from '../cache/cache-manager.js';
import { responseCache } from '../cache/response-cache.js';
import { metadataCache } from '../cache/metadata-cache.js';
import { getLogger } from './logger.js';

/**
 * Memory pressure monitor
 * Monitors memory usage and clears caches when threshold is reached
 */
export class MemoryMonitor {
  private threshold = 0.8; // 80% of heap limit
  private checkInterval = 10000; // 10 seconds
  private timer: NodeJS.Timeout | null = null;
  private enabled = false;

  /**
   * Start monitoring memory
   */
  start(): void {
    if (this.enabled) return;

    this.enabled = true;
    this.timer = setInterval(() => {
      this.checkMemory();
    }, this.checkInterval);

    getLogger().info({
      type: 'memory_monitor_started',
      threshold: this.threshold,
      checkInterval: this.checkInterval,
    });
  }

  /**
   * Stop monitoring memory
   */
  stop(): void {
    if (!this.enabled) return;

    this.enabled = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    getLogger().info({ type: 'memory_monitor_stopped' });
  }

  /**
   * Check memory usage and take action if needed
   */
  private checkMemory(): void {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    const heapTotal = usage.heapTotal;
    const percentage = heapUsed / heapTotal;

    if (percentage > this.threshold) {
      getLogger().warn({
        type: 'memory_pressure',
        heapUsed: Math.round(heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(heapTotal / 1024 / 1024) + ' MB',
        percentage: Math.round(percentage * 100) + '%',
      });

      this.clearCaches();
      this.triggerGC();
    }
  }

  /**
   * Clear caches to free memory
   */
  private clearCaches(): void {
    // Clear L2 cache first (less critical)
    cacheManager.clear('l2');
    responseCache.clear();
    metadataCache.clear();

    getLogger().info({
      type: 'caches_cleared',
      reason: 'memory_pressure',
    });
  }

  /**
   * Trigger garbage collection if available
   * Note: Only triggers once as multiple GC calls provide no additional benefit
   */
  private triggerGC(): void {
    if (global.gc) {
      global.gc();
      getLogger().info({ type: 'gc_triggered' });
    }
  }

  /**
   * Get current memory stats
   */
  getStats() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100),
    };
  }
}

// Global memory monitor instance
export const memoryMonitor = new MemoryMonitor();
