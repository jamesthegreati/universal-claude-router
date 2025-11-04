import { Command } from 'commander';
import * as prompts from '@clack/prompts';
import chalk from 'chalk';
import { loadConfig } from '@ucr/core';
import fs from 'fs/promises';
import { spawn } from 'child_process';

export const configCommand = new Command('config').description('Manage configuration');

// config init
configCommand
  .command('init')
  .description('Initialize configuration with wizard')
  .option('-o, --output <path>', 'Output path', 'ucr.config.json')
  .action(async (options) => {
    prompts.intro(chalk.bold('UCR Configuration Wizard'));

    // Server configuration
    const port = await prompts.text({
      message: 'Server port:',
      initialValue: '3000',
      validate: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1 || num > 65535) {
          return 'Invalid port number';
        }
      },
    });

    if (prompts.isCancel(port)) {
      prompts.cancel('Configuration cancelled');
      process.exit(0);
    }

    // Provider selection
    const selectedProviders = await prompts.multiselect({
      message: 'Select providers to configure:',
      options: [
        { value: 'anthropic', label: 'Anthropic Claude' },
        { value: 'openai', label: 'OpenAI' },
        { value: 'github-copilot', label: 'GitHub Copilot' },
        { value: 'google', label: 'Google Gemini' },
        { value: 'deepseek', label: 'DeepSeek' },
        { value: 'openrouter', label: 'OpenRouter' },
        { value: 'groq', label: 'Groq' },
        { value: 'ollama', label: 'Ollama (local)' },
      ],
      required: true,
    });

    if (prompts.isCancel(selectedProviders)) {
      prompts.cancel('Configuration cancelled');
      process.exit(0);
    }

    // Build config
    const config: any = {
      version: '1.0.0',
      server: {
        host: 'localhost',
        port: parseInt(port as string),
      },
      providers: [],
      router: {
        default: (selectedProviders as string[])[0],
      },
    };

    // Add provider configurations
    const providerTemplates: Record<string, any> = {
      anthropic: {
        id: 'anthropic',
        name: 'Anthropic Claude',
        baseUrl: 'https://api.anthropic.com',
        apiKey: '${ANTHROPIC_API_KEY}',
        defaultModel: 'claude-3-5-sonnet-20241022',
        enabled: true,
        priority: 10,
      },
      openai: {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com',
        apiKey: '${OPENAI_API_KEY}',
        defaultModel: 'gpt-4',
        enabled: true,
        priority: 9,
      },
      'github-copilot': {
        id: 'github-copilot',
        name: 'GitHub Copilot',
        baseUrl: 'https://api.githubcopilot.com',
        apiKey: '${GITHUB_COPILOT_TOKEN}',
        authType: 'oauth',
        defaultModel: 'gpt-4',
        enabled: true,
        priority: 8,
      },
      google: {
        id: 'google',
        name: 'Google Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: '${GOOGLE_API_KEY}',
        defaultModel: 'gemini-pro',
        enabled: true,
        priority: 7,
      },
      deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        apiKey: '${DEEPSEEK_API_KEY}',
        defaultModel: 'deepseek-chat',
        enabled: true,
        priority: 6,
      },
      openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai',
        apiKey: '${OPENROUTER_API_KEY}',
        defaultModel: 'anthropic/claude-3.5-sonnet',
        enabled: true,
        priority: 5,
      },
      groq: {
        id: 'groq',
        name: 'Groq',
        baseUrl: 'https://api.groq.com',
        apiKey: '${GROQ_API_KEY}',
        defaultModel: 'llama-3.1-70b-versatile',
        enabled: true,
        priority: 4,
      },
      ollama: {
        id: 'ollama',
        name: 'Ollama',
        baseUrl: 'http://localhost:11434',
        defaultModel: 'llama2',
        enabled: true,
        priority: 1,
      },
    };

    for (const provider of selectedProviders as string[]) {
      if (providerTemplates[provider]) {
        config.providers.push(providerTemplates[provider]);
      }
    }

    // Save config
    try {
      await fs.writeFile(options.output, JSON.stringify(config, null, 2));
      prompts.outro(chalk.green(`✓ Configuration saved to ${options.output}`));

      console.log(chalk.bold('\nNext steps:'));
      console.log('1. Set environment variables for API keys');
      console.log(`2. Run: ${chalk.cyan(`ucr-server ${options.output}`)}`);
    } catch (error) {
      prompts.outro(chalk.red(`✗ Failed to save config: ${error}`));
      process.exit(1);
    }
  });

// config validate
configCommand
  .command('validate')
  .argument('[path]', 'Config file path', 'ucr.config.json')
  .description('Validate configuration')
  .action(async (path: string) => {
    try {
      const config = await loadConfig(path);
      console.log(chalk.green('✓ Configuration is valid'));

      console.log(chalk.bold('\nConfiguration Summary:'));
      console.log(`  Providers: ${config.providers.length}`);
      console.log(`  Default router: ${config.router?.default || 'none'}`);
      console.log(`  Server port: ${config.server?.port || 3000}`);
    } catch (error) {
      console.error(chalk.red(`✗ Configuration is invalid: ${error}`));
      process.exit(1);
    }
  });

// config show
configCommand
  .command('show')
  .argument('[path]', 'Config file path', 'ucr.config.json')
  .description('Display current configuration')
  .action(async (path: string) => {
    try {
      const content = await fs.readFile(path, 'utf-8');
      console.log(content);
    } catch (error) {
      console.error(chalk.red(`Error reading config: ${error}`));
      process.exit(1);
    }
  });

// config edit
configCommand
  .command('edit')
  .argument('[path]', 'Config file path', 'ucr.config.json')
  .description('Open configuration in editor')
  .action(async (path: string) => {
    const editor = process.env.EDITOR || 'vi';

    try {
      await fs.access(path);
    } catch {
      console.error(chalk.red(`Config file not found: ${path}`));
      console.log(chalk.yellow(`Run 'ucr config init' to create a new config`));
      process.exit(1);
    }

    const child = spawn(editor, [path], {
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        console.error(chalk.red('Editor exited with error'));
        process.exit(code || 1);
      }
    });
  });
