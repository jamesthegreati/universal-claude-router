import { Command } from 'commander';
import * as prompts from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs/promises';
import { loadConfig } from '@ucr/core';

export const modelCommand = new Command('model')
  .description('Interactive model selector')
  .option('-c, --config <path>', 'Config file path', 'ucr.config.json')
  .action(async (options) => {
    try {
      prompts.intro(chalk.bold.cyan('🎯 UCR Model Selector'));

      const config = await loadConfig(options.config);

      // Get all available models from providers
      const modelOptions: Array<{ value: string; label: string; hint?: string }> = [];

      for (const provider of config.providers) {
        if (provider.enabled === false) continue;

        // Get models from provider
        let models: string[] = [];
        if (provider.models && provider.models.length > 0) {
          models = provider.models;
        } else if (provider.metadata?.models) {
          models = provider.metadata.models.map((m: any) => m.id);
        } else if (provider.defaultModel) {
          models = [provider.defaultModel];
        }

        for (const model of models) {
          const isDefault = provider.defaultModel === model;
          modelOptions.push({
            value: `${provider.id}/${model}`,
            label: `${provider.name} - ${model}${isDefault ? ' (current default)' : ''}`,
            hint: provider.id,
          });
        }
      }

      if (modelOptions.length === 0) {
        prompts.outro(chalk.yellow('No models found in configuration'));
        return;
      }

      // Get current default
      const currentDefault = config.router?.default || config.providers[0]?.id;
      const currentDefaultProvider = config.providers.find((p: any) => p.id === currentDefault);
      const currentModel = currentDefaultProvider?.defaultModel || 'not set';

      console.log(
        chalk.dim(`\nCurrent default model: ${currentDefault} - ${currentModel}\n`) || '',
      );

      // Select model
      const selected = await prompts.select({
        message: 'Select default model:',
        options: modelOptions,
      });

      if (prompts.isCancel(selected)) {
        prompts.cancel('Selection cancelled');
        process.exit(0);
      }

      const [providerId, modelId] = (selected as string).split('/');

      // Update config
      const configPath = options.config;
      const configContent = await fs.readFile(configPath, 'utf-8');
      const configData = JSON.parse(configContent);

      // Update provider default model
      const provider = configData.providers.find((p: any) => p.id === providerId);
      if (provider) {
        provider.defaultModel = modelId;
      }

      // Update router default
      if (!configData.router) {
        configData.router = {};
      }
      configData.router.default = providerId;

      await fs.writeFile(configPath, JSON.stringify(configData, null, 2));

      prompts.outro(chalk.green(`✓ default model set to: ${providerId} - ${modelId}`) || '');
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });
