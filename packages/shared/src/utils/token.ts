import type { ClaudeCodeMessage, ClaudeCodeRequest } from '../types';

/**
 * Simple token counting implementation
 * Uses approximation: ~4 characters per token for English text
 */
const CHARS_PER_TOKEN = 4;

/**
 * Count tokens in a string
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Count tokens in a message
 */
export function countMessageTokens(message: ClaudeCodeMessage): number {
  let tokens = 0;

  // Count role tokens
  tokens += 4; // Approximate tokens for role and formatting

  // Count content tokens
  if (typeof message.content === 'string') {
    tokens += countTokens(message.content);
  } else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.type === 'text' && part.text) {
        tokens += countTokens(part.text);
      } else if (part.type === 'image') {
        // Approximate tokens for images (varies by size)
        tokens += 1000; // Conservative estimate
      }
    }
  }

  return tokens;
}

/**
 * Count total tokens in a request
 */
export function countRequestTokens(request: ClaudeCodeRequest): number {
  let tokens = 0;

  // Count system prompt
  if (request.system) {
    tokens += countTokens(request.system);
    tokens += 4; // Formatting tokens
  }

  // Count messages
  for (const message of request.messages) {
    tokens += countMessageTokens(message);
  }

  // Add overhead for request formatting
  tokens += 10;

  return tokens;
}

/**
 * Estimate if request exceeds a token threshold
 */
export function exceedsTokenThreshold(
  request: ClaudeCodeRequest,
  threshold: number
): boolean {
  const tokens = countRequestTokens(request);
  return tokens > threshold;
}

/**
 * Get token count summary
 */
export function getTokenSummary(request: ClaudeCodeRequest): {
  total: number;
  system: number;
  messages: number;
  messageCount: number;
} {
  let systemTokens = 0;
  let messageTokens = 0;

  if (request.system) {
    systemTokens = countTokens(request.system) + 4;
  }

  for (const message of request.messages) {
    messageTokens += countMessageTokens(message);
  }

  return {
    total: systemTokens + messageTokens + 10,
    system: systemTokens,
    messages: messageTokens,
    messageCount: request.messages.length,
  };
}
