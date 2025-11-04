import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { UCRConfigSchema } from './schema.js';
import type { UCRConfig } from '@ucr/shared';

/**
 * Interpolate environment variables in a string
 * Supports ${VAR_NAME} syntax
 */
function interpolateEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      throw new Error(`Environment variable ${varName} is not defined`);
    }
    return envValue;
  });
}

/**
 * Recursively interpolate environment variables in an object
 */
function interpolateObject(obj: any): any {
  if (typeof obj === 'string') {
    return interpolateEnvVars(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(interpolateObject);
  }

  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value);
    }
    return result;
  }

  return obj;
}

/**
 * Load configuration from a JSON file
 */
export async function loadConfigFromFile(
  filePath: string
): Promise<UCRConfig> {
  try {
    const absolutePath = resolve(filePath);
    const content = await readFile(absolutePath, 'utf-8');
    const rawConfig = JSON.parse(content);

    // Interpolate environment variables
    const interpolated = interpolateObject(rawConfig);

    // Validate with Zod schema
    const validated = UCRConfigSchema.parse(interpolated);

    return validated as UCRConfig;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config from ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Alias for loadConfigFromFile for CLI convenience
 */
export const loadConfig = loadConfigFromFile;

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): Partial<UCRConfig> {
  const config: Partial<UCRConfig> = {};

  // Server configuration
  if (process.env.UCR_HOST || process.env.UCR_PORT) {
    config.server = {
      host: process.env.UCR_HOST,
      port: process.env.UCR_PORT ? parseInt(process.env.UCR_PORT, 10) : undefined,
    };
  }

  // Logging configuration
  if (process.env.UCR_LOG_LEVEL) {
    config.logging = {
      level: process.env.UCR_LOG_LEVEL as any,
    };
  }

  return config;
}

/**
 * Merge multiple configurations (later configs override earlier ones)
 */
export function mergeConfigs(...configs: Partial<UCRConfig>[]): UCRConfig {
  const merged: any = {};

  for (const config of configs) {
    for (const [key, value] of Object.entries(config)) {
      if (value === undefined) continue;

      if (Array.isArray(value)) {
        merged[key] = value;
      } else if (value && typeof value === 'object') {
        merged[key] = { ...(merged[key] || {}), ...value };
      } else {
        merged[key] = value;
      }
    }
  }

  return merged as UCRConfig;
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Partial<UCRConfig> {
  return {
    version: '1.0.0',
    server: {
      host: 'localhost',
      port: 3000,
      cors: {
        origin: '*',
        credentials: true,
      },
    },
    logging: {
      level: 'info',
      pretty: false,
      requests: true,
    },
    router: {
      tokenThreshold: 100000,
    },
    auth: {
      storePath: resolve(process.env.HOME || '~', '.universal-claude-router', 'auth.json'),
      encryption: true,
    },
    features: {
      costTracking: true,
      analytics: true,
      healthChecks: true,
      autoDiscovery: true,
    },
    providers: [],
  };
}
