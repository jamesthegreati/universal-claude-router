import type {
  ClaudeCodeRequest,
  Provider,
  UCRConfig,
  RouteResult,
  TaskType,
} from '@ucr/shared';
import { countRequestTokens } from '@ucr/shared';
import { detectTaskType } from './task-detector.js';
import { RouterError } from '../utils/error.js';
import { getLogger } from '../utils/logger.js';

/**
 * Router for selecting providers based on task type and configuration
 */
export class Router {
  private config: UCRConfig;
  private customRouter: Function | null = null;

  constructor(config: UCRConfig) {
    this.config = config;
  }

  /**
   * Route a request to the appropriate provider
   */
  async route(request: ClaudeCodeRequest): Promise<RouteResult> {
    const logger = getLogger();

    // Detect task type
    const taskType = detectTaskType(request);
    const tokenCount = countRequestTokens(request);

    logger.debug({
      type: 'routing',
      taskType,
      tokenCount,
      model: request.model,
    });

    // Try custom router first
    if (this.customRouter && this.config.router?.customRouter) {
      try {
        const providerId = await this.customRouter(request, {
          providers: this.config.providers,
          config: this.config,
          taskType,
          tokenCount,
        });

        const provider = this.config.providers.find((p) => p.id === providerId);
        if (provider && provider.enabled !== false) {
          return {
            provider,
            model: provider.defaultModel || request.model,
            reason: 'custom_router',
            taskType,
            tokenCount,
          };
        }
      } catch (error) {
        logger.warn({
          type: 'custom_router_error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Use task-based routing
    const provider = this.selectProviderForTask(taskType, tokenCount);
    if (!provider) {
      throw new RouterError('No suitable provider found for request', {
        taskType,
        tokenCount,
      });
    }

    return {
      provider,
      model: provider.defaultModel || request.model,
      reason: `task_routing:${taskType}`,
      taskType,
      tokenCount,
    };
  }

  /**
   * Select provider based on task type
   */
  private selectProviderForTask(
    taskType: TaskType,
    tokenCount: number
  ): Provider | null {
    const router = this.config.router || {};
    const enabledProviders = this.config.providers.filter(
      (p) => p.enabled !== false
    );

    // Check if we need a long context model
    const needsLongContext =
      taskType === 'longContext' ||
      tokenCount > (router.tokenThreshold || 100000);

    // Get provider ID for this task type
    let providerId: string | undefined;

    if (needsLongContext && router.longContext) {
      providerId = router.longContext;
    } else {
      switch (taskType) {
        case 'think':
          providerId = router.think;
          break;
        case 'background':
          providerId = router.background;
          break;
        case 'webSearch':
          providerId = router.webSearch;
          break;
        case 'image':
          providerId = router.image;
          break;
        default:
          providerId = router.default;
      }
    }

    // Find provider by ID
    if (providerId) {
      const provider = enabledProviders.find((p) => p.id === providerId);
      if (provider) {
        return provider;
      }
    }

    // Fallback: select by priority
    return this.selectByPriority(enabledProviders);
  }

  /**
   * Select provider by priority
   */
  private selectByPriority(providers: Provider[]): Provider | null {
    if (providers.length === 0) {
      return null;
    }

    // Sort by priority (higher first)
    const sorted = [...providers].sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityB - priorityA;
    });

    return sorted[0];
  }

  /**
   * Load custom router from file
   */
  async loadCustomRouter(scriptPath: string): Promise<void> {
    try {
      const module = await import(scriptPath);
      this.customRouter = module.default || module.router;
      getLogger().info({ type: 'custom_router_loaded', scriptPath });
    } catch (error) {
      throw new RouterError(`Failed to load custom router: ${error}`, {
        scriptPath,
      });
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: UCRConfig): void {
    this.config = config;
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): Provider[] {
    return this.config.providers.filter((p) => p.enabled !== false);
  }
}
