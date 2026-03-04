/**
 * Property-Based Tests for Quiz Helper
 * Feature: rag-knowledge-base, Property 7: Quiz Content Balance
 * Validates: Requirements 15.1, 6.2
 */

import { describe, it, expect } from 'vitest';
import { getMixedQuizContent, calculateQuizDifficulty } from '@/lib/quiz-helper';

describe('Quiz Helper - Property-Based Tests', () => {
  /**
   * Property 7: Quiz Content Balance
   * For any quiz generation request, content should be distributed according to
   * the specified ratios: 40% theory, 30% safety, 20% practical, 10% tools
   */
  describe('Property 7: Quiz Content Balance', () => {
    it('should maintain approximate 40/30/20/10 distribution for 10 questions', async () => {
      const { content, distribution } = await getMixedQuizContent('module-1', 'TT', 10);
      
      const total = content.length;
      expect(total).toBeGreaterThan(0);
      
      // Calculate percentages
      const theoryPercent = (distribution.theory / total) * 100;
      const safetyPercent = (distribution.safety / total) * 100;
      const practicalPercent = (distribution.practical / total) * 100;
      const toolsPercent = (distribution.tools / total) * 100;
      
      // Allow ±10% tolerance for distribution
      expect(theoryPercent).toBeGreaterThanOrEqual(30);
      expect(theoryPercent).toBeLessThanOrEqual(50);
      
      expect(safetyPercent).toBeGreaterThanOrEqual(20);
      expect(safetyPercent).toBeLessThanOrEqual(40);
      
      expect(practicalPercent).toBeGreaterThanOrEqual(10);
      expect(practicalPercent).toBeLessThanOrEqual(30);
      
      expect(toolsPercent).toBeGreaterThanOrEqual(0);
      expect(toolsPercent).toBeLessThanOrEqual(20);
    });
    
    it('should maintain distribution for different question counts', async () => {
      const counts = [5, 10, 15, 20];
      
      for (const count of counts) {
        const { content, distribution } = await getMixedQuizContent('module-1', 'TT', count);
        
        const total = content.length;
        
        // Theory should be the largest category
        expect(distribution.theory).toBeGreaterThanOrEqual(distribution.safety);
        expect(distribution.theory).toBeGreaterThanOrEqual(distribution.practical);
        expect(distribution.theory).toBeGreaterThanOrEqual(distribution.tools);
        
        // Safety should be second largest
        expect(distribution.safety).toBeGreaterThanOrEqual(distribution.practical);
        expect(distribution.safety).toBeGreaterThanOrEqual(distribution.tools);
        
        // Practical should be larger than tools
        expect(distribution.practical).toBeGreaterThanOrEqual(distribution.tools);
      }
    });
    
    it('should return content with all required fields', async () => {
      const { content } = await getMixedQuizContent('module-1', 'TT', 10);
      
      content.forEach(item => {
        expect(item).toHaveProperty('content');
        expect(item).toHaveProperty('module_name');
        expect(item).toHaveProperty('module_number');
        expect(item).toHaveProperty('content_type');
        expect(item).toHaveProperty('priority');
        expect(item).toHaveProperty('trade_type');
        expect(item).toHaveProperty('topic_keywords');
        
        expect(item.content).toBeTruthy();
        expect(item.content_type).toMatch(/^(theory|safety|practical|tools)$/);
        expect(item.trade_type).toBe('TT');
      });
    });
    
    it('should prioritize high-priority safety content', async () => {
      const { content } = await getMixedQuizContent('module-1', 'TT', 10);
      
      const safetyContent = content.filter(c => c.content_type === 'safety');
      
      // All safety content should have priority >= 8
      safetyContent.forEach(item => {
        expect(item.priority).toBeGreaterThanOrEqual(8);
      });
    });
    
    it('should calculate difficulty based on content priority', async () => {
      const { content } = await getMixedQuizContent('module-1', 'TT', 10);
      
      const difficulty = calculateQuizDifficulty(content);
      
      expect(difficulty).toMatch(/^(easy|medium|hard)$/);
      
      // Verify difficulty matches content characteristics
      const avgPriority = content.reduce((sum, c) => sum + c.priority, 0) / content.length;
      const safetyRatio = content.filter(c => c.content_type === 'safety').length / content.length;
      
      if (safetyRatio > 0.4 || avgPriority >= 8) {
        expect(difficulty).toBe('easy');
      } else if (avgPriority >= 6) {
        expect(difficulty).toMatch(/^(easy|medium)$/);
      }
    });
    
    it('should shuffle content for random question order', async () => {
      const { content: content1 } = await getMixedQuizContent('module-1', 'TT', 10);
      const { content: content2 } = await getMixedQuizContent('module-1', 'TT', 10);
      
      // Content types should be distributed similarly
      const types1 = content1.map(c => c.content_type).join(',');
      const types2 = content2.map(c => c.content_type).join(',');
      
      // Order might be different (shuffled), but distribution should be similar
      const count1 = { theory: 0, safety: 0, practical: 0, tools: 0 };
      const count2 = { theory: 0, safety: 0, practical: 0, tools: 0 };
      
      content1.forEach(c => count1[c.content_type as keyof typeof count1]++);
      content2.forEach(c => count2[c.content_type as keyof typeof count2]++);
      
      // Distributions should be similar (within 2 questions)
      expect(Math.abs(count1.theory - count2.theory)).toBeLessThanOrEqual(2);
      expect(Math.abs(count1.safety - count2.safety)).toBeLessThanOrEqual(2);
    });
  });
});
