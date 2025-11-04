/**
 * Base error class for UCR errors
 */
export class UCRError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'UCRError';
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        details: this.details,
      },
    };
  }
}

/**
 * Configuration error
 */
export class ConfigError extends UCRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', 500, details);
    this.name = 'ConfigError';
  }
}

/**
 * Provider error
 */
export class ProviderError extends UCRError {
  constructor(
    message: string,
    public provider: string,
    statusCode: number = 502,
    details?: Record<string, unknown>
  ) {
    super(message, 'PROVIDER_ERROR', statusCode, { ...details, provider });
    this.name = 'ProviderError';
  }
}

/**
 * Authentication error
 */
export class AuthError extends UCRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTH_ERROR', 401, details);
    this.name = 'AuthError';
  }
}

/**
 * Validation error
 */
export class RequestValidationError extends UCRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'RequestValidationError';
  }
}

/**
 * Router error
 */
export class RouterError extends UCRError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ROUTER_ERROR', 500, details);
    this.name = 'RouterError';
  }
}

/**
 * Transformer error
 */
export class TransformerError extends UCRError {
  constructor(
    message: string,
    public transformer: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'TRANSFORMER_ERROR', 500, { ...details, transformer });
    this.name = 'TransformerError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends UCRError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends UCRError {
  constructor(message: string = 'Request timeout') {
    super(message, 'TIMEOUT_ERROR', 504);
    this.name = 'TimeoutError';
  }
}

/**
 * Convert unknown error to UCRError
 */
export function normalizeError(error: unknown): UCRError {
  if (error instanceof UCRError) {
    return error;
  }

  if (error instanceof Error) {
    return new UCRError(error.message, 'INTERNAL_ERROR', 500, {
      originalError: error.name,
    });
  }

  return new UCRError('An unknown error occurred', 'UNKNOWN_ERROR', 500);
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('EAI_AGAIN') ||
      error.message.includes('socket hang up')
    );
  }
  return false;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isNetworkError(error)) {
    return true;
  }

  if (error instanceof ProviderError) {
    // Retry on 5xx errors and some 4xx errors
    return (
      error.statusCode >= 500 ||
      error.statusCode === 408 || // Request Timeout
      error.statusCode === 429 // Rate Limit (with backoff)
    );
  }

  return false;
}
