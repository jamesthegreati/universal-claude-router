import { BaseTransformer } from '../base.js';
import type { ClaudeCodeRequest, ClaudeCodeResponse, Provider, HttpMethod } from '@ucr/shared';

/**
 * Ollama transformer for local models
 */
export class OllamaTransformer extends BaseTransformer {
  readonly provider = 'ollama';

  async transformRequest(
    request: ClaudeCodeRequest,
    provider: Provider,
  ): Promise<{
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body: unknown;
  }> {
    const url = `${provider.baseUrl}/api/chat`;

    const headers = {
      'Content-Type': 'application/json',
      ...provider.headers,
    };

    // Transform to Ollama format
    const messages: any[] = request.messages.map((msg) => ({
      role: msg.role,
      content: this.extractTextContent(msg.content),
    }));

    // Add system message
    if (request.system) {
      messages.unshift({
        role: 'system',
        content: request.system,
      });
    }

    const body = {
      model: this.getModelName(request, provider),
      messages,
      stream: request.stream || false,
      options: {
        temperature: request.temperature,
        top_p: request.top_p,
        top_k: request.top_k,
        num_predict: request.max_tokens,
      },
    };

    return {
      url,
      method: 'POST' as HttpMethod,
      headers,
      body,
    };
  }

  async transformResponse(response: any, original: ClaudeCodeRequest): Promise<ClaudeCodeResponse> {
    return {
      id: this.generateId(),
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: response.message?.content || '',
        },
      ],
      model: response.model || original.model,
      stop_reason: response.done ? 'end_turn' : null,
      stop_sequence: null,
      usage: {
        input_tokens: response.prompt_eval_count || 0,
        output_tokens: response.eval_count || 0,
      },
    };
  }

  transformStreamChunk(chunk: string): string | null {
    try {
      const parsed = JSON.parse(chunk);
      if (parsed.done) {
        return null;
      }

      return `data: ${JSON.stringify({
        type: 'content_block_delta',
        delta: {
          type: 'text_delta',
          text: parsed.message?.content || '',
        },
      })}\n\n`;
    } catch {
      return null;
    }
  }
}
