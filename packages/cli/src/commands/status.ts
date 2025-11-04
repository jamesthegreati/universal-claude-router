import { Command } from 'commander';
import chalk from 'chalk';
import { resolve } from 'path';
import fs from 'fs/promises';
import { TokenStore, loadConfig } from '@ucr/core';
import { isServerRunning, getServerUrl } from '../utils/process.js';

export const statusCommand = new Command('status')
  .description('Show server and configuration status')
  .option('-c, --config <path>', 'Path to config file', 'ucr.config.json')
  .action(async (options) => {
    const configPath = resolve(process.cwd(), options.config);

    console.log(chalk.bold('Universal Claude Router Status\n'));

    // Check config file
    let config;
    try {
      await fs.access(configPath);
      config = await loadConfig(configPath);
      console.log(chalk.green('✓') + ' Config file: ' + chalk.cyan(configPath));
    } catch {
      console.log(chalk.red('✗') + ' Config file: ' + chalk.yellow('not found'));
      console.log(chalk.dim('  Run `ucr setup` to create a configuration file\n'));
      return;
    }

    // Check server status
    const serverRunning = await isServerRunning(config);
    if (serverRunning) {
      const serverUrl = getServerUrl(config);
      console.log(chalk.green('✓') + ' Server: ' + chalk.green('running') + chalk.dim(` at ${serverUrl}`));
    } else {
      console.log(chalk.yellow('○') + ' Server: ' + chalk.yellow('not running'));
      console.log(chalk.dim('  Run `ucr start` to start the server'));
    }

    // Show providers
    console.log('\n' + chalk.bold('Providers:'));
    if (config.providers && config.providers.length > 0) {
      const enabledProviders = config.providers.filter((p) => p.enabled !== false);
      const disabledProviders = config.providers.filter((p) => p.enabled === false);

      if (enabledProviders.length > 0) {
        for (const provider of enabledProviders) {
          const hasApiKey = !!provider.apiKey;
          const keyStatus = hasApiKey ? chalk.green('✓') : chalk.yellow('⚠');
          const priorityLabel = provider.priority ? chalk.dim(` (priority: ${provider.priority})`) : '';
          console.log(`  ${keyStatus} ${provider.name || provider.id}${priorityLabel}`);
          if (!hasApiKey) {
            console.log(chalk.dim(`    No API key configured`));
          }
        }
      }

      if (disabledProviders.length > 0) {
        console.log(chalk.dim('\n  Disabled providers:'));
        for (const provider of disabledProviders) {
          console.log(chalk.dim(`    ${provider.name || provider.id}`));
        }
      }
    } else {
      console.log(chalk.dim('  No providers configured'));
    }

    // Show authenticated providers
    console.log('\n' + chalk.bold('Authenticated Providers:'));
    try {
      const tokenStore = new TokenStore();
      await tokenStore.init();
      const providers = await tokenStore.list();

      if (providers.length > 0) {
        for (const provider of providers) {
          const credential = await tokenStore.get(provider);
          const typeLabel = credential?.type || 'unknown';
          console.log(`  ${chalk.green('✓')} ${provider} ${chalk.dim(`(${typeLabel})`)}`);
        }
      } else {
        console.log(chalk.dim('  No authenticated providers'));
        console.log(chalk.dim('  Run `ucr auth login` to authenticate'));
      }
    } catch (error) {
      console.log(chalk.dim('  Could not read authentication store'));
    }

    // Show default model
    if (config.router?.default) {
      console.log('\n' + chalk.bold('Default Router:'));
      console.log(`  Provider: ${chalk.cyan(config.router.default)}`);

      const defaultProvider = config.providers.find((p) => p.id === config.router?.default);
      if (defaultProvider?.defaultModel) {
        console.log(`  Model: ${chalk.cyan(defaultProvider.defaultModel)}`);
      }
    }

    console.log(); // Empty line at the end
  });
