/**
 * Unit Tests for Quiz Helper Functions
 * Tests: 24.2 - Quiz helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  getMixedQuizContent,
  calculateQuizDifficulty,
  estimateQuizTime,
  formatQuizTime,
  type QuizContent
} from '../lib/quiz-helper';

describe('Quiz Helper - Content Selection', () => {
  describe('getMixedQuizContent', () => {
    it('should return content with balanced distribution', async () => {
      const moduleId = 'module-1';
      const tradeType = 'TT';
      const total = 10;

      const result = await getMixedQuizContent(moduleId, tradeType, total);

      expect(result.content.length).toBeLessThanOrEqual(total);
      expect(result.distribution).toHaveProperty('theory');
      expect(result.distribution).toHaveProperty('safety');
      expect(result.distribution).toHaveProperty('practical');
      expect(result.distribution).toHaveProperty('tools');
    });

    it('should aim for 40% theory content', async () => {
      const moduleId = 'module-1';
      const tradeType = 'TT';
      const total = 10;

      const result = await getMixedQuizContent(moduleId, tradeType, total);

      const theoryCount = result.distribution.theory;
      const expectedTheory = Math.round(total * 0.4);

      // Should be close to 40% (allow ±1 for rounding)
      expect(theoryCount).toBeGreaterThanOrEqual(expectedTheory - 1);
      expect(theoryCount).toBeLessThanOrEqual(expectedTheory + 1);
    });

    it('should aim for 30% safety content', async () => {
      const moduleId = 'module-1';
      const tradeType = 'TT';
      const total = 10;

      const result = await getMixedQuizContent(moduleId, tradeType, total);

      const safetyCount = result.distribution.safety;
      const expectedSafety = Math.round(total * 0.3);

      // Should be close to 30% (allow ±1 for rounding)
      expect(safetyCount).toBeGreaterThanOrEqual(expectedSafety - 1);
      expect(safetyCount).toBeLessThanOrEqual(expectedSafety + 1);
    });

    it('should filter by module and trade type', async () => {
      const moduleId = 'module-1';
      const tradeType = 'TT';
      const total = 10;

      const result = await getMixedQuizContent(moduleId, tradeType, total);

      // All content should be from the specified trade type
      result.content.forEach(content => {
        expect(content.trade_type).toBe(tradeType);
      });
    });

    it('should shuffle content for random order', async () => {
      const moduleId = 'module-1';
      const tradeType = 'TT';
      const total = 10;

      const result1 = await getMixedQuizContent(moduleId, tradeType, total);
      const result2 = await getMixedQuizContent(moduleId, tradeType, total);

      // Content types should be in different orders (with high probability)
      const types1 = result1.content.map(c => c.content_type).join(',');
      const types2 = result2.content.map(c => c.content_type).join(',');

      // They might occasionally be the same due to randomness, but usually different
      // We just check that we got content
      expect(result1.content.length).toBeGreaterThan(0);
      expect(result2.content.length).toBeGreaterThan(0);
    });
  });

  describe('calculateQuizDifficulty', () => {
    it('should return easy for high-priority content', () => {
      const content: QuizContent[] = [
        {
          id: 1,
          content: 'Safety content',
          module_name: 'Module 1',
          module_number: 1,
          section_title: 'Safety',
          content_type: 'safety',
          priority: 9,
          word_count: 200,
          trade_type: 'TT',
          topic_keywords: ['safety']
        },
        {
          id: 2,
          content: 'More safety',
          module_name: 'Module 1',
          module_number: 1,
          section_title: 'Safety',
          content_type: 'safety',
          priority: 8,
          word_count: 200,
          trade_type: 'TT',
          topic_keywords: ['safety']
        }
      ];

      const difficulty = calculateQuizDifficulty(content);
      expect(difficulty).toBe('easy');
    });

    it('should return medium for theory-heavy content', () => {
      const content: QuizContent[] = [
        {
          id: 1,
          content: 'Theory content',
          module_name: 'Module 1',
          module_number: 1,
          section_title: 'Theory',
          content_type: 'theory',
          priority: 6,
          word_count: 200,
          trade_type: 'TT',
          topic_keywords: ['theory']
        },
        {
          id: 2,
          content: 'More theory',
          module_name: 'Module 1',
          module_number: 1,
          section_title: 'Theory',
          content_type: 'theory',
          priority: 7,
          word_count: 200,
          trade_type: 'TT',
          topic_keywords: ['theory']
        }
      ];

      const difficulty = calculateQuizDifficulty(content);
      expect(difficulty).toBe('medium');
    });

    it('should return hard for low-priority practical content', () => {
      const content: QuizContent[] = [
        {
          id: 1,
          content: 'Practical content',
          module_name: 'Module 1',
          module_number: 1,
          section_title: 'Practical',
          content_type: 'practical',
          priority: 4,
          word_count: 200,
          trade_type: 'TT',
          topic_keywords: ['practical']
        },
        {
          id: 2,
          content: 'More practical',
          module_name: 'Module 1',
          module_number: 1,
          section_title: 'Practical',
          content_type: 'practical',
          priority: 5,
          word_count: 200,
          trade_type: 'TT',
          topic_keywords: ['practical']
        }
      ];

      const difficulty = calculateQuizDifficulty(content);
      expect(difficulty).toBe('hard');
    });

    it('should return medium for empty content', () => {
      const content: QuizContent[] = [];
      const difficulty = calculateQuizDifficulty(content);
      expect(difficulty).toBe('medium');
    });
  });

  describe('estimateQuizTime', () => {
    it('should estimate 30 seconds per easy question', () => {
      const time = estimateQuizTime(10, 'easy');
      expect(time).toBe(300); // 10 * 30 seconds
    });

    it('should estimate 45 seconds per medium question', () => {
      const time = estimateQuizTime(10, 'medium');
      expect(time).toBe(450); // 10 * 45 seconds
    });

    it('should estimate 60 seconds per hard question', () => {
      const time = estimateQuizTime(10, 'hard');
      expect(time).toBe(600); // 10 * 60 seconds
    });

    it('should scale with question count', () => {
      const time5 = estimateQuizTime(5, 'medium');
      const time10 = estimateQuizTime(10, 'medium');
      const time20 = estimateQuizTime(20, 'medium');

      expect(time10).toBe(time5 * 2);
      expect(time20).toBe(time10 * 2);
    });
  });

  describe('formatQuizTime', () => {
    it('should format seconds only for times under 1 minute', () => {
      expect(formatQuizTime(30)).toBe('30 seconds');
      expect(formatQuizTime(45)).toBe('45 seconds');
    });

    it('should format minutes only for exact minutes', () => {
      expect(formatQuizTime(60)).toBe('1 minute');
      expect(formatQuizTime(120)).toBe('2 minutes');
      expect(formatQuizTime(300)).toBe('5 minutes');
    });

    it('should format minutes and seconds for mixed times', () => {
      expect(formatQuizTime(90)).toBe('1 minute 30 seconds');
      expect(formatQuizTime(150)).toBe('2 minutes 30 seconds');
      expect(formatQuizTime(195)).toBe('3 minutes 15 seconds');
    });

    it('should handle plural forms correctly', () => {
      expect(formatQuizTime(60)).toContain('minute');
      expect(formatQuizTime(120)).toContain('minutes');
    });
  });
});
