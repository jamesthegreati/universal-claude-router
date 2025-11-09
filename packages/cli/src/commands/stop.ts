import { Command } from 'commander';
import chalk from 'chalk';
import { resolve } from 'path';
import fs from 'fs/promises';
import { loadConfig } from '@ucr/core';
import { isServerRunning, getServerUrl, stopServerByPidFile, ensurePidDir } from '../utils/process.js';

export const stopCommand = new Command('stop')
  .description('Stop the Universal Claude Router server')
  .option('-c, --config <path>', 'Path to config file', 'ucr.config.json')
  .action(async (options) => {
    const configPath = resolve(process.cwd(), options.config);

    // Check if config exists
    let config: any;
    try {
      await fs.access(configPath);
      config = await loadConfig(configPath);
    } catch {
      console.log(chalk.red('❌ Configuration file not found'));
      console.log(chalk.dim(`Looking for: ${configPath}`));
      process.exit(1);
    }

    // First, try graceful stop via PID file
    try {
      await ensurePidDir();
      const stopped = await stopServerByPidFile();
      if (stopped) {
        console.log(chalk.green('✓ UCR server stopped'));
        return;
      }
    } catch (err) {
      // continue to check running
    }

    const running = await isServerRunning(config);
    if (!running) {
      console.log(chalk.yellow('⚠ UCR server is not running'));
      const serverUrl = getServerUrl(config);
      console.log(chalk.dim(`Would run on: ${serverUrl}`));
      return;
    }

    console.log(chalk.yellow('⚠ Server appears to be running but PID file was not found.'));
    console.log(chalk.dim('You may need to stop it manually (e.g., kill the process listening on the configured port).'));
    process.exit(1);
  });
