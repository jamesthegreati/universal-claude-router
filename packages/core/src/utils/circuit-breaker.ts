import CircuitBreaker from 'opossum';
import { getLogger } from './logger.js';
import type { HttpRequestOptions, HttpResponse } from './http.js';

/**
 * Circuit breaker configuration for provider requests
 */
export interface CircuitBreakerConfig {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  rollingCountTimeout?: number;
  rollingCountBuckets?: number;
  name?: string;
}

/**
 * Create a circuit breaker for HTTP requests
 */
export function createCircuitBreaker<T = unknown>(
  fn: (options: HttpRequestOptions) => Promise<HttpResponse<T>>,
  config?: CircuitBreakerConfig,
): CircuitBreaker<[HttpRequestOptions], HttpResponse<T>> {
  const logger = getLogger();

  const breaker = new CircuitBreaker(fn, {
    timeout: config?.timeout || 30000, // 30 seconds
    errorThresholdPercentage: config?.errorThresholdPercentage || 50, // 50% error rate
    resetTimeout: config?.resetTimeout || 30000, // 30 seconds
    rollingCountTimeout: config?.rollingCountTimeout || 10000, // 10 seconds
    rollingCountBuckets: config?.rollingCountBuckets || 10,
    name: config?.name || 'http-request',
  });

  // Event handlers for monitoring
  breaker.on('open', () => {
    logger.warn({
      type: 'circuit_breaker_open',
      name: config?.name || 'http-request',
      message: 'Circuit breaker opened due to errors',
    });
  });

  breaker.on('halfOpen', () => {
    logger.info({
      type: 'circuit_breaker_half_open',
      name: config?.name || 'http-request',
      message: 'Circuit breaker half-open, testing requests',
    });
  });

  breaker.on('close', () => {
    logger.info({
      type: 'circuit_breaker_closed',
      name: config?.name || 'http-request',
      message: 'Circuit breaker closed, requests flowing normally',
    });
  });

  breaker.on('timeout', () => {
    logger.warn({
      type: 'circuit_breaker_timeout',
      name: config?.name || 'http-request',
    });
  });

  breaker.on('reject', () => {
    logger.warn({
      type: 'circuit_breaker_reject',
      name: config?.name || 'http-request',
      message: 'Request rejected by circuit breaker',
    });
  });

  breaker.on('failure', (error) => {
    logger.error({
      type: 'circuit_breaker_failure',
      name: config?.name || 'http-request',
      error: error instanceof Error ? error.message : String(error),
    });
  });

  return breaker;
}

/**
 * Circuit breaker manager for managing multiple breakers
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker<any, any>>();

  /**
   * Get or create a circuit breaker for a provider
   */
  getOrCreate<T = unknown>(
    providerId: string,
    fn: (options: HttpRequestOptions) => Promise<HttpResponse<T>>,
    config?: CircuitBreakerConfig,
  ): CircuitBreaker<[HttpRequestOptions], HttpResponse<T>> {
    let breaker = this.breakers.get(providerId);

    if (!breaker) {
      breaker = createCircuitBreaker(fn, {
        ...config,
        name: `provider-${providerId}`,
      });
      this.breakers.set(providerId, breaker);
    }

    return breaker;
  }

  /**
   * Get statistics for all circuit breakers
   */
  getStats() {
    const stats: Record<string, any> = {};

    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = {
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        stats: breaker.stats,
      };
    }

    return stats;
  }

  /**
   * Clear all circuit breakers
   */
  clear(): void {
    for (const breaker of this.breakers.values()) {
      breaker.shutdown();
    }
    this.breakers.clear();
  }
}

// Global circuit breaker manager
export const circuitBreakerManager = new CircuitBreakerManager();
