import { watch } from 'chokidar';
import { EventEmitter } from 'events';
import type { UCRConfig } from '@ucr/shared';
import { validateConfig } from '@ucr/shared';
import { loadConfigFromFile, mergeConfigs, getDefaultConfig } from './loader.js';

/**
 * Configuration manager with hot-reload support
 */
export class ConfigManager extends EventEmitter {
  private config: UCRConfig | null = null;
  private configPath: string | null = null;
  private watcher: any = null;
  private reloadDebounce: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Load configuration from file
   */
  async load(configPath: string): Promise<UCRConfig> {
    try {
      this.configPath = configPath;

      // Load config
      const fileConfig = await loadConfigFromFile(configPath);
      const defaultConfig = getDefaultConfig();
      this.config = mergeConfigs(defaultConfig, fileConfig);

      // Validate
      validateConfig(this.config);

      this.emit('loaded', this.config);
      return this.config;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): UCRConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config;
  }

  /**
   * Update configuration
   */
  async update(updates: Partial<UCRConfig>): Promise<UCRConfig> {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    this.config = mergeConfigs(this.config, updates);
    validateConfig(this.config);

    this.emit('updated', this.config);
    return this.config;
  }

  /**
   * Enable hot-reload (watch config file for changes)
   */
  enableHotReload(): void {
    if (!this.configPath) {
      throw new Error('No config path set');
    }

    if (this.watcher) {
      return; // Already watching
    }

    this.watcher = watch(this.configPath, {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('change', () => {
      // Debounce reloads
      if (this.reloadDebounce) {
        clearTimeout(this.reloadDebounce);
      }

      this.reloadDebounce = setTimeout(async () => {
        try {
          if (this.configPath) {
            await this.load(this.configPath);
            this.emit('reloaded', this.config);
          }
        } catch (error) {
          this.emit('reload-error', error);
        }
      }, 500);
    });

    this.emit('hot-reload-enabled');
  }

  /**
   * Disable hot-reload
   */
  disableHotReload(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.reloadDebounce) {
      clearTimeout(this.reloadDebounce);
      this.reloadDebounce = null;
    }

    this.emit('hot-reload-disabled');
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string) {
    const config = this.getConfig();
    return config.providers.find((p) => p.id === id);
  }

  /**
   * Get all enabled providers
   */
  getEnabledProviders() {
    const config = this.getConfig();
    return config.providers.filter((p) => p.enabled !== false);
  }

  /**
   * Get router configuration
   */
  getRouter() {
    const config = this.getConfig();
    return config.router || {};
  }

  /**
   * Get server configuration
   */
  getServer() {
    const config = this.getConfig();
    return config.server || {};
  }

  /**
   * Get logging configuration
   */
  getLogging() {
    const config = this.getConfig();
    return config.logging || {};
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disableHotReload();
    this.removeAllListeners();
    this.config = null;
    this.configPath = null;
  }
}

// Singleton instance
let instance: ConfigManager | null = null;

/**
 * Get singleton ConfigManager instance
 */
export function getConfigManager(): ConfigManager {
  if (!instance) {
    instance = new ConfigManager();
  }
  return instance;
}
