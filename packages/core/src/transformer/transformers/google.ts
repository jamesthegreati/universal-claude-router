import { BaseTransformer } from '../base.js';
import type { ClaudeCodeRequest, ClaudeCodeResponse, Provider, HttpMethod } from '@ucr/shared';

/**
 * Google Gemini transformer (Vertex AI & AI Studio)
 * Supports both Vertex AI and AI Studio endpoints
 */
export class GoogleTransformer extends BaseTransformer {
  readonly provider = 'google';

  async transformRequest(
    request: ClaudeCodeRequest,
    provider: Provider,
  ): Promise<{
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body: unknown;
  }> {
    const modelName = this.getModelName(request, provider);
    // Check if provider is Vertex AI by validating the full URL pattern
    const isVertexAI =
      provider.baseUrl.startsWith('https://') && provider.baseUrl.endsWith('.googleapis.com');

    // Vertex AI uses generateContent endpoint
    const endpoint = isVertexAI
      ? `${provider.baseUrl}/v1/projects/${provider.metadata?.projectId || 'default'}/locations/${provider.metadata?.location || 'us-central1'}/publishers/google/models/${modelName}:generateContent`
      : `${provider.baseUrl}/v1beta/models/${modelName}:generateContent?key=${provider.apiKey}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...provider.headers,
    };

    if (provider.apiKey) {
      if (isVertexAI) {
        headers['Authorization'] = `Bearer ${provider.apiKey}`;
      } else {
        // AI Studio API key is now in the query param
      }
    }

    // Transform messages to Gemini format
    const contents: any[] = [];

    for (const msg of request.messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: this.extractTextContent(msg.content) }],
      });
    }

    const body: any = {
      contents,
      generationConfig: {
        temperature: request.temperature,
        topP: request.top_p,
        topK: request.top_k,
        maxOutputTokens: request.max_tokens,
      },
    };

    // Add system instruction if present
    if (request.system) {
      body.systemInstruction = {
        parts: [{ text: request.system }],
      };
    }

    return {
      url: endpoint,
      method: 'POST' as HttpMethod,
      headers,
      body,
    };
  }

  async transformResponse(response: any, original: ClaudeCodeRequest): Promise<ClaudeCodeResponse> {
    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new Error('Invalid Google response: no candidates');
    }

    const text = candidate.content?.parts?.map((part: any) => part.text || '').join('') || '';

    return {
      id: this.generateId(),
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text,
        },
      ],
      model: original.model,
      stop_reason: this.mapFinishReason(candidate.finishReason),
      stop_sequence: null,
      usage: {
        input_tokens: response.usageMetadata?.promptTokenCount || 0,
        output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
    };
  }

  transformStreamChunk(chunk: string): string | null {
    try {
      if (chunk.startsWith('data: ')) {
        chunk = chunk.substring(6);
      }
      const parsed = JSON.parse(chunk);
      const candidate = parsed.candidates?.[0];
      if (!candidate) return null;

      const text = candidate.content?.parts?.map((part: any) => part.text || '').join('') || '';

      if (!text) return null;

      return `data: ${JSON.stringify({
        type: 'content_block_delta',
        delta: {
          type: 'text_delta',
          text,
        },
      })}\n\n`;
    } catch {
      return null;
    }
  }

  private mapFinishReason(reason: string | undefined): string {
    switch (reason) {
      case 'STOP':
        return 'end_turn';
      case 'MAX_TOKENS':
        return 'max_tokens';
      case 'SAFETY':
      case 'RECITATION':
        return 'stop_sequence'; // Or a more specific custom reason
      default:
        return 'unknown';
    }
  }
}
