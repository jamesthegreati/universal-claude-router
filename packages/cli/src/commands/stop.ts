import { Command } from 'commander';
import chalk from 'chalk';
import { resolve } from 'path';
import fs from 'fs/promises';
import { loadConfig } from '@ucr/core';
import {
  isServerRunning,
  getServerUrl,
  stopServerByPidFile,
  ensurePidDir,
} from '../utils/process.js';

export const stopCommand = new Command('stop')
  .description('Stop the Universal Claude Router server')
  .option('-c, --config <path>', 'Path to config file', 'ucr.config.json')
  .action(async (options) => {
    const configPath = resolve(process.cwd(), options.config);

    // First, try graceful stop via PID file without requiring config
    try {
      await ensurePidDir();
      const stopped = await stopServerByPidFile();
      if (stopped) {
        console.log(chalk.green('✓ UCR server stopped'));
        process.exit(0);
      }
    } catch {
      // continue to check running via health endpoint
    }

    // Load config if available to provide better messaging and health check
    let config: any = null;
    try {
      await fs.access(configPath);
      config = await loadConfig(configPath);
    } catch {
      console.log(chalk.yellow('⚠ No PID file found and configuration file is missing.'));
      console.log(chalk.dim('The server is likely not running.'));
      process.exit(0);
    }

    const running = await isServerRunning(config);
    if (!running) {
      console.log(chalk.yellow('⚠ UCR server is not running'));
      const serverUrl = getServerUrl(config);
      console.log(chalk.dim(`Would run on: ${serverUrl}`));
      process.exit(0);
    }

    console.log(chalk.yellow('⚠ Server appears to be running but PID file was not found.'));
    console.log(
      chalk.dim(
        'You may need to stop it manually (e.g., kill the process listening on the configured port).',
      ),
    );
    process.exit(1);
  });
