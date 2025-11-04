import { BaseTransformer } from '../base.js';
import type {
  ClaudeCodeRequest,
  ClaudeCodeResponse,
  Provider,
  HttpMethod,
} from '@ucr/shared';

/**
 * Replicate transformer
 * Supports various open-source models via predictions API
 */
export class ReplicateTransformer extends BaseTransformer {
  readonly provider = 'replicate';

  async transformRequest(
    request: ClaudeCodeRequest,
    provider: Provider
  ): Promise<{
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body: unknown;
  }> {
    const url = `${provider.baseUrl}/v1/predictions`;

    const headers = {
      Authorization: `Token ${provider.apiKey}`,
      'Content-Type': 'application/json',
      ...provider.headers,
    };

    // Build prompt from messages
    const prompt = this.buildPrompt(request);

    const body: any = {
      version: provider.metadata?.modelVersion || this.getModelName(request, provider),
      input: {
        prompt,
        max_tokens: request.max_tokens || 512,
        temperature: request.temperature ?? 0.75,
        top_p: request.top_p ?? 0.9,
        top_k: request.top_k ?? 50,
      },
      stream: request.stream || false,
    };

    // Add system prompt if present
    if (request.system) {
      body.input.system_prompt = request.system;
    }

    return {
      url,
      method: 'POST' as HttpMethod,
      headers,
      body,
    };
  }

  async transformResponse(
    response: any,
    original: ClaudeCodeRequest
  ): Promise<ClaudeCodeResponse> {
    let text = '';

    if (response.output) {
      if (Array.isArray(response.output)) {
        text = response.output.join('');
      } else if (typeof response.output === 'string') {
        text = response.output;
      }
    }

    return {
      id: response.id || this.generateId(),
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text,
        },
      ],
      model: original.model,
      stop_reason: response.status === 'succeeded' ? 'end_turn' : null,
      stop_sequence: null,
      usage: {
        input_tokens: 0, // Replicate doesn't provide token counts
        output_tokens: 0,
      },
    };
  }

  transformStreamChunk(chunk: string): string | null {
    try {
      const parsed = JSON.parse(chunk);
      
      if (parsed.output) {
        const text = Array.isArray(parsed.output)
          ? parsed.output[parsed.output.length - 1]
          : parsed.output;

        return `data: ${JSON.stringify({
          type: 'content_block_delta',
          delta: {
            type: 'text_delta',
            text: text || '',
          },
        })}\n\n`;
      }

      return null;
    } catch {
      return null;
    }
  }

  private buildPrompt(request: ClaudeCodeRequest): string {
    const parts: string[] = [];

    for (const msg of request.messages) {
      const content = this.extractTextContent(msg.content);
      if (msg.role === 'user') {
        parts.push(`User: ${content}`);
      } else {
        parts.push(`Assistant: ${content}`);
      }
    }

    parts.push('Assistant:');
    return parts.join('\n\n');
  }
}
