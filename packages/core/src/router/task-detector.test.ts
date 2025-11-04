import { describe, it, expect } from 'vitest';
import { detectTaskType, getTaskPriority } from './task-detector';
import { TaskType } from '@ucr/shared';
import type { ClaudeCodeRequest } from '@ucr/shared';

describe('Task Detector', () => {
  describe('detectTaskType', () => {
    it('should detect default task', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      };

      expect(detectTaskType(request)).toBe(TaskType.DEFAULT);
    });

    it('should detect think task', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'Let me think step by step about this problem',
          },
        ],
      };

      expect(detectTaskType(request)).toBe(TaskType.THINK);
    });

    it('should detect background task', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'Please run this in the background',
          },
        ],
      };

      expect(detectTaskType(request)).toBe(TaskType.BACKGROUND);
    });

    it('should detect webSearch task', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: 'Search for information about artificial intelligence',
          },
        ],
      };

      expect(detectTaskType(request)).toBe(TaskType.WEB_SEARCH);
    });

    it('should detect image task', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What is in this image?',
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: 'base64data',
                },
              },
            ],
          },
        ],
      };

      expect(detectTaskType(request)).toBe(TaskType.IMAGE);
    });

    it('should detect longContext task', () => {
      const longText = 'a'.repeat(60000);
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: longText,
          },
        ],
      };

      expect(detectTaskType(request)).toBe(TaskType.LONG_CONTEXT);
    });

    it('should prioritize image over other indicators', () => {
      const request: ClaudeCodeRequest = {
        model: 'claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Think about this image',
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: 'base64data',
                },
              },
            ],
          },
        ],
      };

      expect(detectTaskType(request)).toBe(TaskType.IMAGE);
    });
  });

  describe('getTaskPriority', () => {
    it('should return correct priorities', () => {
      expect(getTaskPriority(TaskType.DEFAULT)).toBe(5);
      expect(getTaskPriority(TaskType.THINK)).toBe(4);
      expect(getTaskPriority(TaskType.IMAGE)).toBe(3);
      expect(getTaskPriority(TaskType.WEB_SEARCH)).toBe(2);
      expect(getTaskPriority(TaskType.LONG_CONTEXT)).toBe(1);
      expect(getTaskPriority(TaskType.BACKGROUND)).toBe(0);
    });

    it('should have default higher priority than background', () => {
      expect(getTaskPriority(TaskType.DEFAULT)).toBeGreaterThan(
        getTaskPriority(TaskType.BACKGROUND)
      );
    });
  });
});
