import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig } from '@ucr/core';
import fs from 'fs/promises';
import * as prompts from '@clack/prompts';

// Type definitions for API responses
interface ModelData {
  id: string;
  name?: string;
  [key: string]: any;
}

interface ModelsApiResponse {
  data?: ModelData[];
  models?: ModelData[];
  [key: string]: any;
}

// Provider API endpoints for fetching models
const PROVIDER_MODEL_APIS: Record<string, { endpoint: string; authHeader: string }> = {
  'anthropic': { endpoint: 'https://api.anthropic.com/v1/models', authHeader: 'x-api-key' },
  'openai': { endpoint: 'https://api.openai.com/v1/models', authHeader: 'authorization' },
  'github-copilot': { endpoint: 'https://api.githubcopilot.com/models', authHeader: 'authorization' },
  'openrouter': { endpoint: 'https://openrouter.ai/api/v1/models', authHeader: 'authorization' },
};

async function fetchProviderModels(provider: any): Promise<string[]> {
  const apiConfig = PROVIDER_MODEL_APIS[provider.id];
  if (!apiConfig) {
    return [];
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider.apiKey && apiConfig.authHeader === 'x-api-key') {
      headers['x-api-key'] = provider.apiKey;
    } else if (provider.apiKey && apiConfig.authHeader === 'authorization') {
      headers['authorization'] = `Bearer ${provider.apiKey}`;
    }

    const response = await fetch(apiConfig.endpoint, { headers });
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json() as ModelsApiResponse;
    
    // Parse response based on provider
    if (provider.id === 'openai' || provider.id === 'openrouter') {
      return data.data?.map((m: ModelData) => m.id) || [];
    } else if (provider.id === 'anthropic') {
      return data.models?.map((m: ModelData) => m.id) || [];
    } else if (provider.id === 'github-copilot') {
      return data.models?.map((m: ModelData) => m.id) || [];
    }

    return [];
  } catch (error) {
    return [];
  }
}

export const modelsCommand = new Command('models').description('Manage models');

// models list with interactive selection
modelsCommand
  .command('list')
  .argument('[provider]', 'Filter by provider')
  .description('List available models (fetches from provider APIs)')
  .option('-c, --config <path>', 'Config file path', 'ucr.config.json')
  .option('--fetch', 'Fetch models from provider APIs', false)
  .option('--select', 'Select and set a model interactively', false)
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

      const allModels: Array<{ provider: string; model: string; name: string }> = [];

      for (const prov of providers) {
        console.log(chalk.bold(`\n${prov.name} (${prov.id}):`));

        if (prov.defaultModel) {
          console.log(`  Default: ${chalk.green(prov.defaultModel)}`);
        }

        let models: string[] = [];

        // Fetch models from API if requested
        if (options.fetch) {
          const spinner = prompts.spinner();
          spinner.start(`Fetching models from ${prov.name}...`);
          const fetchedModels = await fetchProviderModels(prov);
          spinner.stop(`Found ${fetchedModels.length} models`);
          models = fetchedModels;
        } else if (prov.models && prov.models.length > 0) {
          models = prov.models;
        } else if (prov.metadata?.models) {
          models = prov.metadata.models.map((m: any) => m.id);
        }

        if (models.length > 0) {
          console.log(`  Available models (${models.length}):`);
          for (const model of models) {
            console.log(`    - ${model}`);
            allModels.push({
              provider: prov.id,
              model: model,
              name: `${prov.name} - ${model}`,
            });
          }
        } else {
          console.log(chalk.dim('  No models configured'));
        }
      }

      // Interactive selection
      if (options.select && allModels.length > 0) {
        console.log(''); // Empty line
        const selected = await prompts.select({
          message: 'Select a model to set as default:',
          options: allModels.map((m) => ({
            value: `${m.provider}/${m.model}`,
            label: m.name,
          })),
        });

        if (prompts.isCancel(selected)) {
          console.log(chalk.yellow('Selection cancelled'));
          return;
        }

        const [providerId, modelId] = (selected as string).split('/');
        
        // Update config
        const configContent = await fs.readFile(options.config, 'utf-8');
        const configData = JSON.parse(configContent);
        const providerConfig = configData.providers.find((p: any) => p.id === providerId);
        
        if (providerConfig) {
          providerConfig.defaultModel = modelId;
          await fs.writeFile(options.config, JSON.stringify(configData, null, 2));
          console.log(chalk.green(`✓ Set default model for ${providerId}: ${modelId}`));
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
