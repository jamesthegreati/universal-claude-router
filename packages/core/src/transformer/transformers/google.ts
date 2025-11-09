import { BaseTransformer } from '../base.js';
import type { ClaudeCodeRequest, ClaudeCodeResponse, HttpMethod, Provider } from '@ucr/shared';

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
    // Check if this is Vertex AI by validating the hostname
    let isVertexAI = false;
    try {
      const url = new URL(provider.baseUrl);
      const hostname = url.hostname;
      // Match Vertex AI hostnames: either exact match or contains the domain as part of a compound subdomain
      // Examples: aiplatform.googleapis.com, us-central1-aiplatform.googleapis.com
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        // Check if it ends with googleapis.com
        if (parts[parts.length - 2] === 'googleapis' && parts[parts.length - 1] === 'com') {
          // Check if any part contains 'aiplatform' or 'vertexai'
          isVertexAI = parts.some(
            (part) =>
              part === 'aiplatform' ||
              part.endsWith('-aiplatform') ||
              part === 'vertexai' ||
              part.endsWith('-vertexai'),
          );
        }
      }
    } catch {
      // Invalid URL, default to false
      isVertexAI = false;
    }

    const endpoint = isVertexAI
      ? `${provider.baseUrl}/v1/projects/${provider.metadata?.projectId || 'default'}/locations/${
          provider.metadata?.location || 'us-central1'
        }/publishers/google/models/${modelName}:generateContent`
      : `${provider.baseUrl}/v1beta/models/${modelName}:generateContent`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...provider.headers,
    };

    if (isVertexAI && provider.apiKey) {
      headers['Authorization'] = `Bearer ${provider.apiKey}`;
    } else if (provider.apiKey) {
      headers['x-goog-api-key'] = provider.apiKey;
    }

    const contents = this.mergeConsecutiveMessages(request.messages);

    const body: any = {
      contents,
      generationConfig: {
        temperature: request.temperature,
        topP: request.top_p,
        topK: request.top_k,
        maxOutputTokens: request.max_tokens,
      },
    };

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

  private mergeConsecutiveMessages(messages: ClaudeCodeRequest['messages']): any[] {
    if (!messages.length) {
      return [];
    }

    const merged: any[] = [];
    let lastRole: 'user' | 'model' | null = null;

    for (const msg of messages) {
      const currentRole = msg.role === 'assistant' ? 'model' : 'user';
      const textContent = this.extractTextContent(msg.content);

      if (currentRole === lastRole && merged.length > 0) {
        // Merge with the previous message of the same role
        const lastMessage = merged[merged.length - 1];
        lastMessage.parts[0].text += `\n${textContent}`;
      } else {
        // Add a new message
        merged.push({
          role: currentRole,
          parts: [{ text: textContent }],
        });
        lastRole = currentRole;
      }
    }
    return merged;
  }

  async transformResponse(response: any, original: ClaudeCodeRequest): Promise<ClaudeCodeResponse> {
    const candidate = response.candidates?.[0];
    if (!candidate) {
      // Provide detailed error information for debugging
      let errorDetails = 'Invalid Google response: no candidates';

      if (response.promptFeedback) {
        errorDetails += ` - Prompt blocked: ${JSON.stringify(response.promptFeedback)}`;
      }

      if (response.error) {
        errorDetails += ` - API Error: ${JSON.stringify(response.error)}`;
      }

      // Log the full response for debugging
      console.error('Google API Response:', JSON.stringify(response, null, 2));

      throw new Error(errorDetails);
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
