import { describe, it, expect, beforeEach } from 'vitest';
import { MultiLayerCache, generateCacheKey } from './cache-manager.js';

describe('MultiLayerCache', () => {
  let cache: MultiLayerCache;

  beforeEach(() => {
    cache = new MultiLayerCache();
  });

  it('should store and retrieve values from L1 cache', async () => {
    await cache.set('key1', 'value1', true);
    const value = await cache.get('key1');
    expect(value).toBe('value1');
  });

  it('should store and retrieve values from L2 cache', async () => {
    await cache.set('key2', 'value2', false);
    const value = await cache.get('key2');
    expect(value).toBe('value2');
  });

  it('should promote L2 values to L1 on access', async () => {
    await cache.set('key3', 'value3', false);
    await cache.get('key3');
    const stats = cache.getStats();
    expect(stats.l1Size).toBe(1);
  });

  it('should track cache hits and misses', async () => {
    await cache.set('key4', 'value4', true);
    await cache.get('key4'); // hit
    await cache.get('missing'); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.5);
  });

  it('should clear cache', async () => {
    await cache.set('key5', 'value5', true);
    cache.clear();
    const value = await cache.get('key5');
    expect(value).toBeNull();
  });

  it('should return null for missing keys', async () => {
    const value = await cache.get('nonexistent');
    expect(value).toBeNull();
  });
});

describe('generateCacheKey', () => {
  it('should generate consistent keys for same input', () => {
    const obj = { a: 1, b: 2 };
    const key1 = generateCacheKey(obj);
    const key2 = generateCacheKey(obj);
    expect(key1).toBe(key2);
  });

  it('should generate different keys for different input', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 3 };
    const key1 = generateCacheKey(obj1);
    const key2 = generateCacheKey(obj2);
    expect(key1).not.toBe(key2);
  });

  it('should generate hex string keys', () => {
    const key = generateCacheKey({ test: 'data' });
    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });
});
