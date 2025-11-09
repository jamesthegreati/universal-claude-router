import { z } from 'zod';

/**
 * Zod schemas for UCR configuration validation
 */

export const AuthTypeSchema = z.enum(['apiKey', 'bearerToken', 'oauth', 'basic', 'none']);

export const ProviderSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  authType: AuthTypeSchema.optional(),
  defaultModel: z.string().optional(),
  models: z.array(z.string()).optional(),
  enabled: z.boolean().optional().default(true),
  priority: z.number().int().min(0).optional().default(0),
  timeout: z.number().int().min(0).optional(),
  maxRetries: z.number().int().min(0).optional().default(3),
  headers: z.record(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ServerConfigSchema = z.object({
  host: z.string().optional().default('localhost'),
  port: z.number().int().min(1).max(65535).optional().default(3000),
  cors: z
    .object({
      origin: z.union([z.string(), z.array(z.string())]).optional(),
      credentials: z.boolean().optional(),
    })
    .optional(),
  rateLimit: z
    .object({
      max: z.number().int().min(1).optional(),
      timeWindow: z.string().optional(),
    })
    .optional(),
  timeout: z.number().int().min(0).optional(),
});

export const LoggingConfigSchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional().default('info'),
  file: z.string().optional(),
  pretty: z.boolean().optional().default(false),
  requests: z.boolean().optional().default(true),
});

export const RouterConfigSchema = z.object({
  default: z.string().optional(),
  think: z.string().optional(),
  background: z.string().optional(),
  longContext: z.string().optional(),
  webSearch: z.string().optional(),
  image: z.string().optional(),
  tokenThreshold: z.number().int().min(0).optional().default(100000),
  customRouter: z.string().optional(),
});

export const TransformerConfigSchema = z.object({
  provider: z.string(),
  enabled: z.boolean().optional().default(true),
  options: z.record(z.unknown()).optional(),
});

export const UCRConfigSchema = z.object({
  version: z.string().optional().default('1.0.0'),
  server: ServerConfigSchema.optional(),
  logging: LoggingConfigSchema.optional(),
  providers: z.array(ProviderSchema).min(1),
  router: RouterConfigSchema.optional(),
  transformers: z.array(TransformerConfigSchema).optional(),
  auth: z
    .object({
      storePath: z.string().optional(),
      encryption: z.boolean().optional().default(true),
    })
    .optional(),
  features: z
    .object({
      costTracking: z.boolean().optional().default(true),
      analytics: z.boolean().optional().default(true),
      healthChecks: z.boolean().optional().default(true),
      autoDiscovery: z.boolean().optional().default(true),
    })
    .optional(),
});

export type UCRConfigInput = z.input<typeof UCRConfigSchema>;
export type UCRConfigOutput = z.output<typeof UCRConfigSchema>;
