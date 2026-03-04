/**
 * Unit Tests for Quiz Helper Functions
 * Validates: Requirements 15.2, 15.3, 6.5
 * 
 * Tests content selection, difficulty calculation, and time estimation
 */

import { describe, it, expect } from 'vitest';
import {
  getQuizContent,
  getSafetyQuestions,
  getToolsQuestions,
  getMixedQuizContent,
  getContentByType,
  calculateQuizDifficulty,
  estimateQuizTime,
  formatQuizTime,
  type QuizContent
} from '@/lib/quiz-helper';

describe('Quiz Helper - getQuizContent', () => {
  it('should get quiz content for a module', async () => {
    const content = await getQuizContent('module-1', 'TT', 10);
    
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);
    
    content.forEach(item => {
      expect(item).toHaveProperty('content');
      expect(item).toHaveProperty('module_name');
      expect(item).toHaveProperty('content_type');
      expect(item).toHaveProperty('priority');
      expect(item.trade_type).toBe('TT');
    });
  });
  
  it('should prioritize theory and definitions', async () => {
    const content = await getQuizContent('module-1', 'TT', 20);
    
    const theoryCount = content.filter(c => c.content_type === 'theory').length;
    const definitionCount = content.filter(c => c.content_type === 'definition').length;
    const combined = theoryCount + definitionCount;
    
    // Theory and definitions should be prominent
    expect(combined).toBeGreaterThan(content.length * 0.3);
  });
  
  it('should filter by word count', async () => {
    const content = await getQuizContent('module-1', 'TT', 10);
    
    content.forEach(item => {
      expect(item.word_count).toBeGreaterThan(100);
      expect(item.word_count).toBeLessThan(800);
    });
  });
});

describe('Quiz Helper - getSafetyQuestions', () => {
  it('should get high-priority safety content', async () => {
    const content = await getSafetyQuestions('TT', 'module-1', 5);
    
    expect(Array.isArray(content)).toBe(true);
    
    content.forEach(item => {
      expect(item.content_type).toBe('safety');
      expect(item.priority).toBeGreaterThanOrEqual(8);
      expect(item.trade_type).toBe('TT');
    });
  });
  
  it('should work without module filter', async () => {
    const content = await getSafetyQuestions('TT', undefined, 5);
    
    content.forEach(item => {
      expect(item.content_type).toBe('safety');
      expect(item.priority).toBeGreaterThanOrEqual(8);
    });
  });
  
  it('should respect count limit', async () => {
    const content = await getSafetyQuestions('TT', 'module-1', 3);
    
    expect(content.length).toBeLessThanOrEqual(3);
  });
});

describe('Quiz Helper - getToolsQuestions', () => {
  it('should get tools content', async () => {
    const content = await getToolsQuestions('module-1', 'TT', 5);
    
    expect(Array.isArray(content)).toBe(true);
    
    content.forEach(item => {
      expect(item.content_type).toBe('tools');
      expect(item.trade_type).toBe('TT');
      expect(item.word_count).toBeGreaterThan(100);
    });
  });
  
  it('should order by priority', async () => {
    const content = await getToolsQuestions('module-1', 'TT', 10);
    
    if (content.length > 1) {
      for (let i = 0; i < content.length - 1; i++) {
        expect(content[i].priority).toBeGreaterThanOrEqual(content[i + 1].priority);
      }
    }
  });
});

describe('Quiz Helper - getMixedQuizContent', () => {
  it('should return mixed content with distribution', async () => {
    const result = await getMixedQuizContent('module-1', 'TT', 10);
    
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('distribution');
    expect(Array.isArray(result.content)).toBe(true);
    expect(typeof result.distribution).toBe('object');
  });
  
  it('should include distribution breakdown', async () => {
    const { distribution } = await getMixedQuizContent('module-1', 'TT', 10);
    
    expect(distribution).toHaveProperty('theory');
    expect(distribution).toHaveProperty('safety');
    expect(distribution).toHaveProperty('practical');
    expect(distribution).toHaveProperty('tools');
    
    // All should be numbers
    expect(typeof distribution.theory).toBe('number');
    expect(typeof distribution.safety).toBe('number');
    expect(typeof distribution.practical).toBe('number');
    expect(typeof distribution.tools).toBe('number');
  });
  
  it('should match distribution to actual content', async () => {
    const { content, distribution } = await getMixedQuizContent('module-1', 'TT', 10);
    
    const actualTheory = content.filter(c => c.content_type === 'theory').length;
    const actualSafety = content.filter(c => c.content_type === 'safety').length;
    const actualPractical = content.filter(c => c.content_type === 'practical').length;
    const actualTools = content.filter(c => c.content_type === 'tools').length;
    
    expect(distribution.theory).toBe(actualTheory);
    expect(distribution.safety).toBe(actualSafety);
    expect(distribution.practical).toBe(actualPractical);
    expect(distribution.tools).toBe(actualTools);
  });
});

