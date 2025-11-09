import { request, Agent } from 'undici';
import type { HttpMethod } from '@ucr/shared';
import { TimeoutError, ProviderError } from './error.js';

// Global connection pool for maximum performance
const agent = new Agent({
  connections: 100, // Max concurrent connections
  pipelining: 10, // Requests per connection
  keepAliveTimeout: 60000, // 60 seconds
  keepAliveMaxTimeout: 600000, // 10 minutes
  bodyTimeout: 30000,
  headersTimeout: 10000,
  maxCachedSessions: 100,
});

export interface HttpRequestOptions {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  signal?: AbortSignal;
}

export interface HttpResponse<T = unknown> {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: T;
}

/**
 * Make HTTP request with timeout and error handling
 */
export async function makeHttpRequest<T = unknown>(
  options: HttpRequestOptions,
): Promise<HttpResponse<T>> {
  const { method, url, headers = {}, body, timeout = 30000, signal } = options;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

  // Combine signals
  const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  try {
    const response = await request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: combinedSignal,
      dispatcher: agent,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Read the response body as text first to avoid stream consumption issues
    const responseText = await response.body.text();

    let responseBody: T;
    try {
      responseBody = JSON.parse(responseText) as T;
    } catch (jsonError) {
      throw new ProviderError(
        `Provider returned invalid JSON: ${responseText.substring(0, 200)}`,
        new URL(url).hostname,
        response.statusCode,
      );
    }

    return {
      statusCode: response.statusCode,
      headers: response.headers as Record<string, string | string[]>,
      body: responseBody,
    };
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new TimeoutError(`Request to ${url} timed out after ${timeout}ms`);
      }

      throw new ProviderError(`HTTP request failed: ${error.message}`, new URL(url).hostname, 500);
    }

    throw error;
  }
}

/**
 * Make streaming HTTP request
 */
export async function makeStreamingRequest(options: HttpRequestOptions): Promise<ReadableStream> {
  const { method, url, headers = {}, body, timeout = 30000, signal } = options;

  const controller = new AbortController();
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : null;

  const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  try {
    const response = await request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: combinedSignal,
      dispatcher: agent,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (response.statusCode >= 400) {
      // Read the response body as text first to avoid stream consumption issues
      const errorText = await response.body.text();
      let errorBody: any;
      try {
        errorBody = JSON.parse(errorText);
      } catch {
        errorBody = { message: errorText };
      }
      throw new ProviderError(
        `Provider returned error: ${JSON.stringify(errorBody)}`,
        new URL(url).hostname,
        response.statusCode,
      );
    }

    return response.body as unknown as ReadableStream;
  } catch (error) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`Streaming request to ${url} timed out`);
    }

    throw error;
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
