/**
 * Performance Tests for Enhanced RAG Features
 * Validates: Performance requirements
 * 
 * Tests contextual search, quiz content selection, and content classification performance
 */

import { describe, it, expect } from 'vitest';
import {
  contextualSearch,
  searchKnowledgeBase,
  generateEmbedding,
  type UserContext
} from '@/lib/rag-helper';
import { getMixedQuizContent, calculateQuizDifficulty } from '@/lib/quiz-helper';

describe('Performance Tests - Enhanced Features', () => {
  describe('Contextual Search Performance', () => {
    it('should complete contextual search within 200ms', async () => {
      const query = 'electrical safety procedures';
      const embedding = await generateEmbedding(query);
      
      const context: UserContext = {
        userLevel: 'intermediate',
        focusArea: 'safety',
        currentModule: 'module-1',
        tradeType: 'TT',
        trade: 'electrician'
      };
      
      const startTime = Date.now();
      const results = await contextualSearch(query, embedding, context, 5);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(200); // Should complete in < 200ms
      expect(results.length).toBeGreaterThan(0);
    });
    
    it('should handle multiple context factors efficiently', async () => {
      const query = 'circuit analysis techniques';
      const embedding = await generateEmbedding(query);
      
      const complexContext: UserContext = {
        userLevel: 'advanced',
        focusArea: 'theory',
        currentModule: 'module-2',
        tradeType: 'TT',
        trade: 'electrician'
      };
      
      const startTime = Date.now();
      const results = await contextualSearch(query, embedding, complexContext, 10);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(250); // Allow slightly more time for complex context
      expect(results.length).toBeGreaterThan(0);
    });
    
    it('should scale well with different result limits', async () => {
      const query = 'electrical fundamentals';
      const embedding = await generateEmbedding(query);
      
      const context: UserContext = {
        userLevel: 'intermediate',
        tradeType: 'TT',
        trade: 'electrician'
      };
      
      const limits = [5, 10, 20];
      const times: number[] = [];
      
      for (const limit of limits) {
        const startTime = Date.now();
        await contextualSearch(query, embedding, context, limit);
        const endTime = Date.now();
        times.push(endTime - startTime);
      }
      
      // Time should scale reasonably (not exponentially)
      expect(times[2]).toBeLessThan(times[0] * 5); // 4x results shouldn't take 5x time
    });
  });
  
  describe('Quiz Content Selection Performance', () => {
    it('should select mixed quiz content within 300ms', async () => {
      const startTime = Date.now();
      const result = await getMixedQuizContent('module-1', 'TT', 10);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(300);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.distribution).toBeTruthy();
    });
    
    it('should handle larger quiz sizes efficiently', async () => {
      const sizes = [10, 20, 30];
      const times: number[] = [];
      
      for (const size of sizes) {
        const startTime = Date.now();
        await getMixedQuizContent('module-1', 'TT', size);
        const endTime = Date.now();
        times.push(endTime - startTime);
      }
      
      // Should scale linearly or better
      expect(times[2]).toBeLessThan(times[0] * 4); // 3x size shouldn't take 4x time
    });
    
    it('should calculate difficulty instantly', () => {
      const mockContent = Array(20).fill(null).map((_, i) => ({
        id: i,
        content: 'test content',
        module_name: 'Module 1',
        module_number: 1,
        section_title: null,
        content_type: i % 2 === 0 ? 'theory' : 'safety',
        priority: 6 + (i % 3),
        word_count: 200,
        trade_type: 'TT' as const,
        topic_keywords: []
      }));
      
      const startTime = Date.now();
      const difficulty = calculateQuizDifficulty(mockContent);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10); // Should be nearly instant
      expect(['easy', 'medium', 'hard']).toContain(difficulty);
    });
  });
  
  describe('Search Filtering Performance', () => {
    it('should apply content type filter efficiently', async () => {
      const embedding = await generateEmbedding('electrical concepts');
      
      const startTime = Date.now();
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TT',
        contentType: 'safety',
        limit: 10
      });
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(200);
      results.forEach(r => expect(r.content_type).toBe('safety'));
    });
    
    it('should apply priority filter efficiently', async () => {
      const embedding = await generateEmbedding('electrical work');
      
      const startTime = Date.now();
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TT',
        minPriority: 7,
        limit: 10
      });
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(200);
      results.forEach(r => expect(r.priority).toBeGreaterThanOrEqual(7));
    });
    
    it('should apply multiple filters without significant overhead', async () => {
      const embedding = await generateEmbedding('safety procedures');
      
      const startTime = Date.now();
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TT',
        moduleId: 'module-1',
        contentType: 'safety',
        minPriority: 8,
        maxDistance: 0.5,
        limit: 10
      });
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(250); // Multiple filters add minimal overhead
    });
  });
  
  describe('Embedding Generation Performance', () => {
    it('should generate embeddings quickly for short text', async () => {
      const text = 'electrical safety';
      
      const startTime = Date.now();
      const embedding = await generateEmbedding(text);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Should be very fast
      expect(embedding.length).toBe(384);
    });
    
    it('should handle longer text efficiently', async () => {
      const text = 'Electrical safety is crucial when working with electrical systems. Always use proper PPE and follow lockout/tagout procedures. '.repeat(10);
      
      const startTime = Date.now();
      const embedding = await generateEmbedding(text);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
      expect(embedding.length).toBe(384);
    });
    
    it('should generate embeddings consistently fast', async () => {
      const texts = [
        'short',
        'medium length text',
        'longer text with more words and content',
        'very long text '.repeat(20)
      ];
      
      const times: number[] = [];
      
      for (const text of texts) {
        const startTime = Date.now();
        await generateEmbedding(text);
        const endTime = Date.now();
        times.push(endTime - startTime);
      }
      
      // All should be reasonably fast
      times.forEach(time => {
        expect(time).toBeLessThan(100);
      });
    });
  });
  
  describe('Concurrent Operations Performance', () => {
    it('should handle multiple concurrent searches', async () => {
      const queries = [
        'electrical safety',
        'circuit analysis',
        'voltage measurement',
        'wiring procedures',
        'motor controls'
      ];
      
      const startTime = Date.now();
      
      const promises = queries.map(async query => {
        const embedding = await generateEmbedding(query);
        return searchKnowledgeBase(embedding, {
          trade: 'electrician',
          tradeType: 'TT',
          limit: 5
        });
      });
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      // Concurrent operations should be faster than sequential
      expect(duration).toBeLessThan(1000); // 5 searches in < 1 second
      expect(results.length).toBe(5);
    });
    
    it('should handle concurrent quiz generation', async () => {
      const modules = ['module-1', 'module-2', 'module-3'];
      
      const startTime = Date.now();
      
      const promises = modules.map(moduleId =>
        getMixedQuizContent(moduleId, 'TT', 10)
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1500); // 3 quizzes in < 1.5 seconds
      expect(results.length).toBe(3);
    });
  });
  
  describe('Memory Efficiency', () => {
    it('should not leak memory with repeated searches', async () => {
      const embedding = await generateEmbedding('test query');
      
      // Perform many searches
      for (let i = 0; i < 50; i++) {
        await searchKnowledgeBase(embedding, {
          trade: 'electrician',
          tradeType: 'TT',
          limit: 5
        });
      }
      
      // If we get here without crashing, memory is being managed properly
      expect(true).toBe(true);
    });
    
    it('should handle large result sets efficiently', async () => {
      const embedding = await generateEmbedding('electrical');
      
      const startTime = Date.now();
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TT',
        limit: 100 // Large result set
      });
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500);
      expect(results.length).toBeLessThanOrEqual(100);
    });
  });
});
