import type { Transformer } from '@ucr/shared';

/**
 * Lazy transformer registry
 * Loads transformers only when they are first requested
 */
export class LazyTransformerRegistry {
  private transformers = new Map<string, Transformer>();
  private loaders = new Map<
    string,
    () => Promise<{ default: new () => Transformer } | { [key: string]: new () => Transformer }>
  >();

  constructor() {
    // Register lazy loaders for built-in transformers
    this.registerLoader('anthropic', () => import('./transformers/anthropic.js'));
    this.registerLoader('openai', () => import('./transformers/openai.js'));
    this.registerLoader('ollama', () => import('./transformers/ollama.js'));
    this.registerLoader('github-copilot', () => import('./transformers/github-copilot.js'));
    this.registerLoader('google', () => import('./transformers/google.js'));
    this.registerLoader('deepseek', () => import('./transformers/deepseek.js'));
    this.registerLoader('openrouter', () => import('./transformers/openrouter.js'));
    this.registerLoader('groq', () => import('./transformers/groq.js'));
    this.registerLoader('cohere', () => import('./transformers/cohere.js'));
    this.registerLoader('mistral', () => import('./transformers/mistral.js'));
    this.registerLoader('perplexity', () => import('./transformers/perplexity.js'));
    this.registerLoader('together', () => import('./transformers/together.js'));
    this.registerLoader('replicate', () => import('./transformers/replicate.js'));
  }

  /**
   * Register a lazy loader for a transformer
   */
  private registerLoader(
    provider: string,
    loader: () => Promise<{
      default: new () => Transformer;
    } | { [key: string]: new () => Transformer }>,
  ): void {
    this.loaders.set(provider, loader);
  }

  /**
   * Get transformer for a provider (lazy load if needed)
   */
  async get(provider: string): Promise<Transformer | undefined> {
    // Return cached instance if available
    if (this.transformers.has(provider)) {
      return this.transformers.get(provider);
    }

    // Try to lazy load
    const loader = this.loaders.get(provider);
    if (!loader) {
      return undefined;
    }

    try {
      const module = await loader();
      // Handle both default and named exports
      const TransformerClass = 'default' in module ? module.default : Object.values(module)[0];
      const transformer = new TransformerClass();
      this.transformers.set(provider, transformer);
      return transformer;
    } catch (error) {
      console.error(`Failed to load transformer for ${provider}:`, error);
      return undefined;
    }
  }

  /**
   * Check if transformer exists for provider
   */
  has(provider: string): boolean {
    return this.transformers.has(provider) || this.loaders.has(provider);
  }

  /**
   * Get all registered transformer providers
   */
  getProviders(): string[] {
    return Array.from(this.loaders.keys());
  }

  /**
   * Preload specific transformers
   */
  async preload(providers: string[]): Promise<void> {
    await Promise.all(providers.map((provider) => this.get(provider)));
  }

  /**
   * Clear loaded transformers (keep loaders)
   */
  clear(): void {
    this.transformers.clear();
  }
}

// Singleton instance
let lazyInstance: LazyTransformerRegistry | null = null;

/**
 * Get singleton LazyTransformerRegistry instance
 */
export function getLazyTransformerRegistry(): LazyTransformerRegistry {
  if (!lazyInstance) {
    lazyInstance = new LazyTransformerRegistry();
  }
  return lazyInstance;
}
