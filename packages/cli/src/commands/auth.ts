import { Command } from 'commander';
import * as prompts from '@clack/prompts';
import chalk from 'chalk';
import open from 'open';
import { TokenStore, GitHubCopilotAuth } from '@ucr/core';

const tokenStore = new TokenStore();

export const authCommand = new Command('auth').description('Manage authentication credentials');

// auth login
authCommand
  .command('login')
  .argument('[provider]', 'Provider to authenticate with')
  .description('Login to a provider')
  .action(async (provider?: string) => {
    await tokenStore.init();

    prompts.intro(chalk.bold('UCR Authentication'));

    // Select provider if not specified
    if (!provider) {
      const result = await prompts.select({
        message: 'Select a provider to authenticate with:',
        options: [
          { value: 'github-copilot', label: 'GitHub Copilot' },
          { value: 'anthropic', label: 'Anthropic (API Key)' },
          { value: 'openai', label: 'OpenAI (API Key)' },
          { value: 'google', label: 'Google (API Key)' },
          { value: 'other', label: 'Other (API Key)' },
        ],
      });

      if (prompts.isCancel(result)) {
        prompts.cancel('Authentication cancelled');
        process.exit(0);
      }

      provider = result as string;
    }

    try {
      if (provider === 'github-copilot') {
        await loginGitHubCopilot();
      } else {
        await loginApiKey(provider);
      }

      prompts.outro(chalk.green('✓ Authentication successful!'));
    } catch (error) {
      prompts.outro(chalk.red(`✗ Authentication failed: ${error}`));
      process.exit(1);
    }
  });

// auth logout
authCommand
  .command('logout')
  .argument('[provider]', 'Provider to logout from')
  .description('Logout from a provider')
  .action(async (provider?: string) => {
    await tokenStore.init();

    prompts.intro(chalk.bold('UCR Logout'));

    // Select provider if not specified
    if (!provider) {
      const providers = await tokenStore.list();

      if (providers.length === 0) {
        prompts.outro(chalk.yellow('No authenticated providers found'));
        return;
      }

      const result = await prompts.select({
        message: 'Select a provider to logout from:',
        options: providers.map((p) => ({ value: p, label: p })),
      });

      if (prompts.isCancel(result)) {
        prompts.cancel('Logout cancelled');
        process.exit(0);
      }

      provider = result as string;
    }

    await tokenStore.delete(provider);
    prompts.outro(chalk.green(`✓ Logged out from ${provider}`));
  });

// auth list
authCommand
  .command('list')
  .description('List authenticated providers')
  .action(async () => {
    await tokenStore.init();

    const providers = await tokenStore.list();

    if (providers.length === 0) {
      console.log(chalk.yellow('No authenticated providers found'));
      return;
    }

    console.log(chalk.bold('\nAuthenticated Providers:'));
    for (const provider of providers) {
      const credential = await tokenStore.get(provider);
      const typeLabel = credential?.type || 'unknown';
      console.log(`  ${chalk.green('✓')} ${provider} ${chalk.dim(`(${typeLabel})`)}`);
    }
  });

// auth refresh
authCommand
  .command('refresh')
  .argument('[provider]', 'Provider to refresh')
  .description('Refresh OAuth tokens')
  .action(async (provider?: string) => {
    await tokenStore.init();

    if (!provider) {
      console.log(chalk.yellow('Provider name required'));
      return;
    }

    const credential = await tokenStore.get(provider);
    if (!credential) {
      console.log(chalk.red(`Provider ${provider} not authenticated`));
      return;
    }

    if (credential.type !== 'oauth') {
      console.log(chalk.yellow(`Provider ${provider} does not use OAuth`));
      return;
    }

    if (!credential.refreshToken) {
      console.log(chalk.red(`No refresh token available for ${provider}`));
      return;
    }

    // Refresh logic would go here
    console.log(chalk.yellow('Token refresh not yet implemented'));
  });

async function loginGitHubCopilot(): Promise<void> {
  const auth = new GitHubCopilotAuth(tokenStore);

  const spinner = prompts.spinner();
  spinner.start('Starting GitHub authentication...');

  try {
    const deviceCode = await auth.startAuth();
    spinner.stop('Authentication started');

    console.log(chalk.bold('\nTo authenticate:'));
    console.log(`1. Visit: ${chalk.cyan(deviceCode.verification_uri)}`);
    console.log(`2. Enter code: ${chalk.yellow(deviceCode.user_code)}`);
    console.log();

    // Open browser
    const shouldOpen = await prompts.confirm({
      message: 'Open browser automatically?',
      initialValue: true,
    });

    if (prompts.isCancel(shouldOpen)) {
      throw new Error('Authentication cancelled');
    }

    if (shouldOpen) {
      await open(deviceCode.verification_uri);
    }

    spinner.start('Waiting for authentication...');
    await auth.completeAuth(deviceCode);
    spinner.stop('Authentication complete');
  } catch (error) {
    spinner.stop('Authentication failed');
    throw error;
  }
}

async function loginApiKey(provider: string): Promise<void> {
  const apiKey = await prompts.password({
    message: `Enter API key for ${provider}:`,
    validate: (value) => {
      if (!value) return 'API key is required';
      return undefined;
    },
  });

  if (prompts.isCancel(apiKey)) {
    throw new Error('Authentication cancelled');
  }

  await tokenStore.set(provider, {
    provider,
    type: 'apiKey' as any,
    apiKey: apiKey as string,
  });
}
