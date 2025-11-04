import { watch, type FSWatcher } from 'chokidar';
import { getLogger } from '../utils/logger.js';

/**
 * Optimized hot reload with debouncing
 * Reduces unnecessary reloads during rapid file changes
 */
export class OptimizedHotReload {
  private watcher: FSWatcher | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceDelay = 1000; // 1 second
  private enabled = false;

  /**
   * Enable hot reload for a file path
   */
  enable(configPath: string, callback: () => void): void {
    if (this.enabled) {
      this.disable();
    }

    this.enabled = true;

    this.watcher = watch(configPath, {
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('change', () => {
      getLogger().debug({
        type: 'config_change_detected',
        path: configPath,
      });

      // Debounce rapid changes
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        getLogger().info({
          type: 'config_reloading',
          path: configPath,
        });

        try {
          callback();
          getLogger().info({
            type: 'config_reloaded',
            path: configPath,
          });
        } catch (error) {
          getLogger().error({
            type: 'config_reload_error',
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }, this.debounceDelay);
    });

    getLogger().info({
      type: 'hot_reload_enabled',
      path: configPath,
      debounceDelay: this.debounceDelay,
    });
  }

  /**
   * Disable hot reload
   */
  disable(): void {
    if (!this.enabled) return;

    this.enabled = false;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    getLogger().info({ type: 'hot_reload_disabled' });
  }

  /**
   * Check if hot reload is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Global hot reload instance
export const hotReload = new OptimizedHotReload();
