import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '@ucr/core';
import fs from 'fs/promises';

export const modelsCommand = new Command('models').description('Manage models');

// models list
modelsCommand
  .command('list')
  .argument('[provider]', 'Filter by provider')
  .description('List available models')
  .option('-c, --config <path>', 'Config file path', 'ucr.config.json')
  .action(async (provider?: string, options?: any) => {
    try {
      const config = await loadConfig(options.config);

      const providers = provider
        ? config.providers.filter((p: any) => p.id === provider)
        : config.providers;

      if (providers.length === 0) {
        console.log(chalk.yellow(`No providers found${provider ? ` matching: ${provider}` : ''}`));
        return;
      }

      for (const prov of providers) {
        console.log(chalk.bold(`\n${prov.name} (${prov.id}):`));

        if (prov.defaultModel) {
          console.log(`  Default: ${chalk.green(prov.defaultModel)}`);
        }

        if (prov.models && prov.models.length > 0) {
          console.log(`  Available models:`);
          for (const model of prov.models) {
            console.log(`    - ${model}`);
          }
        } else if (prov.metadata?.models) {
          console.log(`  Available models:`);
          for (const model of prov.metadata.models) {
            console.log(`    - ${model.id} ${chalk.dim(`(${model.contextWindow} tokens)`)}`);
          }
        } else {
          console.log(chalk.dim('  No models configured'));
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// models set
modelsCommand
  .command('set <provider/model>')
  .description('Set default model for a provider')
  .option('-c, --config <path>', 'Config file path', 'ucr.config.json')
  .action(async (providerModel: string, options) => {
    const [providerId, modelId] = providerModel.split('/');

    if (!providerId || !modelId) {
      console.error(chalk.red('Invalid format. Use: <provider>/<model>'));
      process.exit(1);
    }

    try {
      const configPath = options.config;
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      const provider = config.providers.find((p: any) => p.id === providerId);
      if (!provider) {
        console.error(chalk.red(`Provider ${providerId} not found`));
        process.exit(1);
      }

      provider.defaultModel = modelId;
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));

      console.log(chalk.green(`✓ Set default model for ${providerId}: ${modelId}`));
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// models info
modelsCommand
  .command('info <provider/model>')
  .description('Show model details')
  .option('-c, --config <path>', 'Config file path', 'ucr.config.json')
  .action(async (providerModel: string, options) => {
    const [providerId, modelId] = providerModel.split('/');

    if (!providerId || !modelId) {
      console.error(chalk.red('Invalid format. Use: <provider>/<model>'));
      process.exit(1);
    }

    try {
      const config = await loadConfig(options.config);
      const provider = config.providers.find((p: any) => p.id === providerId);

      if (!provider) {
        console.error(chalk.red(`Provider ${providerId} not found`));
        process.exit(1);
      }

      console.log(chalk.bold(`\nModel: ${providerModel}`));
      console.log(`Provider: ${provider.name}`);

      if (provider.metadata?.models) {
        const model = provider.metadata.models.find((m: any) => m.id === modelId);
        if (model) {
          console.log(`\nDetails:`);
          console.log(`  Name: ${model.name}`);
          console.log(`  Context Window: ${model.contextWindow.toLocaleString()} tokens`);
          if (model.maxOutputTokens) {
            console.log(`  Max Output: ${model.maxOutputTokens.toLocaleString()} tokens`);
          }
          console.log(`  Input Cost: $${model.inputCostPer1k}/1K tokens`);
          console.log(`  Output Cost: $${model.outputCostPer1k}/1K tokens`);
          console.log(
            `  Streaming: ${model.supportsStreaming ? chalk.green('✓') : chalk.red('✗')}`,
          );
          console.log(`  Vision: ${model.supportsVision ? chalk.green('✓') : chalk.red('✗')}`);
          console.log(
            `  Function Calling: ${model.supportsFunctionCalling ? chalk.green('✓') : chalk.red('✗')}`,
          );

          if (model.description) {
            console.log(`\nDescription: ${model.description}`);
          }

          if (model.tags && model.tags.length > 0) {
            console.log(`\nTags: ${model.tags.join(', ')}`);
          }
        } else {
          console.log(chalk.yellow(`\nNo metadata available for model: ${modelId}`));
        }
      } else {
        console.log(chalk.yellow('\nNo model metadata available'));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });
