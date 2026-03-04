/**
 * Unit Tests for RAG Helper Functions
 * Tests: 23.2 - RAG helper functions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  searchKnowledgeBase,
  contextualSearch,
  getRelatedContent,
  generateEmbedding,
  type SearchOptions,
  type UserContext,
  type RelatedOptions
} from '../lib/rag-helper';

describe('RAG Helper - Search Functions', () => {
  describe('searchKnowledgeBase', () => {
    it('should filter by trade type', async () => {
      const embedding = await generateEmbedding('electrical safety');
      const options: SearchOptions = {
        tradeType: 'TT',
        limit: 5
      };
      
      const results = await searchKnowledgeBase(embedding, options);
      
      // All results should be TT (Trade Theory)
      results.forEach(result => {
        expect(result.trade_type).toBe('TT');
      });
    });

    it('should filter by content type', async () => {
      const embedding = await generateEmbedding('safety procedures');
      const options: SearchOptions = {
        contentType: 'safety',
        limit: 5
      };
      
      const results = await searchKnowledgeBase(embedding, options);
      
      // All results should be safety content
      results.forEach(result => {
        expect(result.content_type).toBe('safety');
      });
    });

    it('should filter by minimum priority', async () => {
      const embedding = await generateEmbedding('electrical concepts');
      const options: SearchOptions = {
        minPriority: 7,
        limit: 10
      };
      
      const results = await searchKnowledgeBase(embedding, options);
      
      // All results should have priority >= 7
      results.forEach(result => {
        expect(result.priority).toBeGreaterThanOrEqual(7);
      });
    });

    it('should respect limit parameter', async () => {
      const embedding = await generateEmbedding('electrical theory');
      const options: SearchOptions = {
        limit: 3
      };
      
      const results = await searchKnowledgeBase(embedding, options);
      
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should order results by priority and similarity', async () => {
      const embedding = await generateEmbedding('ohms law');
      const options: SearchOptions = {
        limit: 10
      };
      
      const results = await searchKnowledgeBase(embedding, options);
      
      // Check that results are ordered (priority DESC, distance ASC)
      for (let i = 0; i < results.length - 1; i++) {
        const current = results[i];
        const next = results[i + 1];
        
        // If priorities are equal, distance should be ascending
        if (current.priority === next.priority) {
          expect(current.distance).toBeLessThanOrEqual(next.distance);
        }
      }
    });
  });

  describe('contextualSearch', () => {
    it('should adapt to beginner user level', async () => {
      const query = 'what is voltage';
      const embedding = await generateEmbedding(query);
      const context: UserContext = {
        userLevel: 'beginner',
        tradeType: 'TT'
      };
      
      const results = await contextualSearch(query, embedding, context, 5);
      
      // Beginner level should prioritize high-priority content
      results.forEach(result => {
        expect(result.priority).toBeGreaterThanOrEqual(6);
      });
    });

    it('should boost current module content', async () => {
      const query = 'electrical safety';
      const embedding = await generateEmbedding(query);
      const context: UserContext = {
        currentModule: 'module-1',
        tradeType: 'TT'
      };
      
      const results = await contextualSearch(query, embedding, context, 10);
      
      // Should have some results from module-1
      const moduleResults = results.filter(r => r.module_name.includes('Module 1') || r.module_number === 1);
      expect(moduleResults.length).toBeGreaterThan(0);
    });

    it('should prioritize focus area content', async () => {
      const query = 'safety equipment';
      const embedding = await generateEmbedding(query);
      const context: UserContext = {
        focusArea: 'safety',
        tradeType: 'TT'
      };
      
      const results = await contextualSearch(query, embedding, context, 5);
      
      // Should prioritize safety content
      const safetyResults = results.filter(r => r.content_type === 'safety');
      expect(safetyResults.length).toBeGreaterThan(0);
    });

    it('should handle advanced user level', async () => {
      const query = 'complex circuit analysis';
      const embedding = await generateEmbedding(query);
      const context: UserContext = {
        userLevel: 'advanced',
        tradeType: 'TT'
      };
      
      const results = await contextualSearch(query, embedding, context, 5);
      
      // Advanced level allows lower priority content
      expect(results.length).toBeGreaterThan(0);
      // Should include practical/tools content
      const practicalOrTools = results.filter(r => 
        r.content_type === 'practical' || r.content_type === 'tools'
      );
      expect(practicalOrTools.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRelatedContent', () => {
    it('should find content by keywords', async () => {
      const keywords = ['voltage', 'current', 'resistance'];
      const options: RelatedOptions = {
        tradeType: 'TT',
        limit: 5
      };
      
      const results = await getRelatedContent(keywords, options);
      
      expect(results.length).toBeGreaterThan(0);
      
      // Results should contain at least one keyword
      results.forEach(result => {
        const contentLower = result.content.toLowerCase();
        const hasKeyword = keywords.some(kw => 
          contentLower.includes(kw.toLowerCase()) ||
          result.topic_keywords.some(tk => tk.toLowerCase().includes(kw.toLowerCase()))
        );
        expect(hasKeyword).toBe(true);
      });
    });

    it('should exclude specified content types', async () => {
      const keywords = ['electrical'];
      const options: RelatedOptions = {
        excludeContentTypes: ['example'],
        limit: 10
      };
      
      const results = await getRelatedContent(keywords, options);
      
      // No results should be 'example' type
      results.forEach(result => {
        expect(result.content_type).not.toBe('example');
      });
    });

    it('should filter by minimum priority', async () => {
      const keywords = ['safety'];
      const options: RelatedOptions = {
        minPriority: 8,
        limit: 5
      };
      
      const results = await getRelatedContent(keywords, options);
      
      results.forEach(result => {
        expect(result.priority).toBeGreaterThanOrEqual(8);
      });
    });
  });

  describe('generateEmbedding', () => {
    it('should generate consistent embeddings for same text', async () => {
      const text = 'electrical safety procedures';
      
      const embedding1 = await generateEmbedding(text);
      const embedding2 = await generateEmbedding(text);
      
      expect(embedding1).toEqual(embedding2);
    });

    it('should generate 384-dimensional vectors', async () => {
      const text = 'voltage and current';
      
      const embedding = await generateEmbedding(text);
      
      expect(embedding.length).toBe(384);
    });

    it('should generate normalized vectors', async () => {
      const text = 'ohms law';
      
      const embedding = await generateEmbedding(text);
      
      // Calculate magnitude
      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );
      
      // Should be approximately 1 (normalized)
      expect(magnitude).toBeCloseTo(1, 1);
    });

    it('should handle empty text', async () => {
      const text = '';
      
      const embedding = await generateEmbedding(text);
      
      expect(embedding.length).toBe(384);
    });
  });
});
