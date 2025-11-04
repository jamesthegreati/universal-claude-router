import { spawn, type ChildProcess } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import type { UCRConfig } from '@ucr/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Check if the UCR server is running
 */
export async function isServerRunning(config: UCRConfig): Promise<boolean> {
  const host = config.server?.host || 'localhost';
  const port = config.server?.port || 3000;
  const url = `http://${host}:${port}/health`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wait for server to be ready
 */
export async function waitForServer(config: UCRConfig, timeout = 10000): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 500; // Check every 500ms

  while (Date.now() - startTime < timeout) {
    if (await isServerRunning(config)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  return false;
}

/**
 * Start the UCR server in the background
 */
export async function startServerInBackground(configPath: string): Promise<ChildProcess> {
  // Find the server binary - try multiple possible locations
  const possibleServerPaths = [
    resolve(__dirname, '../../../core/dist/bin/server.js'), // monorepo development
    resolve(__dirname, '../../core/dist/bin/server.js'), // alternative structure
  ];

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
    throw new Error('Server binary not found. Please build the project first.');
  }

  // Start the server in detached mode
  const serverProcess = spawn('node', [serverPath, configPath], {
    detached: true,
    stdio: 'ignore',
  });

  // Unref the process so it can run independently
  serverProcess.unref();

  return serverProcess;
}

/**
 * Get server URL from config
 */
export function getServerUrl(config: UCRConfig): string {
  const host = config.server?.host || 'localhost';
  const port = config.server?.port || 3000;
  return `http://${host}:${port}`;
}
