import { describe, it, expect, beforeEach } from 'vitest';
import { RequestCoalescer, memoize, EventLoopOptimizer, StringOptimizer } from './performance.js';

describe('RequestCoalescer', () => {
  let coalescer: RequestCoalescer;

  beforeEach(() => {
    coalescer = new RequestCoalescer();
  });

  it('should coalesce duplicate requests', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return 'result';
    };

    const [result1, result2] = await Promise.all([
      coalescer.coalesce('key1', fn),
      coalescer.coalesce('key1', fn),
    ]);

    expect(result1).toBe('result');
    expect(result2).toBe('result');
    expect(callCount).toBe(1); // Should only call once
  });

  it('should not coalesce different keys', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return 'result';
    };

    await Promise.all([coalescer.coalesce('key1', fn), coalescer.coalesce('key2', fn)]);

    expect(callCount).toBe(2); // Should call twice
  });

  it('should track pending requests', async () => {
    const fn = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'result';
    };

    const promise = coalescer.coalesce('key', fn);
    expect(coalescer.pendingCount).toBe(1);

    await promise;
    expect(coalescer.pendingCount).toBe(0);
  });
});

describe('memoize', () => {
  it('should cache function results', () => {
    let callCount = 0;
    const fn = (x: number) => {
      callCount++;
      return x * 2;
    };

    const memoized = memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(5)).toBe(10);
    expect(callCount).toBe(1); // Should only call once
  });

  it('should handle different arguments', () => {
    let callCount = 0;
    const fn = (x: number) => {
      callCount++;
      return x * 2;
    };

    const memoized = memoize(fn);

    expect(memoized(5)).toBe(10);
    expect(memoized(10)).toBe(20);
    expect(callCount).toBe(2); // Should call twice for different args
  });
});

describe('EventLoopOptimizer', () => {
  it('should defer execution', async () => {
    let executed = false;
    const promise = new Promise<void>((resolve) => {
      EventLoopOptimizer.defer(() => {
        executed = true;
        expect(executed).toBe(true);
        resolve();
      });
    });
    expect(executed).toBe(false);
    await promise;
  });

  it('should process items in chunks', async () => {
    const items = [1, 2, 3, 4, 5];
    const results: number[] = [];

    await EventLoopOptimizer.processInChunks(
      items,
      async (item) => {
        results.push(item * 2);
      },
      2,
    );

    expect(results).toEqual([2, 4, 6, 8, 10]);
  });
});

describe('StringOptimizer', () => {
  let optimizer: StringOptimizer;

  beforeEach(() => {
    optimizer = new StringOptimizer();
  });

  it('should intern strings', () => {
    const str1 = 'test';
    const str2 = 'test';
    const interned1 = optimizer.intern(str1);
    const interned2 = optimizer.intern(str2);

    expect(interned1).toBe(interned2);
  });

  it('should concatenate strings efficiently', () => {
    const result = optimizer.concat(['hello', ' ', 'world']);
    expect(result).toBe('hello world');
  });

  it('should clear interned strings', () => {
    optimizer.intern('test');
    optimizer.clear();
    // After clear, new string should be interned
    const str = optimizer.intern('test');
    expect(str).toBe('test');
  });
});
