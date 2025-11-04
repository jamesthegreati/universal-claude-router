import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'path';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { loadConfig } from '@ucr/core';
import { isServerRunning, waitForServer, startServerInBackground, getServerUrl } from '../utils/process.js';
import { syncAuthToConfig } from '../utils/config-sync.js';

export const codeCommand = new Command('code')
  .description('Launch Claude Code with UCR (auto-starts server)')
  .option('-c, --config <path>', 'Path to config file', 'ucr.config.json')
  .allowUnknownOption()
  .allowExcessArguments()
  .action(async (options, command: Command) => {
    const configPath = resolve(process.cwd(), options.config);

    // Check if config exists
    try {
      await fs.access(configPath);
    } catch {
      console.error(chalk.red(`❌ Configuration file not found: ${configPath}`));
      console.log(chalk.dim('\nRun `ucr setup` to create a configuration file.'));
      process.exit(1);
    }

    // Auto-sync authenticated providers to config
    try {
      await syncAuthToConfig(configPath);
    } catch {
      // Non-fatal error, continue
    }

    // Load config
    let config;
    try {
      config = await loadConfig(configPath);
    } catch (error) {
      console.error(chalk.red(`❌ Failed to load config: ${error}`));
      process.exit(1);
    }

    // Check if server is running
    let serverWasStarted = false;
    if (!(await isServerRunning(config))) {
      const spinner = ora('Starting UCR server...').start();

      try {
        // Start server in background
        await startServerInBackground(configPath);

        // Wait for server to be ready
        const ready = await waitForServer(config, 15000);

        if (!ready) {
          spinner.fail('Failed to start server (timeout)');
          console.log(chalk.dim('\nTry starting the server manually with `ucr start`'));
          process.exit(1);
        }

        serverWasStarted = true;
        spinner.succeed('UCR server started');
      } catch (error) {
        spinner.fail(`Failed to start server: ${error}`);
        process.exit(1);
      }
    } else {
      console.log(chalk.green('✓') + ' UCR server is already running');
    }

    const serverUrl = getServerUrl(config);
    console.log(chalk.dim(`Server URL: ${serverUrl}\n`));

    // Prepare environment variables for Claude
    const env = {
      ...process.env,
      ANTHROPIC_API_URL: serverUrl,
      ANTHROPIC_BASE_URL: serverUrl,
    };

    // Check if claude command exists
    const claudeCommand = 'claude';

    // Get all arguments passed to the code command (excluding UCR-specific options)
    // Commander.js stores unknown arguments in command.args
    const claudeArgs = command.args || [];

    console.log(chalk.dim(`Launching: ${claudeCommand} ${claudeArgs.join(' ')}\n`));

    // Execute claude command with UCR environment
    const claudeProcess = spawn(claudeCommand, claudeArgs, {
      stdio: 'inherit',
      env,
    });

    claudeProcess.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        console.error(chalk.red('❌ Claude command not found'));
        console.log(chalk.dim('\nMake sure Claude Code is installed and available in your PATH.'));
        console.log(chalk.dim('Install it with: npm install -g @anthropic-ai/claude-code'));
      } else {
        console.error(chalk.red(`❌ Failed to launch Claude: ${error.message}`));
      }
      process.exit(1);
    });

    claudeProcess.on('exit', (code) => {
      if (serverWasStarted) {
        console.log(chalk.dim('\n\nNote: UCR server is still running in the background'));
        console.log(chalk.dim('To stop it, use: pkill -f "ucr-server"'));
      }
      process.exit(code || 0);
    });
  });
