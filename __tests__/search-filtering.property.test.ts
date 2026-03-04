/**
 * Property-Based Tests for Search Filtering
 * Feature: rag-knowledge-base, Property 8: Search Filter Consistency
 * Validates: Requirements 13.4, 14.5
 * 
 * Tests that search filters consistently apply across all searches
 */

import { describe, it, expect } from 'vitest';
import { searchKnowledgeBase, generateEmbedding, type SearchOptions } from '@/lib/rag-helper';

describe('Property 8: Search Filter Consistency', () => {
  // Property: For any search with filters, all results must match the filter criteria
  
  it('should consistently filter by content type', async () => {
    const contentTypes = ['theory', 'safety', 'practical', 'tools'];
    
    for (const contentType of contentTypes) {
      const embedding = await generateEmbedding('electrical concepts');
      
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TT',
        contentType,
        limit: 10
      });
      
      // Property: ALL results must match the specified content type
      results.forEach(result => {
        expect(result.content_type).toBe(contentType);
      });
    }
  });
  
  it('should consistently filter by trade type', async () => {
    const tradeTypes: ('TT' | 'TP')[] = ['TT', 'TP'];
    
    for (const tradeType of tradeTypes) {
      const embedding = await generateEmbedding('electrical work');
      
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType,
        limit: 10
      });
      
      // Property: ALL results must match the specified trade type
      results.forEach(result => {
        expect(result.trade_type).toBe(tradeType);
      });
    }
  });
  
  it('should consistently filter by module ID', async () => {
    const moduleIds = ['module-1', 'module-2', 'module-3'];
    
    for (const moduleId of moduleIds) {
      const embedding = await generateEmbedding('electrical fundamentals');
      
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TT',
        moduleId,
        limit: 10
      });
      
      // Property: ALL results must be from the specified module
      const moduleNumber = parseInt(moduleId.split('-')[1]);
      results.forEach(result => {
        expect(result.module_number).toBe(moduleNumber);
      });
    }
  });
  
  it('should consistently filter by minimum priority', async () => {
    const priorities = [5, 6, 7, 8];
    
    for (const minPriority of priorities) {
      const embedding = await generateEmbedding('electrical safety');
      
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TT',
        minPriority,
        limit: 10
      });
      
      // Property: ALL results must have priority >= minPriority
      results.forEach(result => {
        expect(result.priority).toBeGreaterThanOrEqual(minPriority);
      });
    }
  });
  
  it('should consistently filter by max distance', async () => {
    const maxDistances = [0.3, 0.4, 0.5];
    
    for (const maxDistance of maxDistances) {
      const embedding = await generateEmbedding('circuit analysis');
      
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TT',
        maxDistance,
        limit: 10
      });
      
      // Property: ALL results must have distance < maxDistance
      results.forEach(result => {
        expect(result.distance).toBeLessThan(maxDistance);
      });
    }
  });
  
  it('should apply multiple filters consistently', async () => {
    const embedding = await generateEmbedding('electrical safety procedures');
    
    const results = await searchKnowledgeBase(embedding, {
      trade: 'electrician',
      tradeType: 'TT',
      moduleId: 'module-1',
      contentType: 'safety',
      minPriority: 7,
      maxDistance: 0.5,
      limit: 10
    });
    
    // Property: ALL results must match ALL filter criteria
    results.forEach(result => {
      expect(result.trade_type).toBe('TT');
      expect(result.module_number).toBe(1);
      expect(result.content_type).toBe('safety');
      expect(result.priority).toBeGreaterThanOrEqual(7);
      expect(result.distance).toBeLessThan(0.5);
    });
  });
  
  it('should respect limit parameter consistently', async () => {
    const limits = [1, 3, 5, 10];
    
    for (const limit of limits) {
      const embedding = await generateEmbedding('electrical theory');
      
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TT',
        limit
      });
      
      // Property: Result count must not exceed limit
      expect(results.length).toBeLessThanOrEqual(limit);
    }
  });
  
  it('should maintain filter consistency across different queries', async () => {
    const queries = [
      'electrical safety',
      'circuit breakers',
      'voltage measurement',
      'wiring procedures'
    ];
    
    const filters: SearchOptions = {
      trade: 'electrician',
      tradeType: 'TT',
      contentType: 'safety',
      minPriority: 8,
      limit: 5
    };
    
    for (const query of queries) {
      const embedding = await generateEmbedding(query);
      const results = await searchKnowledgeBase(embedding, filters);
      
      // Property: Same filters should apply consistently regardless of query
      results.forEach(result => {
        expect(result.trade_type).toBe('TT');
        expect(result.content_type).toBe('safety');
        expect(result.priority).toBeGreaterThanOrEqual(8);
      });
    }
  });
  
  it('should maintain ordering with filters applied', async () => {
    const embedding = await generateEmbedding('electrical fundamentals');
    
    const results = await searchKnowledgeBase(embedding, {
      trade: 'electrician',
      tradeType: 'TT',
      minPriority: 5,
      limit: 10
    });
    
    if (results.length > 1) {
      // Property: Results should be ordered by priority DESC, then distance ASC
      for (let i = 0; i < results.length - 1; i++) {
        const current = results[i];
        const next = results[i + 1];
        
        if (current.priority === next.priority) {
          // Same priority: should be ordered by distance
          expect(current.distance).toBeLessThanOrEqual(next.distance);
        } else {
          // Different priority: current should have higher priority
          expect(current.priority).toBeGreaterThanOrEqual(next.priority);
        }
      }
    }
  });
  
  it('should handle empty results consistently', async () => {
    const embedding = await generateEmbedding('nonexistent topic xyz123');
    
    const results = await searchKnowledgeBase(embedding, {
      trade: 'electrician',
      tradeType: 'TT',
      contentType: 'safety',
      minPriority: 10,
      maxDistance: 0.1, // Very strict
      limit: 10
    });
    
    // Property: Empty results should still be a valid array
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });
  
  it('should filter independently of result count', async () => {
    const embedding = await generateEmbedding('electrical safety equipment');
    
    // Request many results
    const manyResults = await searchKnowledgeBase(embedding, {
      trade: 'electrician',
      tradeType: 'TT',
      contentType: 'safety',
      limit: 100
    });
    
    // Request few results
    const fewResults = await searchKnowledgeBase(embedding, {
      trade: 'electrician',
      tradeType: 'TT',
      contentType: 'safety',
      limit: 3
    });
    
    // Property: Filter should apply regardless of limit
    manyResults.forEach(result => {
      expect(result.content_type).toBe('safety');
    });
    
    fewResults.forEach(result => {
      expect(result.content_type).toBe('safety');
    });
  });
  
  it('should combine content type and priority filters correctly', async () => {
    const testCases = [
      { contentType: 'safety', minPriority: 8 },
      { contentType: 'theory', minPriority: 6 },
      { contentType: 'practical', minPriority: 5 },
      { contentType: 'tools', minPriority: 4 }
    ];
    
    for (const testCase of testCases) {
      const embedding = await generateEmbedding('electrical work');
      
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TT',
        contentType: testCase.contentType,
        minPriority: testCase.minPriority,
        limit: 10
      });
      
      // Property: Results must match BOTH filters
      results.forEach(result => {
        expect(result.content_type).toBe(testCase.contentType);
        expect(result.priority).toBeGreaterThanOrEqual(testCase.minPriority);
      });
    }
  });
  
  it('should maintain filter integrity with different embeddings', async () => {
    const texts = [
      'short text',
      'medium length text with more words',
      'very long text with many words that describes electrical concepts in detail and provides comprehensive information'
    ];
    
    const filters: SearchOptions = {
      trade: 'electrician',
      tradeType: 'TT',
      minPriority: 6,
      limit: 5
    };
    
    for (const text of texts) {
      const embedding = await generateEmbedding(text);
      const results = await searchKnowledgeBase(embedding, filters);
      
      // Property: Filters should work regardless of embedding characteristics
      results.forEach(result => {
        expect(result.trade_type).toBe('TT');
        expect(result.priority).toBeGreaterThanOrEqual(6);
      });
    }
  });
});
