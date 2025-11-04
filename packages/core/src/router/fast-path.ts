import type { ClaudeCodeRequest, RouteResult, Provider } from '@ucr/shared';

/**
 * Fast-path router for common request patterns
 * Skips full routing logic for simple, predictable requests
 */
export class FastPathRouter {
  private fastPaths = new Map<string, Provider>();

  /**
   * Check if request can use fast path
   */
  canUseFastPath(request: ClaudeCodeRequest): boolean {
    // Only non-streaming, single-message, small requests
    return (
      !request.stream &&
      request.messages.length === 1 &&
      this.estimateTokens(request) < 1000
    );
  }

  /**
   * Get cached provider for this pattern
   */
  getFastPath(request: ClaudeCodeRequest): Provider | null {
    const pattern = this.getPattern(request);
    return this.fastPaths.get(pattern) || null;
  }

  /**
   * Cache a provider for a pattern
   */
  setFastPath(request: ClaudeCodeRequest, provider: Provider): void {
    const pattern = this.getPattern(request);
    this.fastPaths.set(pattern, provider);
  }

  /**
   * Create a pattern key from request
   */
  private getPattern(request: ClaudeCodeRequest): string {
    return `${request.model}:${request.messages[0].role}`;
  }

  /**
   * Fast token estimation (4 chars ≈ 1 token)
   */
  private estimateTokens(request: ClaudeCodeRequest): number {
    const text = JSON.stringify(request.messages);
    return Math.ceil(text.length / 4);
  }

  /**
   * Clear fast path cache
   */
  clear(): void {
    this.fastPaths.clear();
  }
}

// Global fast-path router instance
export const fastPathRouter = new FastPathRouter();
