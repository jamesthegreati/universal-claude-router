import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import type { UCRConfig } from '@ucr/shared';
import { setupRoutes } from './routes.js';
import { getLogger } from '../utils/logger.js';
import { errorHandler } from '../utils/error.js';

export async function createProxyServer(config: UCRConfig): Promise<FastifyInstance> {
  const logger = getLogger();

  const app = Fastify({
    logger: false, // We use our custom logger
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Add hook to log all requests
  app.addHook('onRequest', async (request, reply) => {
    logger.debug({
      type: 'http_request',
      method: request.method,
      url: request.url,
      headers: request.headers,
    });
  });

  // CORS configuration
  if (config.server?.cors) {
    await app.register(cors, config.server.cors);
  }

  // Rate limiting
  if (config.server?.rateLimit) {
    await app.register(rateLimit, config.server.rateLimit);
  }

  // Add hook to accept any API key (bypass validation)
  // UCR handles the real provider API keys
  app.addHook('preHandler', async (request, reply) => {
    // For /v1/messages endpoint, accept any authorization header
    if (request.url.startsWith('/v1/messages')) {
      const authHeader = request.headers.authorization || request.headers['x-api-key'];

      // If no auth header, add a dummy one
      if (!authHeader) {
        request.headers.authorization = 'Bearer sk-ant-ucr-dummy-key';
      }

      logger.debug({
        type: 'auth_bypass',
        message: 'Accepting request - UCR will handle provider authentication',
      });
    }
  });

  // Setup routes
  await setupRoutes(app, config);

  // Global error handler
  app.setErrorHandler(errorHandler);

  return app;
}

export async function startProxyServer(config: UCRConfig): Promise<FastifyInstance> {
  const app = await createProxyServer(config);
  const logger = getLogger();

  const host = config.server?.host || '127.0.0.1';
  const port = config.server?.port || 3000;

  try {
    await app.listen({ host, port });
    logger.info({
      type: 'server_started',
      host,
      port,
      url: `http://${host}:${port}`,
    });
    return app;
  } catch (error) {
    logger.error({
      type: 'server_start_failed',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
