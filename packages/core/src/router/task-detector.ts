import type { ClaudeCodeRequest, TaskType } from '@ucr/shared';

/**
 * Detect task type from request
 */
export function detectTaskType(request: ClaudeCodeRequest): TaskType {
  // Get last user message
  const lastMessage = [...request.messages]
    .reverse()
    .find((m) => m.role === 'user');

  if (!lastMessage) {
    return 'default' as TaskType;
  }

  const content =
    typeof lastMessage.content === 'string'
      ? lastMessage.content
      : lastMessage.content
          .map((part) => (part.type === 'text' ? part.text : ''))
          .join(' ');

  const contentLower = content.toLowerCase();

  // Check for image task
  if (
    Array.isArray(lastMessage.content) &&
    lastMessage.content.some((part) => part.type === 'image')
  ) {
    return 'image' as TaskType;
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
    return 'webSearch' as TaskType;
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
    return 'background' as TaskType;
  }

  // Check for thinking/reasoning indicators
  const thinkKeywords = [
    'think about',
    'analyze',
    'reason through',
    'step by step',
    'explain why',
    'reasoning',
    'let\'s think',
    'chain of thought',
  ];
  if (thinkKeywords.some((keyword) => contentLower.includes(keyword))) {
    return 'think' as TaskType;
  }

  // Check message length for long context
  const totalLength = request.messages.reduce((sum, msg) => {
    const msgContent =
      typeof msg.content === 'string'
        ? msg.content
        : msg.content
            .map((part) => (part.type === 'text' ? part.text : ''))
            .join('');
    return sum + msgContent.length;
  }, 0);

  // If combined message length is very large, it's a long context task
  if (totalLength > 50000) {
    // ~12.5k tokens
    return 'longContext' as TaskType;
  }

  return 'default' as TaskType;
}

/**
 * Get task priority (higher number = higher priority)
 */
export function getTaskPriority(taskType: TaskType): number {
  const priorities: Record<TaskType, number> = {
    default: 5,
    think: 4,
    image: 3,
    webSearch: 2,
    longContext: 1,
    background: 0,
  };

  return priorities[taskType] || 5;
}
