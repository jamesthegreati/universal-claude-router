import { describe, it, expect } from 'vitest';
import { GoogleTransformer } from './google.js';
import type { ClaudeCodeRequest, Provider } from '@ucr/shared';

describe('GoogleTransformer', () => {
  const transformer = new GoogleTransformer();

  describe('transformRequest', () => {
    it('should use x-goog-api-key header for AI Studio (not in URL)', async () => {
      const provider: Provider = {
        id: 'google-ai-studio',
        name: 'google',
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: 'test-api-key',
      };

      const request: ClaudeCodeRequest = {
        model: 'gemini-pro',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        max_tokens: 100,
      };

      const result = await transformer.transformRequest(request, provider);

      // Verify URL does NOT contain the API key as query parameter
      expect(result.url).not.toContain('?key=');
      expect(result.url).not.toContain('test-api-key');
      expect(result.url).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      );

      // Verify API key is in header instead
      expect(result.headers['x-goog-api-key']).toBe('test-api-key');
      expect(result.headers['Content-Type']).toBe('application/json');
    });

    it('should use Bearer token for Vertex AI', async () => {
      const provider: Provider = {
        id: 'google-vertex',
        name: 'google',
        baseUrl: 'https://us-central1-aiplatform.googleapis.com',
        apiKey: 'test-bearer-token',
        metadata: {
          id: 'google-vertex',
          name: 'google',
          baseUrl: 'https://us-central1-aiplatform.googleapis.com',
          authType: 'bearerToken' as any,
          models: [],
          supportsStreaming: true,
          requiresAuth: true,
          projectId: 'my-project',
          location: 'us-central1',
        },
      };

      const request: ClaudeCodeRequest = {
        model: 'gemini-pro',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        max_tokens: 100,
      };

      const result = await transformer.transformRequest(request, provider);

      // Verify URL structure for Vertex AI
      expect(result.url).toContain('/v1/projects/my-project/locations/us-central1');
      expect(result.url).not.toContain('?key=');

      // Verify Bearer token authorization
      expect(result.headers['Authorization']).toBe('Bearer test-bearer-token');
      expect(result.headers['x-goog-api-key']).toBeUndefined();
      expect(result.headers['Content-Type']).toBe('application/json');
    });

    it('should handle Vertex AI with default project and location', async () => {
      const provider: Provider = {
        id: 'google-vertex-default',
        name: 'google',
        baseUrl: 'https://us-central1-aiplatform.googleapis.com',
        apiKey: 'test-token',
      };

      const request: ClaudeCodeRequest = {
        model: 'gemini-pro',
        messages: [
          {
            role: 'user',
            content: 'Test',
          },
        ],
        max_tokens: 100,
      };

      const result = await transformer.transformRequest(request, provider);

      // Should use default values
      expect(result.url).toContain('/v1/projects/default/locations/us-central1');
      expect(result.headers['Authorization']).toBe('Bearer test-token');
    });

    it('should properly merge consecutive messages', async () => {
      const provider: Provider = {
        id: 'google-1',
        name: 'google',
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: 'test-key',
      };

      const request: ClaudeCodeRequest = {
        model: 'gemini-pro',
        messages: [
          {
            role: 'user',
            content: 'First user message',
          },
          {
            role: 'user',
            content: 'Second user message',
          },
          {
            role: 'assistant',
            content: 'Assistant response',
          },
        ],
        max_tokens: 100,
      };

      const result = await transformer.transformRequest(request, provider);

      // The body should merge consecutive user messages
      const body = result.body as any;
      expect(body.contents).toHaveLength(2); // Merged user messages + assistant message
      expect(body.contents[0].role).toBe('user');
      expect(body.contents[0].parts[0].text).toContain('First user message');
      expect(body.contents[0].parts[0].text).toContain('Second user message');
      expect(body.contents[1].role).toBe('model');
    });

    it('should include system instruction if present', async () => {
      const provider: Provider = {
        id: 'google-2',
        name: 'google',
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: 'test-key',
      };

      const request: ClaudeCodeRequest = {
        model: 'gemini-pro',
        system: 'You are a helpful assistant',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        max_tokens: 100,
      };

      const result = await transformer.transformRequest(request, provider);

      const body = result.body as any;
      expect(body.systemInstruction).toBeDefined();
      expect(body.systemInstruction.parts[0].text).toBe('You are a helpful assistant');
    });

    it('should respect provider headers', async () => {
      const provider: Provider = {
        id: 'google-3',
        name: 'google',
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: 'test-key',
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      };

      const request: ClaudeCodeRequest = {
        model: 'gemini-pro',
        messages: [
          {
            role: 'user',
            content: 'Test',
          },
        ],
        max_tokens: 100,
      };

      const result = await transformer.transformRequest(request, provider);

      expect(result.headers['X-Custom-Header']).toBe('custom-value');
      expect(result.headers['x-goog-api-key']).toBe('test-key');
    });
  });

  describe('transformResponse', () => {
    it('should transform valid response', async () => {
      const response = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Hello from Gemini' }],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
        },
      };

      const original: ClaudeCodeRequest = {
        model: 'gemini-pro',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 100,
      };

      const result = await transformer.transformResponse(response, original);

      expect(result.content[0].text).toBe('Hello from Gemini');
      expect(result.stop_reason).toBe('end_turn');
      expect(result.usage.input_tokens).toBe(10);
      expect(result.usage.output_tokens).toBe(5);
    });
  });
});
