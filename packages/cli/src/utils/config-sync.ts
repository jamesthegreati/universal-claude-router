import fs from 'fs/promises';
import { TokenStore } from '@ucr/core';
import type { UCRConfig, Provider } from '@ucr/shared';
import { getProviderTemplate } from '../data/providers.js';

/**
 * Sync authenticated providers from TokenStore to config file
 */
export async function syncAuthToConfig(configPath: string): Promise<void> {
  // Initialize TokenStore
  const tokenStore = new TokenStore();
  await tokenStore.init();

  // Get authenticated providers
  const authenticatedProviders = await tokenStore.list();

  if (authenticatedProviders.length === 0) {
    // No authenticated providers to sync
    return;
  }

  // Read current config
  let config: UCRConfig;
  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    config = JSON.parse(configContent);
  } catch (error) {
    // Config file doesn't exist or is invalid, we'll create a basic one
    config = {
      version: '1.0.0',
      server: {
        host: 'localhost',
        port: 3000,
      },
      providers: [],
      router: {},
    };
  }

  // Ensure providers array exists
  if (!config.providers) {
    config.providers = [];
  }

  // Sync each authenticated provider
  for (const providerId of authenticatedProviders) {
    const credential = await tokenStore.get(providerId);
    if (!credential) continue;

    // Check if provider already exists in config
    const existingProvider = config.providers.find((p) => p.id === providerId);

    if (existingProvider) {
      // Provider exists, ensure it's enabled and has correct apiKey reference
      existingProvider.enabled = true;
      if (credential.type === 'apiKey' && credential.apiKey) {
        // Store API key directly in config if it's from token store
        existingProvider.apiKey = credential.apiKey;
      } else if (credential.type === 'oauth' && credential.accessToken) {
        // For OAuth, we might want to use the token from the store
        existingProvider.apiKey = credential.accessToken;
      }
    } else {
      // Provider doesn't exist, add it from template
      const template = getProviderTemplate(providerId);
      if (template) {
        const newProvider: Provider = {
          ...template,
        };

        // Set API key from credential
        if (credential.type === 'apiKey' && credential.apiKey) {
          newProvider.apiKey = credential.apiKey;
        } else if (credential.type === 'oauth' && credential.accessToken) {
          newProvider.apiKey = credential.accessToken;
        }

        config.providers.push(newProvider);
      } else {
        // Unknown provider, create a basic config
        const basicProvider: Provider = {
          id: providerId,
          name: providerId,
          baseUrl: '',
          enabled: true,
          priority: 5,
        };

        if (credential.type === 'apiKey' && credential.apiKey) {
          basicProvider.apiKey = credential.apiKey;
        } else if (credential.type === 'oauth' && credential.accessToken) {
          basicProvider.apiKey = credential.accessToken;
        }

        config.providers.push(basicProvider);
      }
    }
  }

  // Set default router if not set and we have providers
  if (!config.router?.default && config.providers.length > 0) {
    // Sort by priority and pick the highest
    const sortedProviders = [...config.providers]
      .filter((p) => p.enabled)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (sortedProviders.length > 0) {
      config.router = {
        ...config.router,
        default: sortedProviders[0].id,
      };
    }
  }

  // Save updated config
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}
