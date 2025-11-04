import type { UCRConfig } from '@ucr/shared';
import { getLogger } from './logger.js';
import { memoryMonitor } from './memory-monitor.js';
import { getLazyTransformerRegistry } from '../transformer/lazy-registry.js';

/**
 * Startup optimizer
 * Optimizes server startup time by deferring non-critical initialization
 */
export class StartupOptimizer {
  /**
   * Perform optimized startup
   */
  async optimizedStartup(config: UCRConfig): Promise<void> {
    const logger = getLogger();
    const startTime = Date.now();

    logger.info({ type: 'startup_optimization_begin' });

    // Phase 1: Critical initialization (synchronous)
    await this.criticalInit(config);

    // Phase 2: Defer non-critical initialization (async)
    this.deferNonCriticalInit(config);

    const duration = Date.now() - startTime;
    logger.info({
      type: 'startup_optimization_complete',
      duration,
    });
  }

  /**
   * Critical initialization that must complete before server starts
   */
  private async criticalInit(config: UCRConfig): Promise<void> {
    const logger = getLogger();

    // Validate critical configuration
    if (!config.providers || config.providers.length === 0) {
      throw new Error('No providers configured');
    }

    logger.debug({
      type: 'critical_init_complete',
      providers: config.providers.length,
    });
  }

  /**
   * Non-critical initialization deferred to after server starts
   */
  private deferNonCriticalInit(config: UCRConfig): void {
    setImmediate(async () => {
      const logger = getLogger();

      try {
        // Start memory monitoring
        memoryMonitor.start();

        // Preload commonly used transformers
        const commonProviders = this.getCommonProviders(config);
        if (commonProviders.length > 0) {
          const registry = getLazyTransformerRegistry();
          await registry.preload(commonProviders);
          logger.info({
            type: 'transformers_preloaded',
            providers: commonProviders,
          });
        }

        // Warm up caches (optional)
        await this.warmupCaches();

        logger.info({ type: 'non_critical_init_complete' });
      } catch (error) {
        logger.warn({
          type: 'non_critical_init_error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * Get list of commonly used providers to preload
   */
  private getCommonProviders(config: UCRConfig): string[] {
    const providers: string[] = [];

    // Add default provider if configured
    if (config.router?.default) {
      providers.push(config.router.default);
    }

    // Add high-priority providers
    const highPriority = config.providers
      .filter((p) => p.enabled !== false && (p.priority ?? 0) > 5)
      .map((p) => p.id);

    providers.push(...highPriority);

    // Return unique list
    return Array.from(new Set(providers));
  }

  /**
   * Warm up caches (optional)
   */
  private async warmupCaches(): Promise<void> {
    // Placeholder for cache warmup logic
    // Could include pre-loading common data, etc.
  }
}

// Global startup optimizer instance
export const startupOptimizer = new StartupOptimizer();
