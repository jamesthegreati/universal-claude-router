import { describe, it, expect } from 'vitest';
import { countTokens, countRequestTokens, exceedsTokenThreshold } from './token';
import type { ClaudeCodeRequest } from '../types';

describe('Token Utilities', () => {
  describe('countTokens', () => {
    it('should count tokens in a string', () => {
      const text = 'Hello world';
      const tokens = countTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });

    it('should return 0 for empty string', () => {
      expect(countTokens('')).toBe(0);
    });

    it('should handle long text', () => {
      const longText = 'a'.repeat(1000);
      const tokens = countTokens(longText);
      expect(tokens).toBeGreaterThan(100);
    });
  });

  describe('countRequestTokens', () => {
    it('should count tokens in a simple request', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'Hello, how are you?',
          },
        ],
      };

      const tokens = countRequestTokens(request);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should include system prompt in token count', () => {
      const requestWithSystem: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        system: 'You are a helpful assistant.',
      };

      const requestWithoutSystem: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      };

      const tokensWithSystem = countRequestTokens(requestWithSystem);
      const tokensWithoutSystem = countRequestTokens(requestWithoutSystem);

      expect(tokensWithSystem).toBeGreaterThan(tokensWithoutSystem);
    });

    it('should count multiple messages', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
          {
            role: 'assistant',
            content: 'Hi there!',
          },
          {
            role: 'user',
            content: 'How are you?',
          },
        ],
      };

      const tokens = countRequestTokens(request);
      expect(tokens).toBeGreaterThan(10);
    });
  });

  describe('exceedsTokenThreshold', () => {
    it('should return true when request exceeds threshold', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'a'.repeat(100000),
          },
        ],
      };

      expect(exceedsTokenThreshold(request, 1000)).toBe(true);
    });

    it('should return false when request is below threshold', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      };

      expect(exceedsTokenThreshold(request, 1000)).toBe(false);
    });
  });
});