describe('Quiz Helper - getContentByType', () => {
  it('should get content of specific type', async () => {
    const content = await getContentByType('theory', 'TT', 'module-1', 10);
    
    content.forEach(item => {
      expect(item.content_type).toBe('theory');
      expect(item.trade_type).toBe('TT');
    });
  });
  
  it('should work without module filter', async () => {
    const content = await getContentByType('practical', 'TT', undefined, 10);
    
    content.forEach(item => {
      expect(item.content_type).toBe('practical');
    });
  });
  
  it('should filter by word count', async () => {
    const content = await getContentByType('theory', 'TT', 'module-1', 10);
    
    content.forEach(item => {
      expect(item.word_count).toBeGreaterThan(100);
    });
  });
});

describe('Quiz Helper - calculateQuizDifficulty', () => {
  it('should return easy for high-priority content', () => {
    const content: QuizContent[] = [
      { id: 1, content: 'test', module_name: 'M1', module_number: 1, section_title: null, 
        content_type: 'safety', priority: 9, word_count: 200, trade_type: 'TT', topic_keywords: [] },
      { id: 2, content: 'test', module_name: 'M1', module_number: 1, section_title: null, 
        content_type: 'safety', priority: 8, word_count: 200, trade_type: 'TT', topic_keywords: [] },
      { id: 3, content: 'test', module_name: 'M1', module_number: 1, section_title: null, 
        content_type: 'theory', priority: 8, word_count: 200, trade_type: 'TT', topic_keywords: [] }
    ];
    
    const difficulty = calculateQuizDifficulty(content);
    expect(difficulty).toBe('easy');
  });
  
  it('should return medium for balanced content', () => {
    const content: QuizContent[] = [
      { id: 1, content: 'test', module_name: 'M1', module_number: 1, section_title: null, 
        content_type: 'theory', priority: 6, word_count: 200, trade_type: 'TT', topic_keywords: [] },
      { id: 2, content: 'test', module_name: 'M1', module_number: 1, section_title: null, 
        content_type: 'theory', priority: 7, word_count: 200, trade_type: 'TT', topic_keywords: [] },
      { id: 3, content: 'test', module_name: 'M1', module_number: 1, section_title: null, 
        content_type: 'practical', priority: 6, word_count: 200, trade_type: 'TT', topic_keywords: [] }
    ];
    
    const difficulty = calculateQuizDifficulty(content);
    expect(difficulty).toBe('medium');
  });
  
  it('should return hard for low-priority practical content', () => {
    const content: QuizContent[] = [
      { id: 1, content: 'test', module_name: 'M1', module_number: 1, section_title: null, 
        content_type: 'practical', priority: 4, word_count: 200, trade_type: 'TT', topic_keywords: [] },
      { id: 2, content: 'test', module_name: 'M1', module_number: 1, section_title: null, 
        content_type: 'tools', priority: 5, word_count: 200, trade_type: 'TT', topic_keywords: [] },
      { id: 3, content: 'test', module_name: 'M1', module_number: 1, section_title: null, 
        content_type: 'practical', priority: 5, word_count: 200, trade_type: 'TT', topic_keywords: [] }
    ];
    
    const difficulty = calculateQuizDifficulty(content);
    expect(difficulty).toBe('hard');
  });
  
  it('should return medium for empty content', () => {
    const difficulty = calculateQuizDifficulty([]);
    expect(difficulty).toBe('medium');
  });
});

describe('Quiz Helper - estimateQuizTime', () => {
  it('should estimate time for easy quiz', () => {
    const time = estimateQuizTime(10, 'easy');
    expect(time).toBe(300); // 10 * 30 seconds
  });
  
  it('should estimate time for medium quiz', () => {
    const time = estimateQuizTime(10, 'medium');
    expect(time).toBe(450); // 10 * 45 seconds
  });
  
  it('should estimate time for hard quiz', () => {
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

describe('Quiz Helper - formatQuizTime', () => {
  it('should format seconds only', () => {
    const formatted = formatQuizTime(45);
    expect(formatted).toBe('45 seconds');
  });
  
  it('should format minutes only', () => {
    const formatted = formatQuizTime(120);
    expect(formatted).toBe('2 minutes');
  });
  
  it('should format minutes and seconds', () => {
    const formatted = formatQuizTime(135);
    expect(formatted).toBe('2 minutes 15 seconds');
  });
  
  it('should handle singular minute', () => {
    const formatted = formatQuizTime(60);
    expect(formatted).toBe('1 minute');
  });
  
  it('should handle singular minute with seconds', () => {
    const formatted = formatQuizTime(75);
    expect(formatted).toBe('1 minute 15 seconds');
  });
});
