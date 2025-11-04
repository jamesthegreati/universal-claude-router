#!/usr/bin/env node

/**
 * Benchmark script for Universal Claude Router
 * Tests various performance aspects of the router
 */

import { performance } from 'perf_hooks';

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Run a benchmark
 */
async function benchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations = 1000,
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warm up
  for (let i = 0; i < 10; i++) {
    await fn();
  }

  // Run benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  // Calculate statistics
  times.sort((a, b) => a - b);
  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / times.length;
  const minTime = times[0];
  const maxTime = times[times.length - 1];
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    p50,
    p95,
    p99,
  };
}

/**
 * Print benchmark results
 */
function printResults(result: BenchmarkResult): void {
  console.log(`\n${result.name}:`);
  console.log(`  Iterations: ${result.iterations}`);
  console.log(`  Total:      ${result.totalTime.toFixed(2)}ms`);
  console.log(`  Avg:        ${result.avgTime.toFixed(2)}ms`);
  console.log(`  Min:        ${result.minTime.toFixed(2)}ms`);
  console.log(`  Max:        ${result.maxTime.toFixed(2)}ms`);
  console.log(`  P50:        ${result.p50.toFixed(2)}ms`);
  console.log(`  P95:        ${result.p95.toFixed(2)}ms`);
  console.log(`  P99:        ${result.p99.toFixed(2)}ms`);
}

/**
 * Main benchmark suite
 */
async function main() {
  console.log('Universal Claude Router - Performance Benchmarks');
  console.log('================================================\n');

  // Check if dist directory exists
  try {
    await import('../packages/core/dist/cache/cache-manager.js');
  } catch (error) {
    console.error('\nError: Project not built. Please run "npm run build" first.\n');
    process.exit(1);
  }

  // Benchmark 1: Cache key generation
  const { generateCacheKey } = await import('../packages/core/dist/cache/cache-manager.js');
  const result1 = await benchmark('Cache Key Generation', () => {
    generateCacheKey({ model: 'test', messages: [{ role: 'user', content: 'test' }] });
  });
  printResults(result1);

  // Benchmark 2: Cache set/get
  const { cacheManager } = await import('../packages/core/dist/cache/cache-manager.js');
  const result2 = await benchmark('Cache Set/Get', async () => {
    await cacheManager.set('test-key', { data: 'test-value' });
    await cacheManager.get('test-key');
  });
  printResults(result2);

  // Benchmark 3: Token counting (fast approximation)
  const { metadataCache } = await import('../packages/core/dist/cache/metadata-cache.js');
  const testText = 'This is a test message for token counting benchmarks';
  const result3 = await benchmark('Token Count (Fast Approximation)', () => {
    metadataCache.getTokenCount(testText);
  });
  printResults(result3);

  // Benchmark 4: String interning
  const { stringOptimizer } = await import('../packages/core/dist/utils/performance.js');
  const result4 = await benchmark('String Interning', () => {
    stringOptimizer.intern('test-string');
  });
  printResults(result4);

  // Benchmark 5: Memoization
  const { memoize } = await import('../packages/core/dist/utils/performance.js');
  const expensiveFn = (x: number) => x * 2;
  const memoized = memoize(expensiveFn);
  const result5 = await benchmark('Memoized Function Call', () => {
    memoized(42);
  });
  printResults(result5);

  // Summary
  console.log('\n================================================');
  console.log('Benchmark Summary:');
  console.log(`  Cache Key Generation:    ${result1.avgTime.toFixed(2)}ms avg`);
  console.log(`  Cache Set/Get:           ${result2.avgTime.toFixed(2)}ms avg`);
  console.log(`  Token Counting:          ${result3.avgTime.toFixed(2)}ms avg`);
  console.log(`  String Interning:        ${result4.avgTime.toFixed(2)}ms avg`);
  console.log(`  Memoized Function:       ${result5.avgTime.toFixed(2)}ms avg`);
  console.log('================================================\n');
}

// Run benchmarks
main().catch(console.error);
