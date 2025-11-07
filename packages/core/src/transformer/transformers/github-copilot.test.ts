import { describe, it, expect } from 'vitest';
import { GitHubCopilotTransformer } from './github-copilot.js';
import type { ClaudeCodeRequest, Provider } from '@ucr/shared';

describe('GitHubCopilotTransformer', () => {
  const transformer = new GitHubCopilotTransformer();

  describe('transformRequest', () => {
    it('should include Content-Type header explicitly', async () => {
      const provider: Provider = {
        id: 'github-copilot-1',
        name: 'github-copilot',
        baseUrl: 'https://api.githubcopilot.com',
        apiKey: 'ghu_test_token',
      };

      const request: ClaudeCodeRequest = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        max_tokens: 100,
      };

      const result = await transformer.transformRequest(request, provider);

      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Authorization']).toBe('Bearer ghu_test_token');
    });

    it('should include all required GitHub Copilot headers', async () => {
      const provider: Provider = {
        id: 'github-copilot-2',
        name: 'github-copilot',
        baseUrl: 'https://api.githubcopilot.com',
        apiKey: 'ghu_test_token',
      };

      const request: ClaudeCodeRequest = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Test',
          },
        ],
        max_tokens: 100,
      };

      const result = await transformer.transformRequest(request, provider);

      expect(result.headers['Authorization']).toBe('Bearer ghu_test_token');
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Editor-Version']).toBe('vscode/1.85.0');
      expect(result.headers['Editor-Plugin-Version']).toBe('copilot-chat/0.11.1');
      expect(result.headers['User-Agent']).toBe('GitHubCopilotChat/0.11.1');
    });

    it('should use custom editor metadata if provided', async () => {
      const provider: Provider = {
        id: 'github-copilot-3',
        name: 'github-copilot',
        baseUrl: 'https://api.githubcopilot.com',
        apiKey: 'ghu_test_token',
        metadata: {
          id: 'github-copilot-3',
          name: 'github-copilot',
          baseUrl: 'https://api.githubcopilot.com',
          authType: 'oauth' as any,
          models: [],
          supportsStreaming: true,
          requiresAuth: true,
          editorVersion: 'vscode/1.90.0',
          pluginVersion: 'copilot-chat/0.15.0',
          userAgent: 'CustomEditor/1.0.0',
        },
      };

      const request: ClaudeCodeRequest = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Test',
          },
        ],
        max_tokens: 100,
      };

      const result = await transformer.transformRequest(request, provider);

      expect(result.headers['Editor-Version']).toBe('vscode/1.90.0');
      expect(result.headers['Editor-Plugin-Version']).toBe('copilot-chat/0.15.0');
      expect(result.headers['User-Agent']).toBe('CustomEditor/1.0.0');
    });

    it('should respect additional provider headers', async () => {
      const provider: Provider = {
        id: 'github-copilot-4',
        name: 'github-copilot',
        baseUrl: 'https://api.githubcopilot.com',
        apiKey: 'ghu_test_token',
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      };

      const request: ClaudeCodeRequest = {
        model: 'gpt-4',
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
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Authorization']).toBe('Bearer ghu_test_token');
    });

    it('should transform Claude messages to OpenAI format', async () => {
      const provider: Provider = {
        id: 'github-copilot-5',
        name: 'github-copilot',
        baseUrl: 'https://api.githubcopilot.com',
        apiKey: 'ghu_test_token',
      };

      const request: ClaudeCodeRequest = {
        model: 'gpt-4',
        system: 'You are a helpful assistant',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
        top_p: 0.95,
        stream: false,
      };

      const result = await transformer.transformRequest(request, provider);

      const body = result.body as any;
      expect(body.messages).toHaveLength(3); // system + 2 messages
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toBe('You are a helpful assistant');
      expect(body.messages[1].role).toBe('user');
      expect(body.messages[1].content).toBe('Hello');
      expect(body.messages[2].role).toBe('assistant');
      expect(body.messages[2].content).toBe('Hi there!');
      expect(body.temperature).toBe(0.7);
      expect(body.top_p).toBe(0.95);
    });

    it('should set correct endpoint URL', async () => {
      const provider: Provider = {
        id: 'github-copilot-6',
        name: 'github-copilot',
        baseUrl: 'https://api.githubcopilot.com',
        apiKey: 'ghu_test_token',
      };

      const request: ClaudeCodeRequest = {
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: 'Test',
          },
        ],
        max_tokens: 100,
      };

      const result = await transformer.transformRequest(request, provider);

      expect(result.url).toBe('https://api.githubcopilot.com/chat/completions');
      expect(result.method).toBe('POST');
    });
  });

  describe('transformResponse', () => {
    it('should transform GitHub Copilot response correctly', async () => {
      const response = {
        id: 'chatcmpl-123',
        model: 'gpt-4',
        choices: [
          {
            message: {
              content: 'Hello from Copilot',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
        },
      };

      const original: ClaudeCodeRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 100,
      };

      const result = await transformer.transformResponse(response, original);

      expect(result.id).toBe('chatcmpl-123');
      expect(result.content[0].text).toBe('Hello from Copilot');
      expect(result.stop_reason).toBe('end_turn');
      expect(result.usage.input_tokens).toBe(10);
      expect(result.usage.output_tokens).toBe(5);
    });

    it('should map finish reasons correctly', async () => {
      const baseResponse = {
        id: 'chatcmpl-123',
        model: 'gpt-4',
        choices: [
          {
            message: { content: 'Test' },
            finish_reason: 'length',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
        },
      };

      const original: ClaudeCodeRequest = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 100,
      };

      const result = await transformer.transformResponse(baseResponse, original);

      expect(result.stop_reason).toBe('max_tokens');
    });
  });
});
