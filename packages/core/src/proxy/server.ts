import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import compress from '@fastify/compress';
import type { UCRConfig } from '@ucr/shared';
import { getLogger, initLogger } from '../utils/logger.js';
import { UCRError } from '../utils/error.js';
import { setupRoutes } from './routes.js';

/**
 * Create and configure Fastify server
 */
export async function createServer(config: UCRConfig) {
  const serverConfig = config.server || {};
  const loggingConfig = config.logging || {};

  // Initialize logger
  const logger = initLogger(loggingConfig);

  // Create Fastify instance with performance optimizations
  const app = Fastify({
    logger: logger as any,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    // Performance optimizations
    disableRequestLogging: loggingConfig.level === 'error' || loggingConfig.level === 'warn',
    trustProxy: true,
    keepAliveTimeout: 72000, // 72 seconds
    connectionTimeout: 30000, // 30 seconds
    bodyLimit: 1048576, // 1MB
    caseSensitive: false,
    ignoreTrailingSlash: true,
  });

  // Register CORS
  await app.register(cors, {
    origin: serverConfig.cors?.origin || '*',
    credentials: serverConfig.cors?.credentials ?? true,
  });

  // Register compression for better network performance
  await app.register(compress, {
    global: true,
    threshold: 1024, // Only compress responses > 1KB
    encodings: ['gzip', 'deflate'],
  });

  // Register rate limiting
  if (serverConfig.rateLimit) {
    await app.register(rateLimit, {
      max: serverConfig.rateLimit.max || 100,
      timeWindow: serverConfig.rateLimit.timeWindow || '1 minute',
    });
  }

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof UCRError) {
      return reply.status(error.statusCode).send(error.toJSON());
    }

    logger.error({
      type: 'server_error',
      error: {
        message: error.message,
        stack: error.stack,
      },
      request: {
        method: request.method,
        url: request.url,
      },
    });

    return reply.status(500).send({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    });
  });

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // Setup main routes
  await setupRoutes(app as any, config);

  return app;
}

/**
 * Start the server
 */
export async function startServer(config: UCRConfig) {
  const serverConfig = config.server || {};
  const host = serverConfig.host || 'localhost';
  const port = serverConfig.port || 3000;

  const app = await createServer(config);

  try {
    await app.listen({ host, port });
    getLogger().info({
      type: 'server_started',
      host,
      port,
      message: `UCR server listening on http://${host}:${port}`,
    });

    return app;
  } catch (error) {
    getLogger().error({
      type: 'server_start_error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
