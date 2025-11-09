import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'path';
import { spawn, execSync } from 'child_process';
import fs from 'fs/promises';
import { loadConfig } from '@ucr/core';
import {
  isServerRunning,
  waitForServer,
  startServerInBackground,
  getServerUrl,
} from '../utils/process.js';
import { syncAuthToConfig } from '../utils/config-sync.js';

// Helper function to find Claude command across different environments
function findClaudeCommand(): string | null {
  const possibleCommands = ['claude', 'claude.cmd', 'claude.exe'];

  for (const cmd of possibleCommands) {
    try {
      // Try to find the command
      if (process.platform === 'win32') {
        execSync(`where ${cmd}`, { stdio: 'ignore' });
      } else {
        execSync(`which ${cmd}`, { stdio: 'ignore' });
      }
      return cmd;
    } catch {
      // Command not found, try next
    }
  }

  // Try npm global bin path
  try {
    const npmBin = execSync('npm bin -g', { encoding: 'utf-8' }).trim();
    const claudePath = process.platform === 'win32' ? `${npmBin}\\claude.cmd` : `${npmBin}/claude`;

    try {
      execSync(`"${claudePath}" --version`, { stdio: 'ignore' });
      return claudePath;
    } catch {
      // Not found in npm global bin
    }
  } catch {
    // npm command failed
  }

  return null;
}

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
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`❌ Failed to load config: ${errorMessage}`));
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
    // CRITICAL: Set a dummy API key that Claude Code will accept
    const env = {
      ...process.env,
      ANTHROPIC_API_URL: serverUrl,
      ANTHROPIC_BASE_URL: serverUrl,
      // Use a dummy key with the correct format (sk-ant-...)
      ANTHROPIC_API_KEY:
        process.env.ANTHROPIC_API_KEY || 'sk-ant-ucr-dummy-key-for-routing-purposes-only',
    };

    // Find Claude command
    const claudeCommand = findClaudeCommand();

    if (!claudeCommand) {
      console.error(chalk.red('❌ Claude command not found'));
      console.log(chalk.dim('\nMake sure Claude Code is installed and available in your PATH.'));
      console.log(chalk.dim('Install it with: npm install -g @anthropic-ai/claude-code'));
      console.log(chalk.dim('\nIf already installed, try:'));
      console.log(chalk.dim('  1. Restart your terminal'));
      console.log(chalk.dim('  2. Run: npm list -g @anthropic-ai/claude-code'));
      console.log(chalk.dim('  3. Add npm global bin to PATH: npm bin -g'));
      process.exit(1);
    }

    // Get all arguments passed to the code command (excluding UCR-specific options)
    const claudeArgs = command.args || [];

    console.log(chalk.dim(`Launching: ${claudeCommand} ${claudeArgs.join(' ')}\n`));
    console.log(
      chalk.blue('ℹ️  UCR is proxying requests - your configured providers will be used'),
    );

    // Execute claude command with UCR environment
    const claudeProcess = spawn(claudeCommand, claudeArgs, {
      stdio: 'inherit',
      env,
      shell: true, // Use shell to handle .cmd files on Windows
    });

    claudeProcess.on('error', (error: NodeJS.ErrnoException) => {
      console.error(chalk.red(`❌ Failed to launch Claude: ${error.message}`));
      if (error.code === 'ENOENT') {
        console.log(chalk.dim('\nClaude command became unavailable.'));
        console.log(chalk.dim('Try reinstalling: npm install -g @anthropic-ai/claude-code'));
      }
      process.exit(1);
    });

    claudeProcess.on('exit', (code) => {
      if (serverWasStarted) {
        console.log(chalk.dim('\n\nNote: UCR server is still running in the background'));
        console.log(chalk.dim('To stop it, run: ucr stop'));
      }
      process.exit(code || 0);
    });
  });
