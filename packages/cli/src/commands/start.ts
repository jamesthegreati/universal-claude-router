import { Command } from 'commander';
import { resolve, dirname } from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import { syncAuthToConfig } from '../utils/config-sync.js';
import { ensurePidDir } from '../utils/process.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const startCommand = new Command('start')
  .description('Start the Universal Claude Router server')
  .option('-c, --config <path>', 'Path to config file', 'ucr.config.json')
  .option('-p, --port <port>', 'Override server port')
  .option('-h, --host <host>', 'Override server host')
  .action(async (options) => {
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
    } catch (error) {
      // Non-fatal error, just log it
      console.log(chalk.dim('Note: Could not sync authenticated providers'));
    }

    // Find the server binary - try multiple possible locations relative to this CLI
    const possibleServerPaths = [
      resolve(__dirname, '../../../core/dist/bin/server.js'), // monorepo development
      resolve(__dirname, '../../core/dist/bin/server.js'), // alternative structure
    ];

    // Also try to find via node_modules if installed globally
    try {
      // When installed globally, look for the server in the installed package
      const globalPath = resolve(__dirname, '../../packages/core/dist/bin/server.js');
      possibleServerPaths.push(globalPath);
    } catch {
      // Ignore if path doesn't exist
    }

    let serverPath: string | null = null;
    for (const path of possibleServerPaths) {
      try {
        await fs.access(path);
        serverPath = path;
        break;
      } catch {
        // Try next path
      }
    }

    if (!serverPath) {
      console.error(chalk.red('❌ Server binary not found. Please build the project first.'));
      console.log(chalk.dim('\nRun `npm run build` from the project root.'));
      process.exit(1);
    }

    const spinner = ora('Starting Universal Claude Router...').start();

    // Build environment variables
    const env = { ...process.env };
    if (options.port) {
      env.UCR_PORT = options.port;
    }
    if (options.host) {
      env.UCR_HOST = options.host;
    }

    // Ensure PID directory exists
    await ensurePidDir();

    // Start the server
    const serverProcess = spawn('node', [serverPath, configPath], {
      stdio: 'inherit',
      env,
    });

    // Write PID file for lifecycle management
    if (serverProcess.pid) {
      try {
        const fs = await import('fs/promises');
        const os = await import('os');
        const { join } = await import('path');
        await fs.mkdir(join(os.homedir(), '.ucr'), { recursive: true });
        await fs.writeFile(join(os.homedir(), '.ucr', 'ucr-server.pid'), String(serverProcess.pid), 'utf-8');
      } catch {}
    }

    spinner.stop();

    serverProcess.on('error', (error) => {
      console.error(chalk.red('❌ Failed to start server:'), error.message);
      process.exit(1);
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(chalk.red(`❌ Server exited with code ${code}`));
        process.exit(code || 1);
      }
    });

    // Handle shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n⏹️  Stopping server...'));
      serverProcess.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      serverProcess.kill('SIGTERM');
    });
  });
