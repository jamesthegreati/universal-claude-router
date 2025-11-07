import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeHttpRequest, makeStreamingRequest } from './http.js';
import { ProviderError } from './error.js';
import { HttpMethod } from '@ucr/shared';
import * as undici from 'undici';

// Mock undici
vi.mock('undici', () => ({
  request: vi.fn(),
  Agent: vi.fn(() => ({})),
}));

describe('makeHttpRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle valid JSON response', async () => {
    const mockResponse = {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        text: vi.fn().mockResolvedValue('{"data":"test"}'),
      },
    };

    vi.mocked(undici.request).mockResolvedValue(mockResponse as any);

    const result = await makeHttpRequest({
      method: HttpMethod.POST,
      url: 'https://api.example.com/test',
      body: { test: 'data' },
    });

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ data: 'test' });
  });

  it('should handle invalid JSON response with proper error', async () => {
    const mockResponse = {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        text: vi.fn().mockResolvedValue('Invalid JSON response text'),
      },
    };

    vi.mocked(undici.request).mockResolvedValue(mockResponse as any);

    await expect(
      makeHttpRequest({
        method: HttpMethod.POST,
        url: 'https://api.example.com/test',
        body: { test: 'data' },
      }),
    ).rejects.toThrow(ProviderError);

    await expect(
      makeHttpRequest({
        method: HttpMethod.POST,
        url: 'https://api.example.com/test',
        body: { test: 'data' },
      }),
    ).rejects.toThrow('Provider returned invalid JSON');
  });

  it('should truncate long error messages to 200 characters', async () => {
    const longText = 'x'.repeat(300);
    const mockResponse = {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        text: vi.fn().mockResolvedValue(longText),
      },
    };

    vi.mocked(undici.request).mockResolvedValue(mockResponse as any);

    try {
      await makeHttpRequest({
        method: HttpMethod.POST,
        url: 'https://api.example.com/test',
        body: { test: 'data' },
      });
    } catch (error: any) {
      expect(error.message).toContain('x'.repeat(200));
      expect(error.message.length).toBeLessThan(longText.length + 100);
    }
  });
});

describe('makeStreamingRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return stream for successful response', async () => {
    const mockStream = { pipe: vi.fn() };
    const mockResponse = {
      statusCode: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: mockStream,
    };

    vi.mocked(undici.request).mockResolvedValue(mockResponse as any);

    const result = await makeStreamingRequest({
      method: HttpMethod.POST,
      url: 'https://api.example.com/stream',
      body: { test: 'data' },
    });

    expect(result).toBe(mockStream);
  });

  it('should handle error responses with JSON error body', async () => {
    const mockResponse = {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: {
        text: vi.fn().mockResolvedValue('{"error":"Bad request"}'),
      },
    };

    vi.mocked(undici.request).mockResolvedValue(mockResponse as any);

    await expect(
      makeStreamingRequest({
        method: HttpMethod.POST,
        url: 'https://api.example.com/stream',
        body: { test: 'data' },
      }),
    ).rejects.toThrow(ProviderError);

    await expect(
      makeStreamingRequest({
        method: HttpMethod.POST,
        url: 'https://api.example.com/stream',
        body: { test: 'data' },
      }),
    ).rejects.toThrow('Provider returned error');
  });

  it('should handle error responses with invalid JSON', async () => {
    const mockResponse = {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: {
        text: vi.fn().mockResolvedValue('Internal server error'),
      },
    };

    vi.mocked(undici.request).mockResolvedValue(mockResponse as any);

    try {
      await makeStreamingRequest({
        method: HttpMethod.POST,
        url: 'https://api.example.com/stream',
        body: { test: 'data' },
      });
    } catch (error: any) {
      expect(error).toBeInstanceOf(ProviderError);
      expect(error.message).toContain('Internal server error');
    }
  });

  it('should wrap non-JSON error responses in error object', async () => {
    const mockResponse = {
      statusCode: 503,
      headers: { 'content-type': 'text/plain' },
      body: {
        text: vi.fn().mockResolvedValue('Service unavailable'),
      },
    };

    vi.mocked(undici.request).mockResolvedValue(mockResponse as any);

    try {
      await makeStreamingRequest({
        method: HttpMethod.POST,
        url: 'https://api.example.com/stream',
        body: { test: 'data' },
      });
    } catch (error: any) {
      expect(error).toBeInstanceOf(ProviderError);
      expect(error.message).toContain('message');
      expect(error.message).toContain('Service unavailable');
    }
  });
});
