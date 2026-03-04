/**
 * Property-Based Tests for Quiz Content Distribution
 * Feature: rag-knowledge-base, Property 7: Quiz Content Balance
 * Validates: Requirements 15.1, 6.2
 * 
 * Tests that quiz content maintains balanced distribution (40% theory, 30% safety, 20% practical, 10% tools)
 */

import { describe, it, expect } from 'vitest';
import { getMixedQuizContent, calculateQuizDifficulty, estimateQuizTime } from '@/lib/quiz-helper';

describe('Property 7: Quiz Content Balance', () => {
  // Property: For any quiz size, content distribution should approximate 40/30/20/10 ratio
  
  it('should maintain 40/30/20/10 distribution for 10 questions', async () => {
    const { content, distribution } = await getMixedQuizContent('module-1', 'TT', 10);
    
    expect(content.length).toBe(10);
    
    // Expected: 4 theory, 3 safety, 2 practical, 1 tools
    expect(distribution.theory).toBeCloseTo(4, 1); // Allow ±1
    expect(distribution.safety).toBeCloseTo(3, 1);
    expect(distribution.practical).toBeCloseTo(2, 1);
    expect(distribution.tools).toBeCloseTo(1, 1);
    
    // Verify total
    const total = distribution.theory + distribution.safety + distribution.practical + distribution.tools;
    expect(total).toBe(10);
  });
  
  it('should maintain distribution ratio for 20 questions', async () => {
    const { content, distribution } = await getMixedQuizContent('module-1', 'TT', 20);
    
    expect(content.length).toBeLessThanOrEqual(20);
    
    // Expected: 8 theory, 6 safety, 4 practical, 2 tools
    const total = distribution.theory + distribution.safety + distribution.practical + distribution.tools;
    
    // Check ratios
    const theoryRatio = distribution.theory / total;
    const safetyRatio = distribution.safety / total;
    const practicalRatio = distribution.practical / total;
    const toolsRatio = distribution.tools / total;
    
    expect(theoryRatio).toBeCloseTo(0.4, 1); // 40% ±10%
    expect(safetyRatio).toBeCloseTo(0.3, 1); // 30% ±10%
    expect(practicalRatio).toBeCloseTo(0.2, 1); // 20% ±10%
    expect(toolsRatio).toBeCloseTo(0.1, 1); // 10% ±10%
  });
  
  it('should maintain distribution for different quiz sizes', async () => {
    const sizes = [5, 10, 15, 20];
    
    for (const size of sizes) {
      const { content, distribution } = await getMixedQuizContent('module-1', 'TT', size);
      
      const total = distribution.theory + distribution.safety + distribution.practical + distribution.tools;
      
      // Total should match requested size (or be close if content is limited)
      expect(total).toBeLessThanOrEqual(size);
      expect(total).toBeGreaterThan(0);
      
      // Check that all content types are represented
      expect(distribution.theory).toBeGreaterThan(0);
      expect(distribution.safety).toBeGreaterThan(0);
      
      // Ratios should be approximately correct
      if (total >= 10) {
        const theoryRatio = distribution.theory / total;
        const safetyRatio = distribution.safety / total;
        
        expect(theoryRatio).toBeGreaterThan(0.25); // At least 25%
        expect(theoryRatio).toBeLessThan(0.55); // At most 55%
        expect(safetyRatio).toBeGreaterThan(0.15); // At least 15%
        expect(safetyRatio).toBeLessThan(0.45); // At most 45%
      }
    }
  });
  
  it('should include all specified content types', async () => {
    const { content } = await getMixedQuizContent('module-1', 'TT', 10);
    
    const contentTypes = new Set(content.map(c => c.content_type));
    
    // Should include theory and safety at minimum
    expect(contentTypes.has('theory')).toBe(true);
    expect(contentTypes.has('safety')).toBe(true);
  });
  
  it('should prioritize high-priority safety content', async () => {
    const { content } = await getMixedQuizContent('module-1', 'TT', 10);
    
    const safetyContent = content.filter(c => c.content_type === 'safety');
    
    // All safety content should have priority >= 8
    safetyContent.forEach(item => {
      expect(item.priority).toBeGreaterThanOrEqual(8);
    });
  });
  
  it('should shuffle content for random question order', async () => {
    const result1 = await getMixedQuizContent('module-1', 'TT', 10);
    const result2 = await getMixedQuizContent('module-1', 'TT', 10);
    
    // Content types should be in different orders (with high probability)
    const types1 = result1.content.map(c => c.content_type).join(',');
    const types2 = result2.content.map(c => c.content_type).join(',');
    
    // Orders should be different (unless we're very unlucky)
    if (result1.content.length > 3 && result2.content.length > 3) {
      expect(types1).not.toBe(types2);
    }
  });
  
  it('should work with different trade types', async () => {
    const ttResult = await getMixedQuizContent('module-1', 'TT', 10);
    const tpResult = await getMixedQuizContent('module-1', 'TP', 10);
    
    // Both should return content
    expect(ttResult.content.length).toBeGreaterThan(0);
    expect(tpResult.content.length).toBeGreaterThan(0);
    
    // All TT content should be TT
    ttResult.content.forEach(item => {
      expect(item.trade_type).toBe('TT');
    });
    
    // All TP content should be TP
    tpResult.content.forEach(item => {
      expect(item.trade_type).toBe('TP');
    });
  });
  
  it('should calculate difficulty based on content', async () => {
    const { content } = await getMixedQuizContent('module-1', 'TT', 10);
    
    const difficulty = calculateQuizDifficulty(content);
    
    expect(['easy', 'medium', 'hard']).toContain(difficulty);
    
    // High safety content should result in easier quiz
    const safetyRatio = content.filter(c => c.content_type === 'safety').length / content.length;
    if (safetyRatio > 0.4) {
      expect(difficulty).toBe('easy');
    }
  });
  
  it('should estimate time based on difficulty', () => {
    const easyTime = estimateQuizTime(10, 'easy');
    const mediumTime = estimateQuizTime(10, 'medium');
    const hardTime = estimateQuizTime(10, 'hard');
    
    // Easy should take less time than medium, medium less than hard
    expect(easyTime).toBeLessThan(mediumTime);
    expect(mediumTime).toBeLessThan(hardTime);
    
    // Reasonable time ranges (in seconds)
    expect(easyTime).toBe(300); // 10 * 30 seconds
    expect(mediumTime).toBe(450); // 10 * 45 seconds
    expect(hardTime).toBe(600); // 10 * 60 seconds
  });
  
  it('should maintain content quality across distribution', async () => {
    const { content } = await getMixedQuizContent('module-1', 'TT', 10);
    
    // All content should have minimum quality standards
    content.forEach(item => {
      expect(item.content).toBeTruthy();
      expect(item.content.length).toBeGreaterThan(50); // Minimum content length
      expect(item.module_name).toBeTruthy();
      expect(item.priority).toBeGreaterThan(0);
      expect(item.priority).toBeLessThanOrEqual(10);
      expect(item.word_count).toBeGreaterThan(0);
    });
  });
});
