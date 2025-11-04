import { TaskType } from '@ucr/shared';
import type { ClaudeCodeRequest } from '@ucr/shared';

/**
 * Detect task type from request
 */
export function detectTaskType(request: ClaudeCodeRequest): TaskType {
  // Get last user message
  const lastMessage = [...request.messages].reverse().find((m) => m.role === 'user');

  if (!lastMessage) {
    return TaskType.DEFAULT;
  }

  const content =
    typeof lastMessage.content === 'string'
      ? lastMessage.content
      : lastMessage.content.map((part) => (part.type === 'text' ? part.text : '')).join(' ');

  const contentLower = content.toLowerCase();

  // Check for image task
  if (
    Array.isArray(lastMessage.content) &&
    lastMessage.content.some((part) => part.type === 'image')
  ) {
    return TaskType.IMAGE;
  }

  // Check for web search indicators
  const webSearchKeywords = [
    'search for',
    'look up',
    'find information about',
    'what is the latest',
    'current events',
    'recent news',
    'browse',
    'web search',
  ];
  if (webSearchKeywords.some((keyword) => contentLower.includes(keyword))) {
    return TaskType.WEB_SEARCH;
  }

  // Check for background task indicators
  const backgroundKeywords = [
    'in the background',
    'asynchronously',
    'run this later',
    'schedule',
    'batch process',
  ];
  if (backgroundKeywords.some((keyword) => contentLower.includes(keyword))) {
    return TaskType.BACKGROUND;
  }

  // Check for thinking/reasoning indicators
  const thinkKeywords = [
    'think about',
    'analyze',
    'reason through',
    'step by step',
    'explain why',
    'reasoning',
    "let's think",
    'chain of thought',
  ];
  if (thinkKeywords.some((keyword) => contentLower.includes(keyword))) {
    return TaskType.THINK;
  }

  // Check message length for long context
  const totalLength = request.messages.reduce((sum, msg) => {
    const msgContent =
      typeof msg.content === 'string'
        ? msg.content
        : msg.content.map((part) => (part.type === 'text' ? part.text : '')).join('');
    return sum + msgContent.length;
  }, 0);

  // If combined message length is very large, it's a long context task
  if (totalLength > 50000) {
    // ~12.5k tokens
    return TaskType.LONG_CONTEXT;
  }

  return TaskType.DEFAULT;
}

/**
 * Get task priority (higher number = higher priority)
 */
export function getTaskPriority(taskType: TaskType): number {
  const priorities: Record<string, number> = {
    [TaskType.DEFAULT]: 5,
    [TaskType.THINK]: 4,
    [TaskType.IMAGE]: 3,
    [TaskType.WEB_SEARCH]: 2,
    [TaskType.LONG_CONTEXT]: 1,
    [TaskType.BACKGROUND]: 0,
  };

  return priorities[taskType] ?? 5;
}
