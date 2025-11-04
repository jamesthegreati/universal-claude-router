import { BaseTransformer } from '../base.js';
import type { ClaudeCodeRequest, ClaudeCodeResponse, Provider, HttpMethod } from '@ucr/shared';

/**
 * Together AI transformer
 * Uses OpenAI-compatible API format
 */
export class TogetherTransformer extends BaseTransformer {
  readonly provider = 'together';

  async transformRequest(
    request: ClaudeCodeRequest,
    provider: Provider,
  ): Promise<{
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body: unknown;
  }> {
    const url = `${provider.baseUrl}/v1/chat/completions`;

    const headers = {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
      ...provider.headers,
    };

    // Transform Claude messages to OpenAI format
    const messages: any[] = request.messages.map((msg) => ({
      role: msg.role,
      content: this.extractTextContent(msg.content),
    }));

    // Add system message if present
    if (request.system) {
      messages.unshift({
        role: 'system',
        content: request.system,
      });
    }

    const body: any = {
      model: this.getModelName(request, provider),
      messages,
      max_tokens: request.max_tokens,
      temperature: request.temperature,
      top_p: request.top_p,
      top_k: request.top_k,
      stream: request.stream || false,
      stop: request.stop_sequences,
    };

    // Together-specific features
    if (provider.metadata?.repetitionPenalty) {
      body.repetition_penalty = provider.metadata.repetitionPenalty;
    }

    return {
      url,
      method: 'POST' as HttpMethod,
      headers,
      body,
    };
  }

  async transformResponse(response: any, original: ClaudeCodeRequest): Promise<ClaudeCodeResponse> {
    const choice = response.choices?.[0];
    if (!choice) {
      throw new Error('Invalid Together AI response: no choices');
    }

    return {
      id: response.id || this.generateId(),
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: choice.message?.content || '',
        },
      ],
      model: response.model,
      stop_reason: this.mapFinishReason(choice.finish_reason),
      stop_sequence: null,
      usage: {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
      },
    };
  }

  transformStreamChunk(chunk: string): string | null {
    if (!chunk.startsWith('data: ')) {
      return null;
    }

    const data = chunk.slice(6).trim();
    if (data === '[DONE]') {
      return null;
    }

    try {
      const parsed = JSON.parse(data);
      const choice = parsed.choices?.[0];
      if (!choice) return null;

      return `data: ${JSON.stringify({
        type: 'content_block_delta',
        delta: {
          type: 'text_delta',
          text: choice.delta?.content || '',
        },
      })}\n\n`;
    } catch {
      return null;
    }
  }

  private mapFinishReason(reason: string | undefined): string {
    switch (reason) {
      case 'stop':
      case 'eos':
        return 'end_turn';
      case 'length':
        return 'max_tokens';
      default:
        return 'end_turn';
    }
  }
}
