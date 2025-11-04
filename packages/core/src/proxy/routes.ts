import type { FastifyInstance } from 'fastify';
import type { ClaudeCodeRequest, UCRConfig } from '@ucr/shared';
import { validateClaudeCodeRequest } from '@ucr/shared';
import { Router } from '../router/router.js';
import { getTransformerRegistry } from '../transformer/registry.js';
import { makeHttpRequest, makeStreamingRequest } from '../utils/http.js';
import { RequestValidationError, ProviderError } from '../utils/error.js';
import { getLogger } from '../utils/logger.js';

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
        throw new ProviderError(
          `No transformer found for provider: ${provider.id}`,
          provider.id
        );
      }

      // Transform request
      const transformedRequest = await transformer.transformRequest(
        claudeRequest,
        provider
      );

      // Handle streaming
      if (claudeRequest.stream && transformer.supportsStreaming()) {
        const stream = await makeStreamingRequest({
          method: transformedRequest.method,
          url: transformedRequest.url,
          headers: transformedRequest.headers,
          body: transformedRequest.body,
          timeout: provider.timeout,
        });

        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });

        const reader = stream.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const transformed = transformer.transformStreamChunk?.(chunk);
            if (transformed) {
              reply.raw.write(transformed);
            }
          }
        } finally {
          reply.raw.end();
        }

        const duration = Date.now() - startTime;
        logger.info({
          type: 'request_completed',
          requestId,
          provider: provider.id,
          streaming: true,
          duration,
        });

        return reply;
      }

      // Handle non-streaming
      const response = await makeHttpRequest({
        method: transformedRequest.method,
        url: transformedRequest.url,
        headers: transformedRequest.headers,
        body: transformedRequest.body,
        timeout: provider.timeout,
      });

      if (response.statusCode >= 400) {
        throw new ProviderError(
          `Provider returned error: ${JSON.stringify(response.body)}`,
          provider.id,
          response.statusCode
        );
      }

      // Transform response
      const claudeResponse = await transformer.transformResponse(
        response.body,
        claudeRequest
      );

      const duration = Date.now() - startTime;
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
        enabled: p.enabled !== false,
        models: p.models || [],
      })),
    };
  });

  /**
   * Get configuration
   */
  app.get('/v1/config', async () => {
    return {
      version: config.version,
      providers: config.providers.length,
      router: config.router,
      features: config.features,
    };
  });
}
