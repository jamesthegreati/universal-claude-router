import { Command } from 'commander';
import * as prompts from '@clack/prompts';
import chalk from 'chalk';
import { resolve } from 'path';
import fs from 'fs/promises';
import { loadConfig } from '@ucr/core';
import type { UCRConfig, Provider } from '@ucr/shared';

interface ModelOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Get all available models from all providers
 */
function getAllModels(config: UCRConfig): ModelOption[] {
  const models: ModelOption[] = [];

  for (const provider of config.providers) {
    if (provider.enabled === false) continue;

    const providerModels = provider.models || (provider.defaultModel ? [provider.defaultModel] : []);

    for (const model of providerModels) {
      models.push({
        value: `${provider.id},${model}`,
        label: `${provider.name || provider.id} - ${model}`,
        hint: provider.id === config.router?.default ? '(current default provider)' : undefined,
      });
    }
  }

  return models;
}

/**
 * Save selected model to config
 */
async function saveModelChoice(
  configPath: string,
  providerId: string,
  modelName: string,
  taskType: string = 'default',
): Promise<void> {
  const config = await loadConfig(configPath);

  // Ensure router config exists
  if (!config.router) {
    config.router = {};
  }

  // Update router config based on task type
  if (taskType === 'default') {
    config.router.default = providerId;
  } else if (taskType === 'think') {
    config.router.think = providerId;
  } else if (taskType === 'background') {
    config.router.background = providerId;
  } else if (taskType === 'longContext') {
    config.router.longContext = providerId;
  }

  // Update provider's default model
  const provider = config.providers.find((p) => p.id === providerId);
  if (provider) {
    provider.defaultModel = modelName;
  }

  // Save config
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export const modelSelectorCommand = new Command('model')
  .description('Interactive model selector')
  .option('-c, --config <path>', 'Path to config file', 'ucr.config.json')
  .option('-t, --type <type>', 'Model type (default, think, background, longContext)', 'default')
  .action(async (options) => {
    const configPath = resolve(process.cwd(), options.config);

    // Load config
    let config: UCRConfig;
    try {
      config = await loadConfig(configPath);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ Failed to load config: ${errorMessage}`));
      console.log(chalk.dim('\nRun `ucr setup` to create a configuration file.'));
      process.exit(1);
    }

    prompts.intro(chalk.bold('UCR Model Selector'));

    // Show current default model
    if (config.router?.default) {
      const defaultProvider = config.providers.find((p) => p.id === config.router?.default);
      if (defaultProvider) {
        const currentModel = defaultProvider.defaultModel || 'not set';
        console.log(
          chalk.dim(`\nCurrent ${options.type} model: `) +
            chalk.cyan(`${defaultProvider.name || defaultProvider.id} - ${currentModel}`),
        );
      }
    } else {
      console.log(chalk.dim('\nNo default model configured'));
    }

    // Get all available models
    const models = getAllModels(config);

    if (models.length === 0) {
      prompts.outro(chalk.yellow('⚠ No models available. Please configure providers first.'));
      process.exit(0);
    }

    // Select model
    const selected = (await prompts.select({
      message: `Select ${options.type} model:`,
      options: models,
    })) as string;

    if (prompts.isCancel(selected)) {
      prompts.cancel('Model selection cancelled');
      process.exit(0);
    }

    // Parse selection
    const [providerId, modelName] = selected.split(',');

    // Save choice
    try {
      await saveModelChoice(configPath, providerId, modelName, options.type);

      const provider = config.providers.find((p) => p.id === providerId);
      const providerName = provider?.name || providerId;

      prompts.outro(
        chalk.green(`✓ ${options.type} model set to: ${chalk.cyan(`${providerName} - ${modelName}`)}`),
      );
    } catch (error) {
      prompts.outro(chalk.red(`✗ Failed to save model choice: ${error}`));
      process.exit(1);
    }
  });
