import type { ClaudeCodeRequest, Provider, UCRConfig, RouteResult } from '@ucr/shared';
import { getLogger } from '../utils/logger.js';
import { Router } from './router.js';

/**
 * Graceful degradation router
 * Falls back to simpler routing strategies when optimal routing fails
 */
export class GracefulDegradationRouter {
  private router: Router;
  private config: UCRConfig;

  constructor(config: UCRConfig) {
    this.config = config;
    this.router = new Router(config);
  }

  /**
   * Route request with fallback strategies
   */
  async routeWithFallback(request: ClaudeCodeRequest): Promise<RouteResult> {
    const logger = getLogger();

    try {
      // Try optimal routing
      return await this.optimalRoute(request);
    } catch (error) {
      logger.warn({
        type: 'optimal_routing_failed',
        error: error instanceof Error ? error.message : String(error),
      });

      try {
        // Fall back to simple routing
        return await this.simpleRoute(request);
      } catch (fallbackError) {
        logger.error({
          type: 'simple_routing_failed',
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });

        // Final fallback: use any available provider
        return this.emergencyRoute(request);
      }
    }
  }

  /**
   * Optimal routing with all features enabled
   */
  private async optimalRoute(request: ClaudeCodeRequest): Promise<RouteResult> {
    // Use full router with caching, task detection, etc.
    return await this.router.route(request);
  }

  /**
   * Simple routing without advanced features
   */
  private async simpleRoute(request: ClaudeCodeRequest): Promise<RouteResult> {
    const logger = getLogger();

    logger.info({
      type: 'using_simple_routing',
      reason: 'optimal_routing_failed',
    });

    // Get enabled providers
    const enabledProviders = this.config.providers.filter((p) => p.enabled !== false);

    if (enabledProviders.length === 0) {
      throw new Error('No enabled providers available');
    }

    // Use default provider if configured
    if (this.config.router?.default) {
      const defaultProvider = enabledProviders.find((p) => p.id === this.config.router?.default);
      if (defaultProvider) {
        return {
          provider: defaultProvider,
          model: defaultProvider.defaultModel || request.model,
          reason: 'simple_routing:default',
          taskType: 'default' as any,
          tokenCount: 0,
        };
      }
    }

    // Fall back to highest priority provider
    const provider = this.selectByPriority(enabledProviders);

    return {
      provider,
      model: provider.defaultModel || request.model,
      reason: 'simple_routing:priority',
      taskType: 'default' as any,
      tokenCount: 0,
    };
  }

  /**
   * Emergency routing - use any available provider
   */
  private emergencyRoute(request: ClaudeCodeRequest): RouteResult {
    const logger = getLogger();

    logger.warn({
      type: 'using_emergency_routing',
      reason: 'all_routing_failed',
    });

    const enabledProviders = this.config.providers.filter((p) => p.enabled !== false);

    if (enabledProviders.length === 0) {
      throw new Error('No providers available for emergency routing');
    }

    // Use first available provider
    const provider = enabledProviders[0];

    return {
      provider,
      model: provider.defaultModel || request.model,
      reason: 'emergency_routing',
      taskType: 'default' as any,
      tokenCount: 0,
    };
  }

  /**
   * Select provider by priority
   */
  private selectByPriority(providers: Provider[]): Provider {
    const sorted = [...providers].sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA;
    });

    return sorted[0];
  }

  /**
   * Update configuration
   */
  updateConfig(config: UCRConfig): void {
    this.config = config;
    this.router.updateConfig(config);
  }
}
