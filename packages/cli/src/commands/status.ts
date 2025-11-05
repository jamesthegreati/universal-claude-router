import { Command } from 'commander';
import chalk from 'chalk';
import { resolve } from 'path';
import fs from 'fs/promises';
import { loadConfig } from '@ucr/core';
import { isServerRunning, getServerUrl } from '../utils/process.js';

export const statusCommand = new Command('status')
  .description('Show UCR server status and configuration')
  .option('-c, --config <path>', 'Path to config file', 'ucr.config.json')
  .action(async (options) => {
    const configPath = resolve(process.cwd(), options.config);

    // Check if config exists
    let config;
    try {
      await fs.access(configPath);
      config = await loadConfig(configPath);
    } catch {
      console.log(chalk.red('❌ Configuration file not found'));
      console.log(chalk.dim(`Looking for: ${configPath}`));
      console.log(chalk.dim('\nRun `ucr setup` to create a configuration file.'));
      process.exit(1);
    }

    console.log(chalk.bold.cyan('\n📊 UCR Status\n'));

    // Server status
    const running = await isServerRunning(config);
    const serverUrl = getServerUrl(config);

    console.log(chalk.bold('Server:'));
    if (running) {
      console.log(chalk.green('  ✓ Running'));
      console.log(chalk.dim(`  URL: ${serverUrl}`));
    } else {
      console.log(chalk.yellow('  ⚠ Not running'));
      console.log(chalk.dim(`  Would run on: ${serverUrl}`));
    }

    // Configuration
    console.log(chalk.bold('\nConfiguration:'));
    console.log(chalk.dim(`  File: ${configPath}`));
    console.log(
      `  Providers: ${config.providers.filter((p: any) => p.enabled !== false).length}/${config.providers.length} enabled`,
    );

    // List enabled providers
    console.log(chalk.bold('\nEnabled Providers:'));
    for (const provider of config.providers) {
      if (provider.enabled === false) continue;

      const isDefault = config.router?.default === provider.id;
      const marker = isDefault ? chalk.green('*') : ' ';
      console.log(
        `  ${marker} ${provider.name} (${provider.id}) - ${provider.defaultModel || 'no default model'}`,
      );
    }

    // Router configuration
    if (config.router) {
      console.log(chalk.bold('\nRouter Configuration:'));
      console.log(`  Default: ${config.router.default || 'not set'}`);
      if (config.router.think) console.log(`  Think: ${config.router.think}`);
      if (config.router.background) console.log(`  Background: ${config.router.background}`);
      if (config.router.longContext) console.log(`  Long Context: ${config.router.longContext}`);
      if (config.router.webSearch) console.log(`  Web Search: ${config.router.webSearch}`);
      if (config.router.image) console.log(`  Image: ${config.router.image}`);
    }

    // Features
    if (config.features) {
      console.log(chalk.bold('\nFeatures:'));
      console.log(
        `  Cost Tracking: ${config.features.costTracking ? chalk.green('✓') : chalk.red('✗')}`,
      );
      console.log(
        `  Analytics: ${config.features.analytics ? chalk.green('✓') : chalk.red('✗')}`,
      );
      console.log(
        `  Health Checks: ${config.features.healthChecks ? chalk.green('✓') : chalk.red('✗')}`,
      );
    }

    // Next steps
    console.log(chalk.bold('\nCommands:'));
    if (!running) {
      console.log(chalk.dim('  ucr start  - Start the server'));
    } else {
      console.log(chalk.dim('  ucr code   - Launch Claude Code with UCR'));
      console.log(chalk.dim('  ucr stop   - Stop the server'));
    }
    console.log(chalk.dim('  ucr model  - Select default model'));
    console.log('');
  });
