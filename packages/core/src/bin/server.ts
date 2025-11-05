#!/usr/bin/env node

import { resolve } from 'path';
import { startProxyServer } from '../proxy/server.js';
import { getConfigManager } from '../config/config.js';
import { getLogger, initLogger } from '../utils/logger.js';

async function main() {
  // Get config path from args or use default
  const configPath = process.argv[2] || resolve(process.cwd(), 'ucr.config.json');

  try {
    // Initialize logger
    initLogger({ level: 'info', pretty: true });
    const logger = getLogger();

    logger.info({ type: 'startup', message: 'Starting Universal Claude Router...' });

    // Load configuration
    const configManager = getConfigManager();
    const config = await configManager.load(configPath);

    logger.info({
      type: 'config_loaded',
      configPath,
      providers: config.providers.length,
    });

    // Enable hot-reload
    configManager.enableHotReload();
    logger.info({ type: 'hot_reload_enabled' });

    // Start server
    const app = await startProxyServer(config);

    // Handle graceful shutdown
    const shutdown = async () => {
      logger.info({ type: 'shutdown', message: 'Shutting down...' });
      configManager.disableHotReload();
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    // Handle config reloads
    configManager.on('reloaded', (newConfig) => {
      logger.info({ type: 'config_reloaded', message: 'Configuration reloaded' });
      // Note: Routes will need to be updated with new config
      // For now, we just log it
    });

    configManager.on('reload-error', (error) => {
      logger.error({
        type: 'config_reload_error',
        error: error instanceof Error ? error.message : String(error),
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
