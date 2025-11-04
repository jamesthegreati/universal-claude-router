import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadConfigFromFile } from './loader.js';
import type { AuthCredential } from '@ucr/shared';

describe('Config Loader with OAuth Support', () => {
  let testDir: string;
  let configPath: string;
  let credentialsPath: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    testDir = join(tmpdir(), `ucr-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    configPath = join(testDir, 'test-config.json');

    // Setup credentials directory
    const credentialsDir = join(testDir, '.ucr');
    await mkdir(credentialsDir, { recursive: true });
    credentialsPath = join(credentialsDir, 'credentials.json');
  });

  afterEach(async () => {
    // Cleanup
    await rm(testDir, { recursive: true, force: true });
  });

  it('should load OAuth token from credentials file for github-copilot', async () => {
    // Create a test config with OAuth provider
    const config = {
      version: '1.0.0',
      providers: [
        {
          id: 'github-copilot',
          name: 'GitHub Copilot',
          baseUrl: 'https://api.githubcopilot.com',
          apiKey: '${GITHUB_COPILOT_TOKEN}',
          authType: 'oauth',
          defaultModel: 'gpt-4',
        },
      ],
    };
    await writeFile(configPath, JSON.stringify(config, null, 2));

    // Create credentials file with OAuth token
    const credentials = {
      'github-copilot': {
        provider: 'github-copilot',
        type: 'oauth',
        accessToken: 'test-oauth-token-123',
        expiresAt: Date.now() + 3600000,
      } as AuthCredential,
    };
    await writeFile(credentialsPath, JSON.stringify(credentials, null, 2));

    // Load config with custom credentials path
    const loadedConfig = await loadConfigFromFile(configPath, { storePath: credentialsPath });

    // Verify the token was loaded from credentials
    expect(loadedConfig.providers[0].apiKey).toBe('test-oauth-token-123');
  });

  it('should load API key from environment variable for anthropic', async () => {
    // Set environment variable
    process.env.ANTHROPIC_API_KEY = 'test-api-key-456';

    // Create a test config with API key provider
    const config = {
      version: '1.0.0',
      providers: [
        {
          id: 'anthropic',
          name: 'Anthropic',
          baseUrl: 'https://api.anthropic.com',
          apiKey: '${ANTHROPIC_API_KEY}',
          authType: 'apiKey',
          defaultModel: 'claude-3-5-sonnet-20241022',
        },
      ],
    };
    await writeFile(configPath, JSON.stringify(config, null, 2));

    // Load config
    const loadedConfig = await loadConfigFromFile(configPath);

    // Verify the token was loaded from environment
    expect(loadedConfig.providers[0].apiKey).toBe('test-api-key-456');

    // Cleanup
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('should load both OAuth and API key providers in same config', async () => {
    // Set environment variable for API key provider
    process.env.ANTHROPIC_API_KEY = 'test-api-key-789';

    // Create a test config with both provider types
    const config = {
      version: '1.0.0',
      providers: [
        {
          id: 'github-copilot',
          name: 'GitHub Copilot',
          baseUrl: 'https://api.githubcopilot.com',
          apiKey: '${GITHUB_COPILOT_TOKEN}',
          authType: 'oauth',
          defaultModel: 'gpt-4',
        },
        {
          id: 'anthropic',
          name: 'Anthropic',
          baseUrl: 'https://api.anthropic.com',
          apiKey: '${ANTHROPIC_API_KEY}',
          authType: 'apiKey',
          defaultModel: 'claude-3-5-sonnet-20241022',
        },
      ],
    };
    await writeFile(configPath, JSON.stringify(config, null, 2));

    // Create credentials file with OAuth token
    const credentials = {
      'github-copilot': {
        provider: 'github-copilot',
        type: 'oauth',
        accessToken: 'test-oauth-token-mixed',
        expiresAt: Date.now() + 3600000,
      } as AuthCredential,
    };
    await writeFile(credentialsPath, JSON.stringify(credentials, null, 2));

    // Load config with custom credentials path
    const loadedConfig = await loadConfigFromFile(configPath, { storePath: credentialsPath });

    // Verify both tokens were loaded correctly
    expect(loadedConfig.providers[0].apiKey).toBe('test-oauth-token-mixed');
    expect(loadedConfig.providers[1].apiKey).toBe('test-api-key-789');

    // Cleanup
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('should throw helpful error when OAuth token not found', async () => {
    // Create a test config with OAuth provider
    const config = {
      version: '1.0.0',
      providers: [
        {
          id: 'github-copilot',
          name: 'GitHub Copilot',
          baseUrl: 'https://api.githubcopilot.com',
          apiKey: '${GITHUB_COPILOT_TOKEN}',
          authType: 'oauth',
          defaultModel: 'gpt-4',
        },
      ],
    };
    await writeFile(configPath, JSON.stringify(config, null, 2));

    // Create empty credentials file
    await writeFile(credentialsPath, JSON.stringify({}, null, 2));

    // Try to load config and expect error with custom credentials path
    await expect(loadConfigFromFile(configPath, { storePath: credentialsPath })).rejects.toThrow(
      /OAuth token for provider 'github-copilot' not found.*ucr auth login github-copilot/,
    );
  });

  it('should throw error when API key environment variable not set', async () => {
    // Make sure the env var is not set
    delete process.env.MISSING_API_KEY;

    // Create a test config with API key provider
    const config = {
      version: '1.0.0',
      providers: [
        {
          id: 'test-provider',
          name: 'Test Provider',
          baseUrl: 'https://api.test.com',
          apiKey: '${MISSING_API_KEY}',
          authType: 'apiKey',
          defaultModel: 'test-model',
        },
      ],
    };
    await writeFile(configPath, JSON.stringify(config, null, 2));

    // Try to load config and expect error
    await expect(loadConfigFromFile(configPath)).rejects.toThrow(
      /Environment variable MISSING_API_KEY is not defined/,
    );
  });

  it('should handle OAuth provider with no placeholder (direct token)', async () => {
    // Create a test config with OAuth provider that has direct token
    const config = {
      version: '1.0.0',
      providers: [
        {
          id: 'github-copilot',
          name: 'GitHub Copilot',
          baseUrl: 'https://api.githubcopilot.com',
          apiKey: 'direct-token-no-placeholder',
          authType: 'oauth',
          defaultModel: 'gpt-4',
        },
      ],
    };
    await writeFile(configPath, JSON.stringify(config, null, 2));

    // Load config - should work without credentials file
    const loadedConfig = await loadConfigFromFile(configPath);

    // Verify the token remains as-is
    expect(loadedConfig.providers[0].apiKey).toBe('direct-token-no-placeholder');
  });

  it('should handle provider without apiKey field', async () => {
    // Create a test config with provider that has no apiKey (e.g., Ollama)
    const config = {
      version: '1.0.0',
      providers: [
        {
          id: 'ollama',
          name: 'Ollama',
          baseUrl: 'http://localhost:11434',
          authType: 'none',
          defaultModel: 'llama2',
        },
      ],
    };
    await writeFile(configPath, JSON.stringify(config, null, 2));

    // Load config
    const loadedConfig = await loadConfigFromFile(configPath);

    // Verify config loaded successfully
    expect(loadedConfig.providers[0].id).toBe('ollama');
    expect(loadedConfig.providers[0].apiKey).toBeUndefined();
  });
});
