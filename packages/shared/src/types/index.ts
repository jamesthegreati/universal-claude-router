import { z } from 'zod';

/**
 * Task types for intelligent routing
 */
export enum TaskType {
  DEFAULT = 'default',
  THINK = 'think',
  BACKGROUND = 'background',
  LONG_CONTEXT = 'longContext',
  WEB_SEARCH = 'webSearch',
  IMAGE = 'image',
}

/**
 * Provider authentication types
 */
export enum AuthType {
  API_KEY = 'apiKey',
  BEARER_TOKEN = 'bearerToken',
  OAUTH = 'oauth',
  BASIC = 'basic',
  NONE = 'none',
}

/**
 * HTTP methods
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

/**
 * Authentication credential
 */
export interface AuthCredential {
  provider: string;
  type: AuthType;
  apiKey?: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Model metadata
 */
export interface ModelMetadata {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  maxOutputTokens?: number;
  description?: string;
  tags?: string[];
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
  id: string;
  name: string;
  baseUrl: string;
  authType: AuthType;
  models: ModelMetadata[];
  supportsStreaming: boolean;
  requiresAuth: boolean;
  description?: string;
  website?: string;
  documentation?: string;
  // Google-specific
  projectId?: string;
  location?: string;
  // Mistral-specific
  safePrompt?: boolean;
  // OpenRouter-specific
  siteUrl?: string;
  siteName?: string;
  transforms?: string[];
  route?: string;
  // Perplexity-specific
  searchDomainFilter?: string[];
  searchRecencyFilter?: string;
  returnImages?: boolean;
  returnRelatedQuestions?: boolean;
  // Replicate-specific
  modelVersion?: string;
  // Together-specific
  repetitionPenalty?: number;
  // GitHub Copilot-specific
  editorVersion?: string;
  pluginVersion?: string;
  userAgent?: string;
  // Generic metadata
  [key: string]: unknown;
}

/**
 * Provider configuration
 */
export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  authType?: AuthType;
  defaultModel?: string;
  models?: string[];
  enabled?: boolean;
  priority?: number;
  timeout?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  metadata?: ProviderMetadata;
}

/**
 * Transformer configuration
 */
export interface TransformerConfig {
  provider: string;
  enabled?: boolean;
  options?: Record<string, unknown>;
}

/**
 * Router configuration for task-based routing
 */
export interface RouterConfig {
  default?: string;
  think?: string;
  background?: string;
  longContext?: string;
  webSearch?: string;
  image?: string;
  tokenThreshold?: number;
  customRouter?: string;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  host?: string;
  port?: number;
  cors?: {
    origin?: string | string[];
    credentials?: boolean;
  };
  rateLimit?: {
    max?: number;
    timeWindow?: string;
  };
  timeout?: number;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  file?: string;
  pretty?: boolean;
  requests?: boolean;
}

/**
 * Main UCR configuration
 */
export interface UCRConfig {
  version?: string;
  server?: ServerConfig;
  logging?: LoggingConfig;
  providers: Provider[];
  router?: RouterConfig;
  transformers?: TransformerConfig[];
  auth?: {
    storePath?: string;
    encryption?: boolean;
  };
  features?: {
    costTracking?: boolean;
    analytics?: boolean;
    healthChecks?: boolean;
    autoDiscovery?: boolean;
  };
}

/**
 * Claude Code API request format
 */
export interface ClaudeCodeMessage {
  role: 'user' | 'assistant';
  content:
    | string
    | Array<{
        type: 'text' | 'image';
        text?: string;
        source?: {
          type: 'base64';
          media_type: string;
          data: string;
        };
      }>;
}

export interface ClaudeCodeRequest {
  model: string;
  messages: ClaudeCodeMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
  stop_sequences?: string[];
  system?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Claude Code API response format
 */
export interface ClaudeCodeResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Transformer interface for API format adaptation
 */
export interface Transformer {
  provider: string;
  transformRequest(
    request: ClaudeCodeRequest,
    provider: Provider,
  ): Promise<{
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body: unknown;
  }>;
  transformResponse(response: unknown, original: ClaudeCodeRequest): Promise<ClaudeCodeResponse>;
  transformStreamChunk?(chunk: unknown): string | null;
  supportsStreaming(): boolean;
}

/**
 * Usage record for cost tracking
 */
export interface UsageRecord {
  id: string;
  timestamp: number;
  provider: string;
  model: string;
  taskType: TaskType;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

/**
 * Custom router function signature
 */
export type CustomRouter = (
  request: ClaudeCodeRequest,
  context: {
    providers: Provider[];
    config: UCRConfig;
    taskType: TaskType;
    tokenCount: number;
  },
) => Promise<string> | string;

/**
 * Request context for middleware
 */
export interface RequestContext {
  id: string;
  timestamp: number;
  request: ClaudeCodeRequest;
  provider?: Provider;
  transformer?: Transformer;
  taskType?: TaskType;
  tokenCount?: number;
  startTime?: number;
  endTime?: number;
  error?: Error;
  usage?: UsageRecord;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  provider: string;
  healthy: boolean;
  latencyMs?: number;
  error?: string;
  timestamp: number;
}

/**
 * Analytics data
 */
export interface Analytics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  providerUsage: Record<string, number>;
  modelUsage: Record<string, number>;
  taskTypeUsage: Record<string, number>;
}

/**
 * Route selection result
 */
export interface RouteResult {
  provider: Provider;
  model: string;
  reason: string;
  taskType: TaskType;
  tokenCount: number;
}
