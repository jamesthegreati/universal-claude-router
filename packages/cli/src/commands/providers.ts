import { Command } from 'commander';
import * as prompts from '@clack/prompts';
import chalk from 'chalk';
import { loadConfig } from '@ucr/core';
import fs from 'fs/promises';

export const providersCommand = new Command('providers').description('Manage providers');

// providers list
providersCommand
  .command('list')
  .description('List available providers')
  .option('-c, --config <path>', 'Config file path', 'ucr.config.json')
  .action(async (options) => {
    try {
      const config = await loadConfig(options.config);

      if (config.providers.length === 0) {
        console.log(chalk.yellow('No providers configured'));
        return;
      }

      console.log(chalk.bold('\nConfigured Providers:'));
      for (const provider of config.providers) {
        const status = provider.enabled !== false ? chalk.green('✓') : chalk.red('✗');
        const priority = provider.priority ? chalk.dim(` [priority: ${provider.priority}]`) : '';
        console.log(`  ${status} ${chalk.bold(provider.id)} - ${provider.name}${priority}`);
        console.log(`    ${chalk.dim(provider.baseUrl)}`);
        if (provider.defaultModel) {
          console.log(`    ${chalk.dim(`Default model: ${provider.defaultModel}`)}`);
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// providers discover
providersCommand
  .command('discover')
  .description('Auto-discover local providers')
  .option('-c, --config <path>', 'Config file path', 'ucr.config.json')
  .action(async (options) => {
    prompts.intro(chalk.bold('Provider Discovery'));

    const spinner = prompts.spinner();
    spinner.start('Scanning for local providers...');

    const discovered = await discoverProviders();
    spinner.stop(`Found ${discovered.length} provider(s)`);

    if (discovered.length === 0) {
      prompts.outro(chalk.yellow('No local providers found'));
      return;
    }

    console.log(chalk.bold('\nDiscovered providers:'));
    for (const provider of discovered) {
      console.log(`  ${chalk.green('✓')} ${provider.name} at ${chalk.dim(provider.baseUrl)}`);
    }

    const shouldAdd = await prompts.confirm({
      message: 'Add discovered providers to config?',
      initialValue: true,
    });

    if (prompts.isCancel(shouldAdd) || !shouldAdd) {
      prompts.cancel('Discovery cancelled');
      return;
    }

    // Load config and add providers
    try {
      const configPath = options.config;
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // Add discovered providers
      for (const provider of discovered) {
        const exists = config.providers.some((p: any) => p.id === provider.id);
        if (!exists) {
          config.providers.push(provider);
        }
      }

      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      prompts.outro(chalk.green('✓ Providers added to config'));
    } catch (error) {
      prompts.outro(chalk.red(`✗ Failed to update config: ${error}`));
      process.exit(1);
    }
  });

// providers enable
providersCommand
  .command('enable <id>')
  .description('Enable a provider')
  .option('-c, --config <path>', 'Config file path', 'ucr.config.json')
  .action(async (id: string, options) => {
    try {
      await updateProviderStatus(id, true, options.config);
      console.log(chalk.green(`✓ Enabled provider: ${id}`));
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// providers disable
providersCommand
  .command('disable <id>')
  .description('Disable a provider')
  .option('-c, --config <path>', 'Config file path', 'ucr.config.json')
  .action(async (id: string, options) => {
    try {
      await updateProviderStatus(id, false, options.config);
      console.log(chalk.green(`✓ Disabled provider: ${id}`));
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// providers test
providersCommand
  .command('test <id>')
  .description('Test provider connection')
  .option('-c, --config <path>', 'Config file path', 'ucr.config.json')
  .action(async (id: string, options) => {
    prompts.intro(chalk.bold(`Testing provider: ${id}`));

    try {
      const config = await loadConfig(options.config);
      const provider = config.providers.find((p: any) => p.id === id);

      if (!provider) {
        prompts.outro(chalk.red(`Provider ${id} not found`));
        process.exit(1);
      }

      const spinner = prompts.spinner();
      spinner.start('Testing connection...');

      // Simple health check
      const startTime = Date.now();
      try {
        const response = await fetch(provider.baseUrl, { method: 'HEAD' });
        const latency = Date.now() - startTime;
        spinner.stop('Connection test complete');

        if (response.ok || response.status === 404 || response.status === 405) {
          console.log(`  ${chalk.green('✓')} Provider is reachable`);
          console.log(`  ${chalk.dim(`Latency: ${latency}ms`)}`);
          prompts.outro(chalk.green('✓ Test passed'));
        } else {
          console.log(`  ${chalk.red('✗')} Provider returned status: ${response.status}`);
          prompts.outro(chalk.red('✗ Test failed'));
        }
      } catch (error) {
        spinner.stop('Connection test failed');
        prompts.outro(chalk.red(`✗ Connection failed: ${error}`));
        process.exit(1);
      }
    } catch (error) {
      prompts.outro(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

async function discoverProviders(): Promise<any[]> {
  const discovered: any[] = [];

  // Check for Ollama
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      discovered.push({
        id: 'ollama',
        name: 'Ollama',
        baseUrl: 'http://localhost:11434',
        enabled: true,
        defaultModel: 'llama2',
      });
    }
  } catch {
    // Ollama not running
  }

  // Check for LM Studio
  try {
    const response = await fetch('http://localhost:1234/v1/models', {
      signal: AbortSignal.timeout(2000),
    });
    if (response.ok) {
      discovered.push({
        id: 'lmstudio',
        name: 'LM Studio',
        baseUrl: 'http://localhost:1234',
        enabled: true,
      });
    }
  } catch {
    // LM Studio not running
  }

  return discovered;
}

async function updateProviderStatus(
  id: string,
  enabled: boolean,
  configPath: string,
): Promise<void> {
  const configContent = await fs.readFile(configPath, 'utf-8');
  const config = JSON.parse(configContent);

  const provider = config.providers.find((p: any) => p.id === id);
  if (!provider) {
    throw new Error(`Provider ${id} not found`);
  }

  provider.enabled = enabled;
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
