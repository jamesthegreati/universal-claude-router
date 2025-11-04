import type {
  Transformer,
  ClaudeCodeRequest,
  ClaudeCodeResponse,
  Provider,
  HttpMethod,
} from '@ucr/shared';

/**
 * Base transformer abstract class
 */
export abstract class BaseTransformer implements Transformer {
  abstract readonly provider: string;

  /**
   * Transform Claude Code request to provider format
   */
  abstract transformRequest(
    request: ClaudeCodeRequest,
    provider: Provider
  ): Promise<{
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body: unknown;
  }>;

  /**
   * Transform provider response to Claude Code format
   */
  abstract transformResponse(
    response: unknown,
    original: ClaudeCodeRequest
  ): Promise<ClaudeCodeResponse>;

  /**
   * Transform streaming chunk (optional)
   */
  transformStreamChunk?(chunk: unknown): string | null;

  /**
   * Check if provider supports streaming
   */
  supportsStreaming(): boolean {
    return !!this.transformStreamChunk;
  }

  /**
   * Helper: Build authorization header
   */
  protected buildAuthHeader(provider: Provider): Record<string, string> {
    if (!provider.apiKey) {
      return {};
    }

    switch (provider.authType) {
      case 'bearerToken':
        return { Authorization: `Bearer ${provider.apiKey}` };
      case 'apiKey':
      default:
        return { 'x-api-key': provider.apiKey };
    }
  }

  /**
   * Helper: Extract text content from Claude messages
   */
  protected extractTextContent(
    content: ClaudeCodeRequest['messages'][0]['content']
  ): string {
    if (typeof content === 'string') {
      return content;
    }

    return content
      .map((part) => (part.type === 'text' ? part.text : ''))
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Helper: Generate unique ID
   */
  protected generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Extract model name from request
   */
  protected getModelName(
    request: ClaudeCodeRequest,
    provider: Provider
  ): string {
    // Use default model if specified
    if (provider.defaultModel) {
      return provider.defaultModel;
    }

    // Use request model
    return request.model;
  }
}
