import type { UCRConfig } from '@ucr/shared';
import { getLogger } from '../utils/logger.js';

/**
 * Lazy config manager
 * Loads configuration on-demand and pre-compiles routing rules
 */
export class LazyConfigManager {
  private config: UCRConfig | null = null;
  private configPromise: Promise<UCRConfig> | null = null;

  /**
   * Get configuration (load on first access)
   */
  async getConfig(): Promise<UCRConfig> {
    if (this.config) {
      return this.config;
    }

    if (!this.configPromise) {
      this.configPromise = this.loadConfig();
    }

    this.config = await this.configPromise;
    return this.config;
  }

  /**
   * Load and optimize configuration
   */
  private async loadConfig(): Promise<UCRConfig> {
    // In a real implementation, this would load from file
    // For now, we just optimize the config that's passed in
    throw new Error('Config must be provided via setConfig');
  }

  /**
   * Set configuration directly
   */
  setConfig(config: UCRConfig): void {
    this.config = this.optimizeConfig(config);
    this.configPromise = Promise.resolve(this.config);
  }

  /**
   * Optimize configuration for performance
   */
  private optimizeConfig(config: UCRConfig): UCRConfig {
    const logger = getLogger();

    // Filter enabled providers
    config.providers = config.providers.filter((p) => p.enabled !== false);

    // Sort providers by priority for faster selection
    config.providers.sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA;
    });

    logger.info({
      type: 'config_optimized',
      providers: config.providers.length,
    });

    return config;
  }

  /**
   * Update configuration
   */
  updateConfig(config: UCRConfig): void {
    this.setConfig(config);
  }

  /**
   * Clear cached configuration
   */
  clear(): void {
    this.config = null;
    this.configPromise = null;
  }
}

// Global config manager instance
export const lazyConfigManager = new LazyConfigManager();
