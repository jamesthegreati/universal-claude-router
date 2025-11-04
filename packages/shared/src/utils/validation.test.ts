import { describe, it, expect } from 'vitest';
import {
  validateProvider,
  validateConfig,
  validateClaudeCodeRequest,
  isValidUrl,
  isValidApiKey,
  ValidationError,
} from './validation';
import type { Provider, UCRConfig, ClaudeCodeRequest } from '../types';

describe('Validation Utilities', () => {
  describe('validateProvider', () => {
    it('should accept valid provider', () => {
      const provider: Provider = {
        id: 'test',
        name: 'Test Provider',
        baseUrl: 'https://api.test.com',
        enabled: true,
      };

      expect(() => validateProvider(provider)).not.toThrow();
    });

    it('should throw on missing id', () => {
      const provider: any = {
        name: 'Test Provider',
        baseUrl: 'https://api.test.com',
      };

      expect(() => validateProvider(provider)).toThrow(ValidationError);
    });

    it('should throw on invalid URL', () => {
      const provider: Provider = {
        id: 'test',
        name: 'Test Provider',
        baseUrl: 'not-a-url',
      };

      expect(() => validateProvider(provider)).toThrow(ValidationError);
    });

    it('should throw on negative priority', () => {
      const provider: Provider = {
        id: 'test',
        name: 'Test Provider',
        baseUrl: 'https://api.test.com',
        priority: -1,
      };

      expect(() => validateProvider(provider)).toThrow(ValidationError);
    });
  });

  describe('validateConfig', () => {
    it('should accept valid config', () => {
      const config: UCRConfig = {
        providers: [
          {
            id: 'test',
            name: 'Test Provider',
            baseUrl: 'https://api.test.com',
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should throw on empty providers', () => {
      const config: UCRConfig = {
        providers: [],
      };

      expect(() => validateConfig(config)).toThrow(ValidationError);
    });

    it('should throw on duplicate provider IDs', () => {
      const config: UCRConfig = {
        providers: [
          {
            id: 'test',
            name: 'Test Provider 1',
            baseUrl: 'https://api.test1.com',
          },
          {
            id: 'test',
            name: 'Test Provider 2',
            baseUrl: 'https://api.test2.com',
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow(ValidationError);
    });

    it('should throw on invalid port', () => {
      const config: UCRConfig = {
        providers: [
          {
            id: 'test',
            name: 'Test Provider',
            baseUrl: 'https://api.test.com',
          },
        ],
        server: {
          port: 99999,
        },
      };

      expect(() => validateConfig(config)).toThrow(ValidationError);
    });
  });

  describe('validateClaudeCodeRequest', () => {
    it('should accept valid request', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      };

      expect(() => validateClaudeCodeRequest(request)).not.toThrow();
    });

    it('should throw on missing model', () => {
      const request: any = {
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      };

      expect(() => validateClaudeCodeRequest(request)).toThrow(ValidationError);
    });

    it('should throw on empty messages', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [],
      };

      expect(() => validateClaudeCodeRequest(request)).toThrow(ValidationError);
    });

    it('should throw on invalid temperature', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
        temperature: 5.0,
      };

      expect(() => validateClaudeCodeRequest(request)).toThrow(ValidationError);
    });
  });

  describe('isValidUrl', () => {
    it('should accept valid URLs', () => {
      expect(isValidUrl('https://api.test.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://api.test.com/v1/chat')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://test.com')).toBe(true); // Valid URL, different protocol
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('isValidApiKey', () => {
    it('should accept valid API keys', () => {
      expect(isValidApiKey('sk-1234567890abcdef')).toBe(true);
      expect(isValidApiKey('my-api-key-123')).toBe(true);
    });

    it('should reject invalid API keys', () => {
      expect(isValidApiKey('')).toBe(false);
      expect(isValidApiKey('key with spaces')).toBe(false);
      expect(isValidApiKey('a'.repeat(2000))).toBe(false);
    });
  });
});
