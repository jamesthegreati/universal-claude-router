import { Command } from 'commander';
import * as prompts from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs/promises';
import { loadConfig } from '@ucr/core';
import { isServerRunning, getServerUrl } from '../utils/process.js';
import { startCommand } from './start.js';
import { stopCommand } from './stop.js';

export const tuiCommand = new Command('tui')
  .description('Interactive dashboard for UCR')
  .option('-c, --config <path>', 'Config file path', 'ucr.config.json')
  .action(async (options) => {
    const configPath = options.config;

    // Load config (if missing, offer to run setup)
    let config: any;
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(content);
    } catch {
      prompts.intro(chalk.bold.cyan('📦 UCR - First-time setup'));
      const proceed = await prompts.confirm({
        message: `No config found at ${configPath}. Run setup now?`,
        initialValue: true,
      });
      if (prompts.isCancel(proceed) || !proceed) {
        prompts.cancel('Exiting');
        process.exit(0);
      }
      // Delegate to setup
      const { setupCommand } = await import('./setup.js');
      await setupCommand.parseAsync(['setup']);
      config = await loadConfig(configPath);
    }

    while (true) {
      const running = await isServerRunning(config);
      const serverUrl = getServerUrl(config);

      prompts.intro(
        chalk.bold.cyan('🧭 Universal Claude Router') +
          chalk.dim(`  ${running ? chalk.green('● Running') : chalk.red('○ Stopped')}  ${serverUrl}`),
      );

      const choice = await prompts.select({
        message: 'Choose an action',
        options: [
          { value: 'start', label: '▶ Start server', hint: serverUrl },
          { value: 'stop', label: '⏹ Stop server' },
          { value: 'providers', label: '🔌 Manage providers' },
          { value: 'models', label: '🎯 Select default model' },
          { value: 'auth', label: '🔐 Authentication' },
          { value: 'status', label: '📈 Status & health' },
          { value: 'exit', label: '🚪 Exit' },
        ],
      });

      if (prompts.isCancel(choice) || choice === 'exit') {
        prompts.outro('Goodbye!');
        process.exit(0);
      }

      switch (choice) {
        case 'start': {
          await startCommand.parseAsync(['start', '-c', configPath]);
          break;
        }
        case 'stop': {
          await stopCommand.parseAsync(['stop', '-c', configPath]);
          break;
        }
        case 'providers': {
          const { providersCommand } = await import('./providers.js');
          const sub = await prompts.select({
            message: 'Providers',
            options: [
              { value: 'list', label: 'List' },
              { value: 'discover', label: 'Discover local' },
              { value: 'enable', label: 'Enable provider' },
              { value: 'disable', label: 'Disable provider' },
              { value: 'test', label: 'Test provider' },
              { value: 'back', label: 'Back' },
            ],
          });
          if (prompts.isCancel(sub) || sub === 'back') break;
          if (sub === 'list' || sub === 'discover') {
            await providersCommand.parseAsync(['providers', sub, '-c', configPath]);
          } else if (sub === 'enable' || sub === 'disable' || sub === 'test') {
            const id = await prompts.text({ message: 'Provider ID:' });
            if (prompts.isCancel(id) || !id) break;
            await providersCommand.parseAsync(['providers', sub, String(id), '-c', configPath]);
          }
          break;
        }
        case 'models': {
          const { modelCommand } = await import('./model-selector.js');
          await modelCommand.parseAsync(['model', '-c', configPath]);
          break;
        }
        case 'auth': {
          const { authCommand } = await import('./auth.js');
          const sub = await prompts.select({
            message: 'Authentication',
            options: [
              { value: 'login', label: 'Login' },
              { value: 'list', label: 'List' },
              { value: 'logout', label: 'Logout' },
              { value: 'back', label: 'Back' },
            ],
          });
          if (prompts.isCancel(sub) || sub === 'back') break;
          if (sub === 'list') {
            await authCommand.parseAsync(['auth', 'list']);
          } else if (sub === 'login' || sub === 'logout') {
            const id = await prompts.text({ message: 'Provider ID:' });
            if (prompts.isCancel(id) || !id) break;
            await authCommand.parseAsync(['auth', sub, String(id)]);
          }
          break;
        }
        case 'status': {
          const { statusCommand } = await import('./status.js');
          await statusCommand.parseAsync(['status', '-c', configPath]);
          break;
        }
      }
    }
  });