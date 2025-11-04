import { BaseTransformer } from '../base.js';
import type { ClaudeCodeRequest, ClaudeCodeResponse, Provider, HttpMethod } from '@ucr/shared';

/**
 * Cohere transformer
 * Supports Command R and Command R+ models
 */
export class CohereTransformer extends BaseTransformer {
  readonly provider = 'cohere';

  async transformRequest(
    request: ClaudeCodeRequest,
    provider: Provider,
  ): Promise<{
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body: unknown;
  }> {
    const url = `${provider.baseUrl}/v1/chat`;

    const headers = {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
      ...provider.headers,
    };

    // Transform messages - Cohere expects chat_history and message separately
    const chatHistory: any[] = [];
    let currentMessage = '';

    for (let i = 0; i < request.messages.length; i++) {
      const msg = request.messages[i];
      const content = this.extractTextContent(msg.content);

      if (i === request.messages.length - 1 && msg.role === 'user') {
        // Last user message
        currentMessage = content;
      } else {
        chatHistory.push({
          role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
          message: content,
        });
      }
    }

    const body: any = {
      model: this.getModelName(request, provider),
      message: currentMessage,
      chat_history: chatHistory.length > 0 ? chatHistory : undefined,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      p: request.top_p,
      k: request.top_k ? Math.floor(request.top_k) : undefined,
      stream: request.stream || false,
    };

    // Add preamble (system message) if present
    if (request.system) {
      body.preamble = request.system;
    }

    return {
      url,
      method: 'POST' as HttpMethod,
      headers,
      body,
    };
  }

  async transformResponse(response: any, original: ClaudeCodeRequest): Promise<ClaudeCodeResponse> {
    if (!response.text) {
      throw new Error('Invalid Cohere response: no text');
    }

    return {
      id: response.generation_id || this.generateId(),
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: response.text,
        },
      ],
      model: original.model,
      stop_reason: this.mapFinishReason(response.finish_reason),
      stop_sequence: null,
      usage: {
        input_tokens: response.meta?.tokens?.input_tokens || 0,
        output_tokens: response.meta?.tokens?.output_tokens || 0,
      },
    };
  }

  transformStreamChunk(chunk: string): string | null {
    try {
      const parsed = JSON.parse(chunk);

      if (parsed.event_type === 'text-generation') {
        return `data: ${JSON.stringify({
          type: 'content_block_delta',
          delta: {
            type: 'text_delta',
            text: parsed.text || '',
          },
        })}\n\n`;
      }

      return null;
    } catch {
      return null;
    }
  }

  private mapFinishReason(reason: string | undefined): string {
    switch (reason) {
      case 'COMPLETE':
        return 'end_turn';
      case 'MAX_TOKENS':
        return 'max_tokens';
      case 'ERROR':
      case 'ERROR_TOXIC':
        return 'stop_sequence';
      default:
        return 'end_turn';
    }
  }
}
