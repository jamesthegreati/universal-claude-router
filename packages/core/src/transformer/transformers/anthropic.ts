import { BaseTransformer } from '../base.js';
import type { ClaudeCodeRequest, ClaudeCodeResponse, Provider, HttpMethod } from '@ucr/shared';

/**
 * Anthropic transformer (pass-through since Claude Code uses Anthropic format)
 */
export class AnthropicTransformer extends BaseTransformer {
  readonly provider = 'anthropic';

  async transformRequest(
    request: ClaudeCodeRequest,
    provider: Provider,
  ): Promise<{
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body: unknown;
  }> {
    const url = `${provider.baseUrl}/v1/messages`;

    const headers = {
      'anthropic-version': '2023-06-01',
      ...this.buildAuthHeader(provider),
      ...provider.headers,
    };

    // Pass through the request as-is (Claude Code format)
    return {
      url,
      method: 'POST' as HttpMethod,
      headers,
      body: request,
    };
  }

  async transformResponse(
    response: unknown,
    original: ClaudeCodeRequest,
  ): Promise<ClaudeCodeResponse> {
    // Response is already in Claude Code format
    return response as ClaudeCodeResponse;
  }

  transformStreamChunk(chunk: unknown): string | null {
    // Anthropic streaming format is compatible with Claude Code
    if (typeof chunk === 'string') {
      return chunk;
    }
    return null;
  }
}
