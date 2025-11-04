import pino from 'pino';
import type { LoggingConfig } from '@ucr/shared';

let logger: pino.Logger | null = null;

/**
 * Initialize logger with configuration
 */
export function initLogger(config: LoggingConfig = {}): pino.Logger {
  const options: pino.LoggerOptions = {
    level: config.level || 'info',
  };

  // Pretty printing for development
  if (config.pretty) {
    logger = pino({
      ...options,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    });
  }
  // File logging
  else if (config.file) {
    logger = pino(options, pino.destination(config.file));
  }
  // Default stdout logging
  else {
    logger = pino(options);
  }

  return logger;
}

/**
 * Get logger instance
 */
export function getLogger(): pino.Logger {
  if (!logger) {
    logger = initLogger();
  }
  return logger;
}

/**
 * Log request
 */
export function logRequest(
  method: string,
  url: string,
  statusCode: number,
  duration: number,
): void {
  const log = getLogger();
  log.info({
    type: 'request',
    method,
    url,
    statusCode,
    duration,
  });
}

/**
 * Log error
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  const log = getLogger();
  log.error({
    type: 'error',
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...context,
  });
}

/**
 * Log provider request
 */
export function logProviderRequest(
  provider: string,
  model: string,
  duration: number,
  success: boolean,
  error?: string,
): void {
  const log = getLogger();
  log.info({
    type: 'provider_request',
    provider,
    model,
    duration,
    success,
    error,
  });
}

/**
 * Create child logger with context
 */
export function createChildLogger(context: Record<string, unknown>): pino.Logger {
  return getLogger().child(context);
}
