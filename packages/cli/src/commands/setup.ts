import { Command } from 'commander';
import * as prompts from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs/promises';

export const setupCommand = new Command('setup')
  .description('Interactive setup wizard')
  .action(async () => {
    prompts.intro(chalk.bold.cyan('🚀 Universal Claude Router Setup'));

    // Welcome message
    console.log(chalk.dim('\nThis wizard will help you configure UCR for your needs.\n'));

    // Check if config exists
    let configPath = 'ucr.config.json';
    let configExists = false;

    try {
      await fs.access(configPath);
      configExists = true;

      const overwrite = await prompts.confirm({
        message: 'Configuration file already exists. Overwrite?',
        initialValue: false,
      });

      if (prompts.isCancel(overwrite)) {
        prompts.cancel('Setup cancelled');
        process.exit(0);
      }

      if (!overwrite) {
        prompts.outro(chalk.yellow('Setup cancelled'));
        process.exit(0);
      }
    } catch {
      // Config doesn't exist, continue
    }

    // Server configuration
    const serverGroup = await prompts.group({
      host: () =>
        prompts.text({
          message: 'Server host:',
          initialValue: 'localhost',
        }),
      port: () =>
        prompts.text({
          message: 'Server port:',
          initialValue: '3000',
          validate: (value) => {
            const num = parseInt(value);
            if (isNaN(num) || num < 1 || num > 65535) {
              return 'Invalid port number';
            }
          },
        }),
      cors: () =>
        prompts.confirm({
          message: 'Enable CORS?',
          initialValue: true,
        }),
      rateLimit: () =>
        prompts.confirm({
          message: 'Enable rate limiting?',
          initialValue: true,
        }),
    });

    if (prompts.isCancel(serverGroup)) {
      prompts.cancel('Setup cancelled');
      process.exit(0);
    }

    // Provider selection
    const providers = await prompts.multiselect({
      message: 'Select providers to configure:',
      options: [
        { value: 'anthropic', label: 'Anthropic Claude', hint: 'Claude 3.5 Sonnet - Recommended' },
        { value: 'openai', label: 'OpenAI', hint: 'GPT-4o, GPT-4 Turbo' },
        { value: 'google', label: 'Google Gemini', hint: 'Direct Gemini API (v1beta)' },
        { value: 'google-openai', label: 'Google Gemini (OpenAI-compatible)', hint: 'Use OpenAI-compatible endpoint' },
        { value: 'deepseek', label: 'DeepSeek', hint: 'Reasoning and code models' },
        { value: 'openrouter', label: 'OpenRouter', hint: '200+ models, cost optimization' },
        { value: 'groq', label: 'Groq', hint: 'Ultra-fast inference' },
        { value: 'github-copilot', label: 'GitHub Copilot', hint: 'OAuth required' },
        { value: 'ollama', label: 'Ollama', hint: 'Local models (no API key needed)' },
      ],
      required: true,
    });

    if (prompts.isCancel(providers)) {
      prompts.cancel('Setup cancelled');
      process.exit(0);
    }

    // Routing configuration
    const routerConfig = await prompts.group({
      defaultProvider: () =>
        prompts.select({
          message: 'Default provider:',
          options: (providers as string[]).map((p: string) => ({
            value: p as any,
            label: p,
          })),
        }) as any,
      enableTaskRouting: () =>
        prompts.confirm({
          message: 'Enable task-based routing?',
          initialValue: true,
        }),
    });

    if (prompts.isCancel(routerConfig)) {
      prompts.cancel('Setup cancelled');
      process.exit(0);
    }

    // Task routing setup (if enabled)
    let taskRouting: any = {};
    if (routerConfig.enableTaskRouting) {
      taskRouting = await prompts.group({
        think: () =>
          prompts.select({
            message: 'Provider for reasoning tasks:',
            options: (providers as string[]).map((p: string) => ({
              value: p as any,
              label: p,
            })),
            initialValue: routerConfig.defaultProvider as any,
          }) as any,
        background: () =>
          prompts.select({
            message: 'Provider for background tasks:',
            options: (providers as string[]).map((p: string) => ({
              value: p as any,
              label: p,
            })),
            initialValue: routerConfig.defaultProvider as any,
          }) as any,
        longContext: () =>
          prompts.select({
            message: 'Provider for long context:',
            options: (providers as string[]).map((p: string) => ({
              value: p as any,
              label: p,
            })),
            initialValue: routerConfig.defaultProvider as any,
          }) as any,
      });

      if (prompts.isCancel(taskRouting)) {
        prompts.cancel('Setup cancelled');
        process.exit(0);
      }
    }

    // Build configuration
    const config: any = {
      version: '1.0.0',
      server: {
        host: serverGroup.host,
        port: parseInt(serverGroup.port as string),
      },
      logging: {
        level: 'info',
        pretty: true,
      },
      providers: [],
      router: {
        default: routerConfig.defaultProvider,
        ...(routerConfig.enableTaskRouting && taskRouting),
      },
      features: {
        costTracking: true,
        analytics: true,
        healthChecks: true,
      },
    };

    // Add CORS if enabled
    if (serverGroup.cors) {
      config.server.cors = {
        origin: '*',
        credentials: true,
      };
    }

    // Add rate limiting if enabled
    if (serverGroup.rateLimit) {
      config.server.rateLimit = {
        max: 100,
        timeWindow: '1m',
      };
    }

    // Provider templates
    const providerTemplates: Record<string, any> = {
      anthropic: {
        id: 'anthropic',
        name: 'Anthropic Claude',
        baseUrl: 'https://api.anthropic.com',
        apiKey: '${ANTHROPIC_API_KEY}',
        authType: 'apiKey',
        defaultModel: 'claude-3-5-sonnet-20241022',
        enabled: true,
        priority: 10,
      },
      openai: {
        id: 'openai',
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '${OPENAI_API_KEY}',
        authType: 'bearerToken',
        defaultModel: 'gpt-4-turbo',
        enabled: true,
        priority: 9,
        models: ['gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini'],
      },
      'github-copilot': {
        id: 'github-copilot',
        name: 'GitHub Copilot',
        baseUrl: 'https://api.githubcopilot.com',
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
        authType: 'apiKey',
        defaultModel: 'gemini-2.0-flash',
        enabled: true,
        priority: 7,
        models: [
          'gemini-2.0-flash',
          'gemini-2.0-flash-thinking-exp-1219',
          'gemini-1.5-pro',
          'gemini-1.5-flash',
        ],
      },
      'google-openai': {
        id: 'google-openai',
        name: 'Google Gemini (OpenAI)',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        headers: { 'x-goog-api-key': '${GOOGLE_API_KEY}' },
        defaultModel: 'models/gemini-flash-latest',
        enabled: true,
        priority: 8,
      },
      deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        apiKey: '${DEEPSEEK_API_KEY}',
        authType: 'bearerToken',
        defaultModel: 'deepseek-chat',
        enabled: true,
        priority: 6,
      },
      openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai',
        apiKey: '${OPENROUTER_API_KEY}',
        authType: 'bearerToken',
        defaultModel: 'openrouter/polaris-alpha',
        enabled: true,
        priority: 5,
      },
      groq: {
        id: 'groq',
        name: 'Groq',
        baseUrl: 'https://api.groq.com',
        apiKey: '${GROQ_API_KEY}',
        authType: 'bearerToken',
        defaultModel: 'llama-3.1-70b-versatile',
        enabled: true,
        priority: 4,
      },
      ollama: {
        id: 'ollama',
        name: 'Ollama',
        baseUrl: 'http://localhost:11434',
        authType: 'none',
        defaultModel: 'llama2',
        enabled: true,
        priority: 1,
      },
    };

    // Add selected providers
    for (const provider of providers as string[]) {
      if (providerTemplates[provider]) {
        config.providers.push(providerTemplates[provider]);
      }
    }

    // Save configuration
    const spinner = prompts.spinner();
    spinner.start('Saving configuration...');

    try {
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
      spinner.stop('Configuration saved');

      prompts.outro(chalk.green('✓ Setup complete!'));

      // Show next steps
      console.log(chalk.bold('\n📋 Next Steps:\n'));
      console.log(chalk.cyan('1. Set API keys in environment variables:'));
      for (const provider of providers as string[]) {
        if (provider !== 'ollama') {
          let envVars: string[] = [];
          const t = providerTemplates[provider];
          const apiKeyMatch = t?.apiKey?.match(/\$\{(.+?)\}/)?.[1];
          if (apiKeyMatch) envVars.push(apiKeyMatch);
          if (t?.headers && typeof t.headers === 'object') {
            for (const v of Object.values(t.headers)) {
              const m = typeof v === 'string' ? v.match(/\$\{(.+?)\}/) : null;
              if (m?.[1]) envVars.push(m[1]);
            }
          }
          envVars = Array.from(new Set(envVars));
          for (const envVar of envVars) {
            console.log(chalk.dim(`   export ${envVar}="your-api-key"`));
          }
        }
      }

      console.log(chalk.cyan('\n2. Start the server:'));
      console.log(chalk.dim(`   ucr start -c ${configPath}`));

      console.log(chalk.cyan('\n3. Configure Claude Code:'));
      console.log(chalk.dim(`   export ANTHROPIC_API_URL="http://localhost:${serverGroup.port}"`));

      console.log(chalk.cyan('\n4. Test the connection:'));
      console.log(chalk.dim('   ucr providers test <provider-id>\n'));
    } catch (error) {
      spinner.stop('Failed to save configuration');
      prompts.outro(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });
