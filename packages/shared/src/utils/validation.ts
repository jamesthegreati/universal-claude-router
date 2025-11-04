import type { Provider, UCRConfig, ClaudeCodeRequest } from '../types';

/**
 * Validation error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate provider configuration
 */
export function validateProvider(provider: Provider): void {
  if (!provider.id) {
    throw new ValidationError('Provider ID is required', 'id', 'REQUIRED');
  }

  if (!provider.name) {
    throw new ValidationError('Provider name is required', 'name', 'REQUIRED');
  }

  if (!provider.baseUrl) {
    throw new ValidationError('Provider baseUrl is required', 'baseUrl', 'REQUIRED');
  }

  // Validate URL format
  try {
    new URL(provider.baseUrl);
  } catch {
    throw new ValidationError(
      'Provider baseUrl must be a valid URL',
      'baseUrl',
      'INVALID_URL'
    );
  }

  if (provider.priority !== undefined && provider.priority < 0) {
    throw new ValidationError(
      'Provider priority must be >= 0',
      'priority',
      'INVALID_VALUE'
    );
  }

  if (provider.timeout !== undefined && provider.timeout < 0) {
    throw new ValidationError(
      'Provider timeout must be >= 0',
      'timeout',
      'INVALID_VALUE'
    );
  }

  if (provider.maxRetries !== undefined && provider.maxRetries < 0) {
    throw new ValidationError(
      'Provider maxRetries must be >= 0',
      'maxRetries',
      'INVALID_VALUE'
    );
  }
}

/**
 * Validate UCR configuration
 */
export function validateConfig(config: UCRConfig): void {
  if (!config.providers || config.providers.length === 0) {
    throw new ValidationError(
      'At least one provider is required',
      'providers',
      'REQUIRED'
    );
  }

  // Validate each provider
  for (const provider of config.providers) {
    try {
      validateProvider(provider);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Provider '${provider.id}': ${error.message}`,
          `providers.${provider.id}.${error.field}`,
          error.code
        );
      }
      throw error;
    }
  }

  // Check for duplicate provider IDs
  const providerIds = new Set<string>();
  for (const provider of config.providers) {
    if (providerIds.has(provider.id)) {
      throw new ValidationError(
        `Duplicate provider ID: ${provider.id}`,
        'providers',
        'DUPLICATE_ID'
      );
    }
    providerIds.add(provider.id);
  }

  // Validate server config
  if (config.server) {
    if (config.server.port !== undefined) {
      if (config.server.port < 1 || config.server.port > 65535) {
        throw new ValidationError(
          'Server port must be between 1 and 65535',
          'server.port',
          'INVALID_VALUE'
        );
      }
    }

    if (config.server.timeout !== undefined && config.server.timeout < 0) {
      throw new ValidationError(
        'Server timeout must be >= 0',
        'server.timeout',
        'INVALID_VALUE'
      );
    }
  }

  // Validate router config
  if (config.router) {
    const { tokenThreshold } = config.router;
    if (tokenThreshold !== undefined && tokenThreshold < 0) {
      throw new ValidationError(
        'Router tokenThreshold must be >= 0',
        'router.tokenThreshold',
        'INVALID_VALUE'
      );
    }
  }
}

/**
 * Validate Claude Code request
 */
export function validateClaudeCodeRequest(request: ClaudeCodeRequest): void {
  if (!request.model) {
    throw new ValidationError('Model is required', 'model', 'REQUIRED');
  }

  if (!request.messages || request.messages.length === 0) {
    throw new ValidationError('Messages are required', 'messages', 'REQUIRED');
  }

  // Validate messages
  for (let i = 0; i < request.messages.length; i++) {
    const message = request.messages[i];

    if (!message.role) {
      throw new ValidationError(
        `Message at index ${i} is missing role`,
        `messages[${i}].role`,
        'REQUIRED'
      );
    }

    if (message.role !== 'user' && message.role !== 'assistant') {
      throw new ValidationError(
        `Message at index ${i} has invalid role: ${message.role}`,
        `messages[${i}].role`,
        'INVALID_VALUE'
      );
    }

    if (!message.content) {
      throw new ValidationError(
        `Message at index ${i} is missing content`,
        `messages[${i}].content`,
        'REQUIRED'
      );
    }
  }

  // Validate optional parameters
  if (request.max_tokens !== undefined && request.max_tokens < 1) {
    throw new ValidationError(
      'max_tokens must be >= 1',
      'max_tokens',
      'INVALID_VALUE'
    );
  }

  if (request.temperature !== undefined) {
    if (request.temperature < 0 || request.temperature > 2) {
      throw new ValidationError(
        'temperature must be between 0 and 2',
        'temperature',
        'INVALID_VALUE'
      );
    }
  }

  if (request.top_p !== undefined) {
    if (request.top_p < 0 || request.top_p > 1) {
      throw new ValidationError(
        'top_p must be between 0 and 1',
        'top_p',
        'INVALID_VALUE'
      );
    }
  }

  if (request.top_k !== undefined && request.top_k < 0) {
    throw new ValidationError('top_k must be >= 0', 'top_k', 'INVALID_VALUE');
  }
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid API key format
 */
export function isValidApiKey(apiKey: string): boolean {
  // Basic validation: non-empty, no whitespace, reasonable length
  return (
    apiKey.length > 0 &&
    apiKey.length < 1000 &&
    !/\s/.test(apiKey)
  );
}

/**
 * Sanitize error message for safe display
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}
