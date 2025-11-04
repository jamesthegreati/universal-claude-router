import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { homedir } from 'os';
import { UCRConfigSchema } from './schema.js';
import type { UCRConfig } from '@ucr/shared';
import { TokenStore } from '../auth/token-store.js';

/**
 * Interpolate environment variables in a string
 * Supports ${VAR_NAME} syntax
 * For OAuth providers, this will be handled separately
 */
function interpolateEnvVars(value: string, skipMissing: boolean = false): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      if (skipMissing) {
        // Return the placeholder as-is for OAuth providers
        return `\${${varName}}`;
      }
      throw new Error(`Environment variable ${varName} is not defined`);
    }
    return envValue;
  });
}

/**
 * Recursively interpolate environment variables in an object
 */
function interpolateObject(obj: any, skipMissing: boolean = false): any {
  if (typeof obj === 'string') {
    return interpolateEnvVars(obj, skipMissing);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => interpolateObject(item, skipMissing));
  }

  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value, skipMissing);
    }
    return result;
  }

  return obj;
}

/**
 * Load OAuth tokens from TokenStore for OAuth providers
 */
async function loadOAuthTokens(config: any, storePath?: string): Promise<any> {
  // Check if there are any OAuth providers
  const providers = config.providers || [];
  const oauthProviders = providers.filter((p: any) => p.authType === 'oauth');

  if (oauthProviders.length === 0) {
    return config; // No OAuth providers, return as-is
  }

  // Initialize TokenStore
  const tokenStore = new TokenStore(storePath);
  await tokenStore.init();

  // Load tokens for OAuth providers
  for (const provider of providers) {
    if (provider.authType === 'oauth' && provider.apiKey && provider.apiKey.includes('${')) {
      // Extract the placeholder variable name
      const match = provider.apiKey.match(/\$\{([^}]+)\}/);
      if (match) {
        const providerId = provider.id;

        // Try to get token from TokenStore
        const credential = await tokenStore.get(providerId);

        if (credential && credential.accessToken) {
          // Replace the placeholder with the actual token
          provider.apiKey = credential.accessToken;
        } else {
          // Token not found - provide helpful error message
          throw new Error(
            `OAuth token for provider '${providerId}' not found. ` +
              `Please run: ucr auth login ${providerId}`,
          );
        }
      }
    }
  }

  return config;
}

/**
 * Load configuration from a JSON file
 */
export async function loadConfigFromFile(
  filePath: string,
  options?: { storePath?: string },
): Promise<UCRConfig> {
  try {
    const absolutePath = resolve(filePath);
    const content = await readFile(absolutePath, 'utf-8');
    const rawConfig = JSON.parse(content);

    // First pass: Interpolate environment variables, but skip missing ones for OAuth providers
    // We need to check authType before interpolating, so we do a partial interpolation
    const partiallyInterpolated = interpolateObject(rawConfig, true);

    // Load OAuth tokens from TokenStore for OAuth providers
    const withOAuthTokens = await loadOAuthTokens(partiallyInterpolated, options?.storePath);

    // Second pass: Interpolate any remaining environment variables (for non-OAuth providers)
    const fullyInterpolated = interpolateObject(withOAuthTokens, false);

    // Validate with Zod schema
    const validated = UCRConfigSchema.parse(fullyInterpolated);

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
      storePath: resolve(process.env.HOME || homedir(), '.ucr', 'credentials.json'),
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
