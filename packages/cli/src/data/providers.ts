import type { Provider } from '@ucr/shared';

/**
 * Provider templates for config generation
 */
export const PROVIDER_TEMPLATES: Record<string, Omit<Provider, 'apiKey'>> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    enabled: true,
    priority: 10,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-4',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    enabled: true,
    priority: 9,
  },
  'github-copilot': {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    baseUrl: 'https://api.githubcopilot.com',
    authType: 'oauth' as any,
    defaultModel: 'gpt-4',
    models: ['gpt-4', 'gpt-3.5-turbo'],
    enabled: true,
    priority: 8,
  },
  google: {
    id: 'google',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.0-flash-exp',
    models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
    enabled: true,
    priority: 7,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-coder'],
    enabled: true,
    priority: 6,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4', 'google/gemini-pro'],
    enabled: true,
    priority: 5,
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com',
    defaultModel: 'llama-3.1-70b-versatile',
    models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    enabled: true,
    priority: 4,
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'llama2',
    models: ['llama2', 'codellama', 'mistral'],
    enabled: true,
    priority: 1,
  },
};

/**
 * Get provider template by ID
 */
export function getProviderTemplate(providerId: string): Omit<Provider, 'apiKey'> | undefined {
  return PROVIDER_TEMPLATES[providerId];
}

/**
 * Get all provider templates
 */
export function getAllProviderTemplates(): Array<Omit<Provider, 'apiKey'>> {
  return Object.values(PROVIDER_TEMPLATES);
}

/**
 * Check if a provider ID is known
 */
export function isKnownProvider(providerId: string): boolean {
  return providerId in PROVIDER_TEMPLATES;
}
