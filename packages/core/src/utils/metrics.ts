/**
 * Performance metrics tracking
 */
export class PerformanceMetrics {
  private metrics = {
    requestCount: 0,
    totalLatency: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    streamingRequests: 0,
    nonStreamingRequests: 0,
  };
  private startTime = Date.now();

  /**
   * Record a request
   */
  recordRequest(latency: number, cacheHit: boolean, streaming: boolean, error = false) {
    this.metrics.requestCount++;
    this.metrics.totalLatency += latency;

    if (cacheHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    if (streaming) {
      this.metrics.streamingRequests++;
    } else {
      this.metrics.nonStreamingRequests++;
    }

    if (error) {
      this.metrics.errors++;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    const uptime = this.getUptime();
    const totalRequests = this.metrics.requestCount || 1; // Avoid division by zero

    return {
      requests: {
        total: this.metrics.requestCount,
        streaming: this.metrics.streamingRequests,
        nonStreaming: this.metrics.nonStreamingRequests,
        errors: this.metrics.errors,
      },
      performance: {
        avgLatency: this.metrics.totalLatency / totalRequests,
        requestsPerSecond: this.metrics.requestCount / uptime,
        errorRate: this.metrics.errors / totalRequests,
      },
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate:
          this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses || 1),
      },
      uptime: uptime,
    };
  }

  /**
   * Get uptime in seconds
   */
  private getUptime(): number {
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Reset metrics
   */
  reset(): void {
    this.metrics = {
      requestCount: 0,
      totalLatency: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      streamingRequests: 0,
      nonStreamingRequests: 0,
    };
    this.startTime = Date.now();
  }
}

// Global metrics instance
export const metrics = new PerformanceMetrics();
