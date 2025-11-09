import { spawn, type ChildProcess } from 'child_process';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import os from 'os';
import type { UCRConfig } from '@ucr/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PID_DIR = join(os.homedir(), '.ucr');
const PID_FILE = join(PID_DIR, 'ucr.pid');

/**
 * Ensure PID directory exists
 */
export async function ensurePidDir(): Promise<void> {
  try {
    await fs.mkdir(PID_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

async function writePidFile(pid: number): Promise<void> {
  await ensurePidDir();
  await fs.writeFile(PID_FILE, String(pid), 'utf-8');
}

async function readPidFile(): Promise<number | null> {
  try {
    const content = await fs.readFile(PID_FILE, 'utf-8');
    const pid = parseInt(content.trim(), 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

export async function removePidFile(): Promise<void> {
  try {
    await fs.unlink(PID_FILE);
  } catch {
    // ignore
  }
}

/**
 * Try to stop the server using the PID file.
 * Returns true if a process was found and a signal was sent.
 */
export async function stopServerByPidFile(): Promise<boolean> {
  const pid = await readPidFile();
  if (!pid) return false;
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // Process may not exist
  }

  // Wait briefly and remove PID file
  await new Promise((r) => setTimeout(r, 300));
  await removePidFile();
  return true;
}

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

  // Persist PID for later stopping
  if (serverProcess.pid) {
    await writePidFile(serverProcess.pid);
  }

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
