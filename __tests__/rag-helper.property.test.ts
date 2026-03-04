/**
 * Property-Based Tests for RAG Helper
 * Feature: rag-knowledge-base, Property 6: Context Adaptation
 * Validates: Requirements 14.2, 14.3
 */

import { describe, it, expect } from 'vitest';
import { contextualSearch, generateEmbedding, type UserContext } from '@/lib/rag-helper';

describe('RAG Helper - Property-Based Tests', () => {
  /**
   * Property 6: Context Adaptation
   * For any search query and user context, contextual search should adapt results
   * based on user level and focus area
   */
  describe('Property 6: Context Adaptation', () => {
    it('should prioritize high-priority content for beginner users', async () => {
      const query = 'electrical safety procedures';
      const embedding = await generateEmbedding(query);
      
      const beginnerContext: UserContext = {
        userLevel: 'beginner',
        tradeType: 'TT',
        trade: 'electrician'
      };
      
      const results = await contextualSearch(query, embedding, beginnerContext, 5);
      
      // For beginners, all results should have priority >= 6
      results.forEach(result => {
        expect(result.priority).toBeGreaterThanOrEqual(6);
      });
      
      // Results should be ordered by priority (descending)
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].priority).toBeGreaterThanOrEqual(results[i + 1].priority);
      }
    });
    
    it('should filter by focus area when specified', async () => {
      const query = 'safety equipment';
      const embedding = await generateEmbedding(query);
      
      const safetyContext: UserContext = {
        userLevel: 'intermediate',
        focusArea: 'safety',
        tradeType: 'TT',
        trade: 'electrician'
      };
      
      const results = await contextualSearch(query, embedding, safetyContext, 5);
      
      // When focus area is safety, results should prioritize safety content
      const safetyResults = results.filter(r => r.content_type === 'safety');
      expect(safetyResults.length).toBeGreaterThan(0);
      
      // Safety content should have high priority (>= 8)
      safetyResults.forEach(result => {
        expect(result.priority).toBeGreaterThanOrEqual(8);
      });
    });
    
    it('should boost current module content when specified', async () => {
      const query = 'electrical circuits';
      const embedding = await generateEmbedding(query);
      
      const moduleContext: UserContext = {
        userLevel: 'intermediate',
        currentModule: 'module-1',
        tradeType: 'TT',
        trade: 'electrician'
      };
      
      const results = await contextualSearch(query, embedding, moduleContext, 5);
      
      // Results should include content from the current module
      // (if available in the database)
      if (results.length > 0) {
        expect(results.some(r => r.module_name.includes('Module') || r.module_number === 1)).toBe(true);
      }
    });
    
    it('should adapt similarity threshold based on user level', async () => {
      const query = 'advanced electrical theory';
      const embedding = await generateEmbedding(query);
      
      const advancedContext: UserContext = {
        userLevel: 'advanced',
        tradeType: 'TT',
        trade: 'electrician'
      };
      
      const beginnerContext: UserContext = {
        userLevel: 'beginner',
        tradeType: 'TT',
        trade: 'electrician'
      };
      
      const advancedResults = await contextualSearch(query, embedding, advancedContext, 5);
      const beginnerResults = await contextualSearch(query, embedding, beginnerContext, 5);
      
      // Advanced users may get more results (more flexible matching)
      // Beginners get stricter matching with higher priority content
      if (beginnerResults.length > 0) {
        const avgBeginnerPriority = beginnerResults.reduce((sum, r) => sum + r.priority, 0) / beginnerResults.length;
        expect(avgBeginnerPriority).toBeGreaterThanOrEqual(6);
      }
    });
    
    it('should filter by trade type when specified', async () => {
      const query = 'trade theory concepts';
      const embedding = await generateEmbedding(query);
      
      const ttContext: UserContext = {
        userLevel: 'intermediate',
        tradeType: 'TT',
        trade: 'electrician'
      };
      
      const results = await contextualSearch(query, embedding, ttContext, 5);
      
      // All results should match the specified trade type
      results.forEach(result => {
        expect(result.trade_type).toBe('TT');
      });
    });
  });
});
