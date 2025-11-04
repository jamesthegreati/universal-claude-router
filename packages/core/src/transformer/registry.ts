import type { Transformer } from '@ucr/shared';
import { AnthropicTransformer } from './transformers/anthropic.js';
import { OpenAITransformer } from './transformers/openai.js';
import { OllamaTransformer } from './transformers/ollama.js';

/**
 * Transformer registry for managing transformers
 */
export class TransformerRegistry {
  private transformers = new Map<string, Transformer>();

  constructor() {
    // Register built-in transformers
    this.register(new AnthropicTransformer());
    this.register(new OpenAITransformer());
    this.register(new OllamaTransformer());
  }

  /**
   * Register a transformer
   */
  register(transformer: Transformer): void {
    this.transformers.set(transformer.provider, transformer);
  }

  /**
   * Get transformer for a provider
   */
  get(provider: string): Transformer | undefined {
    return this.transformers.get(provider);
  }

  /**
   * Check if transformer exists for provider
   */
  has(provider: string): boolean {
    return this.transformers.has(provider);
  }

  /**
   * Get all registered transformer providers
   */
  getProviders(): string[] {
    return Array.from(this.transformers.keys());
  }

  /**
   * Remove a transformer
   */
  unregister(provider: string): boolean {
    return this.transformers.delete(provider);
  }

  /**
   * Clear all transformers
   */
  clear(): void {
    this.transformers.clear();
  }
}

// Singleton instance
let instance: TransformerRegistry | null = null;

/**
 * Get singleton TransformerRegistry instance
 */
export function getTransformerRegistry(): TransformerRegistry {
  if (!instance) {
    instance = new TransformerRegistry();
  }
  return instance;
}
