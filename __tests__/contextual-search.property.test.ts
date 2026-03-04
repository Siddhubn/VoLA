/**
 * Property-Based Tests for Contextual Search Adaptation
 * Feature: rag-knowledge-base, Property 6: Context Adaptation
 * Validates: Requirements 14.2, 14.3
 * 
 * Tests that user level and focus area correctly adapt search results
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { contextualSearch, generateEmbedding, type UserContext } from '@/lib/rag-helper';
import { query } from '@/lib/postgresql';

describe('Property 6: Context Adaptation', () => {
  // Property: For any search query and user context, results should be adapted based on user level and focus area
  
  it('should prioritize high-priority content for beginner users', async () => {
    const testQuery = 'electrical safety procedures';
    const embedding = await generateEmbedding(testQuery);
    
    const beginnerContext: UserContext = {
      userLevel: 'beginner',
      tradeType: 'TT',
      trade: 'electrician'
    };
    
    const results = await contextualSearch(testQuery, embedding, beginnerContext, 10);
    
    // Property: Beginner results should have higher average priority
    if (results.length > 0) {
      const avgPriority = results.reduce((sum, r) => sum + r.priority, 0) / results.length;
      expect(avgPriority).toBeGreaterThanOrEqual(6); // Minimum priority 6 for beginners
      
      // All results should meet minimum priority threshold
      results.forEach(result => {
        expect(result.priority).toBeGreaterThanOrEqual(6);
      });
    }
  });
  
  it('should allow lower priority content for advanced users', async () => {
    const testQuery = 'advanced circuit analysis techniques';
    const embedding = await generateEmbedding(testQuery);
    
    const advancedContext: UserContext = {
      userLevel: 'advanced',
      tradeType: 'TT',
      trade: 'electrician'
    };
    
    const results = await contextualSearch(testQuery, embedding, advancedContext, 10);
    
    // Property: Advanced results can include lower priority content
    if (results.length > 0) {
      const minPriority = Math.min(...results.map(r => r.priority));
      expect(minPriority).toBeLessThan(6); // Can include priority < 6
    }
  });
  
  it('should prioritize focus area content when specified', async () => {
    const testQuery = 'electrical work procedures';
    const embedding = await generateEmbedding(testQuery);
    
    const safetyContext: UserContext = {
      userLevel: 'intermediate',
      focusArea: 'safety',
      tradeType: 'TT',
      trade: 'electrician'
    };
    
    const results = await contextualSearch(testQuery, embedding, safetyContext, 10);
    
    // Property: When focus area is safety, safety content should be prominent
    if (results.length > 0) {
      const safetyCount = results.filter(r => r.content_type === 'safety').length;
      const safetyRatio = safetyCount / results.length;
      
      // At least 30% should be safety content when safety is focus area
      expect(safetyRatio).toBeGreaterThanOrEqual(0.3);
    }
  });
  
  it('should boost current module content when specified', async () => {
    const testQuery = 'basic electrical concepts';
    const embedding = await generateEmbedding(testQuery);
    
    const moduleContext: UserContext = {
      userLevel: 'intermediate',
      currentModule: 'module-1',
      tradeType: 'TT',
      trade: 'electrician'
    };
    
    const results = await contextualSearch(testQuery, embedding, moduleContext, 10);
    
    // Property: When current module is specified, that module should be prominent
    if (results.length > 0) {
      const module1Count = results.filter(r => r.module_number === 1).length;
      const module1Ratio = module1Count / results.length;
      
      // At least 40% should be from the current module
      expect(module1Ratio).toBeGreaterThanOrEqual(0.4);
    }
  });
  
  it('should filter by trade type when specified', async () => {
    const testQuery = 'electrical theory fundamentals';
    const embedding = await generateEmbedding(testQuery);
    
    const ttContext: UserContext = {
      userLevel: 'intermediate',
      tradeType: 'TT',
      trade: 'electrician'
    };
    
    const results = await contextualSearch(testQuery, embedding, ttContext, 10);
    
    // Property: All results should match the specified trade type
    results.forEach(result => {
      expect(result.trade_type).toBe('TT');
    });
  });
  
  it('should adapt semantic matching strictness by user level', async () => {
    const testQuery = 'ohms law applications';
    const embedding = await generateEmbedding(testQuery);
    
    // Test with beginner (strict matching)
    const beginnerContext: UserContext = {
      userLevel: 'beginner',
      tradeType: 'TT',
      trade: 'electrician'
    };
    
    const beginnerResults = await contextualSearch(testQuery, embedding, beginnerContext, 10);
    
    // Test with advanced (flexible matching)
    const advancedContext: UserContext = {
      userLevel: 'advanced',
      tradeType: 'TT',
      trade: 'electrician'
    };
    
    const advancedResults = await contextualSearch(testQuery, embedding, advancedContext, 10);
    
    // Property: Advanced users should get more results due to flexible matching
    // (maxDistance is higher for advanced users)
    if (beginnerResults.length > 0 && advancedResults.length > 0) {
      expect(advancedResults.length).toBeGreaterThanOrEqual(beginnerResults.length);
    }
  });
  
  it('should maintain result quality across different contexts', async () => {
    const testQuery = 'electrical safety equipment';
    const embedding = await generateEmbedding(testQuery);
    
    const contexts: UserContext[] = [
      { userLevel: 'beginner', tradeType: 'TT', trade: 'electrician' },
      { userLevel: 'intermediate', tradeType: 'TT', trade: 'electrician' },
      { userLevel: 'advanced', tradeType: 'TT', trade: 'electrician' }
    ];
    
    // Property: All contexts should return relevant results
    for (const context of contexts) {
      const results = await contextualSearch(testQuery, embedding, context, 5);
      
      // Should return some results
      expect(results.length).toBeGreaterThan(0);
      
      // All results should have content
      results.forEach(result => {
        expect(result.content).toBeTruthy();
        expect(result.content.length).toBeGreaterThan(0);
      });
    }
  });
  
  it('should combine multiple context factors correctly', async () => {
    const testQuery = 'safety procedures for electrical work';
    const embedding = await generateEmbedding(testQuery);
    
    const complexContext: UserContext = {
      userLevel: 'beginner',
      focusArea: 'safety',
      currentModule: 'module-1',
      tradeType: 'TT',
      trade: 'electrician'
    };
    
    const results = await contextualSearch(testQuery, embedding, complexContext, 10);
    
    if (results.length > 0) {
      // Property: Results should reflect all context factors
      
      // 1. High priority (beginner level)
      const avgPriority = results.reduce((sum, r) => sum + r.priority, 0) / results.length;
      expect(avgPriority).toBeGreaterThanOrEqual(6);
      
      // 2. Safety focus
      const safetyCount = results.filter(r => r.content_type === 'safety').length;
      expect(safetyCount).toBeGreaterThan(0);
      
      // 3. Current module preference
      const module1Count = results.filter(r => r.module_number === 1).length;
      expect(module1Count).toBeGreaterThan(0);
      
      // 4. Correct trade type
      results.forEach(result => {
        expect(result.trade_type).toBe('TT');
      });
    }
  });
});
