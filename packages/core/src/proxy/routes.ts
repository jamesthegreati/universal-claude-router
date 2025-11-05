import type { FastifyInstance } from 'fastify';
import type { ClaudeCodeRequest, UCRConfig } from '@ucr/shared';
import { validateClaudeCodeRequest } from '@ucr/shared';
import { Router } from '../router/router.js';
import { getTransformerRegistry } from '../transformer/registry.js';
import { makeHttpRequest, makeStreamingRequest } from '../utils/http.js';
import { RequestValidationError, ProviderError } from '../utils/error.js';
import { getLogger } from '../utils/logger.js';
import { responseCache } from '../cache/response-cache.js';
import { cacheManager } from '../cache/cache-manager.js';
import { metadataCache } from '../cache/metadata-cache.js';
import { metrics } from '../utils/metrics.js';

/**
 * Setup API routes
 */
export async function setupRoutes(app: FastifyInstance, config: UCRConfig) {
  const router = new Router(config);
  const transformerRegistry = getTransformerRegistry();
  const logger = getLogger();

  /**
   * Main proxy endpoint for Claude Code API
   */
  app.post('/v1/messages', async (request, reply) => {
    const startTime = Date.now();
    const requestId = request.id;
    let cacheHit = false;
    let isError = false;

    try {
      // Parse and validate request
      const claudeRequest = request.body as ClaudeCodeRequest;
      validateClaudeCodeRequest(claudeRequest);

      logger.info({
        type: 'request_received',
        requestId,
        model: claudeRequest.model,
        stream: claudeRequest.stream,
      });

      // Check cache for non-streaming requests
      if (!claudeRequest.stream) {
        const cachedResponse = await responseCache.get(claudeRequest);
        if (cachedResponse) {
          cacheHit = true;
          const duration = Date.now() - startTime;
          metrics.recordRequest(duration, true, false, false);
          logger.info({
            type: 'cache_hit',
            requestId,
            duration,
          });
          return cachedResponse;
        }
      }

      // Route the request
      const routeResult = await router.route(claudeRequest);
      const { provider, model, taskType, reason } = routeResult;

      logger.info({
        type: 'route_selected',
        requestId,
        provider: provider.id,
        model,
        taskType,
        reason,
      });

      // Get transformer
      const transformer = transformerRegistry.get(provider.id);
      if (!transformer) {
        throw new ProviderError(`No transformer found for provider: ${provider.id}`, provider.id);
      }

      // Transform request
      const transformedRequest = await transformer.transformRequest(claudeRequest, provider);

      // Handle streaming
      if (claudeRequest.stream && transformer.supportsStreaming()) {
        const stream = await makeStreamingRequest({
          url: transformedRequest.url,
          method: transformedRequest.method,
          headers: transformedRequest.headers,
          body: transformedRequest.body,
          provider,
          transformer,
        });

        const duration = Date.now() - startTime;
        metrics.recordRequest(duration, false, true, false);

        logger.info({
          type: 'streaming_started',
          requestId,
          provider: provider.id,
          duration,
        });

        reply.header('Content-Type', 'text/event-stream');
        reply.header('Cache-Control', 'no-cache');
        reply.header('Connection', 'keep-alive');

        return reply.send(stream);
      }

      // Non-streaming request
      const response = await makeHttpRequest({
        url: transformedRequest.url,
        method: transformedRequest.method,
        headers: transformedRequest.headers,
        body: transformedRequest.body,
        provider,
      });

      // Transform response
      const claudeResponse = await transformer.transformResponse(response, claudeRequest);

      // Cache the response
      if (!claudeRequest.stream) {
        await responseCache.set(claudeRequest, claudeResponse);
      }

      const duration = Date.now() - startTime;
      metrics.recordRequest(duration, false, false, false);

      logger.info({
        type: 'request_completed',
        requestId,
        provider: provider.id,
        streaming: false,
        duration,
        inputTokens: claudeResponse.usage.input_tokens,
        outputTokens: claudeResponse.usage.output_tokens,
      });

      return claudeResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      // Safely access stream property with proper error handling
      let isStreaming = false;
      try {
        const claudeRequest = request.body as ClaudeCodeRequest;
        isStreaming = claudeRequest?.stream || false;
      } catch (parseError) {
        // Ignore parsing errors, default to non-streaming
      }
      metrics.recordRequest(duration, cacheHit, isStreaming, true);
      logger.error({
        type: 'request_failed',
        requestId,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  });

  /**
   * List available providers
   */
  app.get('/v1/providers', async () => {
    return {
      providers: config.providers.map((p) => ({
        id: p.id,
        name: p.name,
        enabled: p.enabled,
        priority: p.priority,
        defaultModel: p.defaultModel,
      })),
    };
  });

  /**
   * Health check endpoint
   */
  app.get('/health', async () => {
    return {
      status: 'ok',
      version: config.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  });

  /**
   * Metrics endpoint
   */
  app.get('/metrics', async () => {
    return metrics.getStats();
  });

  /**
   * Cache stats endpoint
   */
  app.get('/cache/stats', async () => {
    return {
      response: await responseCache.getStats(),
      metadata: await metadataCache.getStats(),
    };
  });

  /**
   * Clear caches
   */
  app.delete('/cache', async () => {
    await cacheManager.clearAll();
    return { success: true, message: 'All caches cleared' };
  });
}
