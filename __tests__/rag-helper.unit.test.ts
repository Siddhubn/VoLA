/**
 * Unit Tests for RAG Helper Functions
 * Validates: Requirements 14.1, 16.1
 * 
 * Tests search filtering, ranking, and related content discovery
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  searchKnowledgeBase,
  getModuleContent,
  getSafetyContent,
  getRelatedContent,
  generateEmbedding,
  type SearchOptions,
  type RelatedOptions
} from '@/lib/rag-helper';

describe('RAG Helper - searchKnowledgeBase', () => {
  it('should search with basic options', async () => {
    const embedding = await generateEmbedding('electrical safety');
    
    const results = await searchKnowledgeBase(embedding, {
      trade: 'electrician',
      tradeType: 'TT',
      limit: 5
    });
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(5);
    
    results.forEach(result => {
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('module_name');
      expect(result).toHaveProperty('content_type');
      expect(result).toHaveProperty('priority');
      expect(result.trade_type).toBe('TT');
    });
  });
  
  it('should filter by module ID', async () => {
    const embedding = await generateEmbedding('basic concepts');
    
    const results = await searchKnowledgeBase(embedding, {
      trade: 'electrician',
      tradeType: 'TT',
      moduleId: 'module-1',
      limit: 5
    });
    
    // All results should be from module-1
    results.forEach(result => {
      expect(result.module_number).toBe(1);
    });
  });
  
  it('should filter by content type', async () => {
    const embedding = await generateEmbedding('safety procedures');
    
    const results = await searchKnowledgeBase(embedding, {
      trade: 'electrician',
      tradeType: 'TT',
      contentType: 'safety',
      limit: 5
    });
    
    // All results should be safety content
    results.forEach(result => {
      expect(result.content_type).toBe('safety');
    });
  });
  
  it('should filter by minimum priority', async () => {
    const embedding = await generateEmbedding('electrical concepts');
    
    const results = await searchKnowledgeBase(embedding, {
      trade: 'electrician',
      tradeType: 'TT',
      minPriority: 7,
      limit: 10
    });
    
    // All results should have priority >= 7
    results.forEach(result => {
      expect(result.priority).toBeGreaterThanOrEqual(7);
    });
  });
  
  it('should respect max distance threshold', async () => {
    const embedding = await generateEmbedding('electrical theory');
    
    const results = await searchKnowledgeBase(embedding, {
      trade: 'electrician',
      tradeType: 'TT',
      maxDistance: 0.3, // Very strict
      limit: 10
    });
    
    // All results should have distance < 0.3
    results.forEach(result => {
      expect(result.distance).toBeLessThan(0.3);
    });
  });
  
  it('should order results by priority then similarity', async () => {
    const embedding = await generateEmbedding('electrical fundamentals');
    
    const results = await searchKnowledgeBase(embedding, {
      trade: 'electrician',
      tradeType: 'TT',
      limit: 10
    });
    
    if (results.length > 1) {
      // Check that results are ordered by priority DESC, then distance ASC
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
});

describe('RAG Helper - getModuleContent', () => {
  it('should get content for a specific module', async () => {
    const results = await getModuleContent('module-1', 'TT');
    
    expect(Array.isArray(results)).toBe(true);
    
    results.forEach(result => {
      expect(result.module_number).toBe(1);
      expect(result.trade_type).toBe('TT');
    });
  });
  
  it('should filter module content by type', async () => {
    const results = await getModuleContent('module-1', 'TT', 'theory');
    
    results.forEach(result => {
      expect(result.content_type).toBe('theory');
      expect(result.module_number).toBe(1);
    });
  });
  
  it('should respect limit parameter', async () => {
    const results = await getModuleContent('module-1', 'TT', undefined, 5);
    
    expect(results.length).toBeLessThanOrEqual(5);
  });
  
  it('should order by priority', async () => {
    const results = await getModuleContent('module-1', 'TT', undefined, 10);
    
    if (results.length > 1) {
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].priority).toBeGreaterThanOrEqual(results[i + 1].priority);
      }
    }
  });
});

describe('RAG Helper - getSafetyContent', () => {
  it('should get high-priority safety content', async () => {
    const results = await getSafetyContent('TT');
    
    expect(Array.isArray(results)).toBe(true);
    
    results.forEach(result => {
      expect(result.content_type).toBe('safety');
      expect(result.priority).toBeGreaterThanOrEqual(8);
      expect(result.trade_type).toBe('TT');
    });
  });
  
  it('should work without trade type filter', async () => {
    const results = await getSafetyContent();
    
    results.forEach(result => {
      expect(result.content_type).toBe('safety');
      expect(result.priority).toBeGreaterThanOrEqual(8);
    });
  });
  
  it('should respect limit parameter', async () => {
    const results = await getSafetyContent('TT', 3);
    
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

describe('RAG Helper - getRelatedContent', () => {
  it('should find content by keywords', async () => {
    const keywords = ['safety', 'electrical'];
    const results = await getRelatedContent(keywords, {
      tradeType: 'TT',
      limit: 5
    });
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(5);
    
    // Results should contain at least one of the keywords
    results.forEach(result => {
      const contentLower = result.content.toLowerCase();
      const hasKeyword = keywords.some(kw => 
        contentLower.includes(kw.toLowerCase()) ||
        result.topic_keywords.some(tk => tk.toLowerCase().includes(kw.toLowerCase()))
      );
      expect(hasKeyword).toBe(true);
    });
  });
  
  it('should filter by module', async () => {
    const keywords = ['circuit'];
    const results = await getRelatedContent(keywords, {
      moduleId: 'module-1',
      tradeType: 'TT',
      limit: 5
    });
    
    results.forEach(result => {
      expect(result.module_number).toBe(1);
    });
  });
  
  it('should exclude specified content types', async () => {
    const keywords = ['electrical'];
    const results = await getRelatedContent(keywords, {
      tradeType: 'TT',
      excludeContentTypes: ['example', 'definition'],
      limit: 10
    });
    
    results.forEach(result => {
      expect(result.content_type).not.toBe('example');
      expect(result.content_type).not.toBe('definition');
    });
  });
  
  it('should filter by minimum priority', async () => {
    const keywords = ['safety'];
    const results = await getRelatedContent(keywords, {
      tradeType: 'TT',
      minPriority: 7,
      limit: 10
    });
    
    results.forEach(result => {
      expect(result.priority).toBeGreaterThanOrEqual(7);
    });
  });
  
  it('should order by priority and word count', async () => {
    const keywords = ['electrical', 'theory'];
    const results = await getRelatedContent(keywords, {
      tradeType: 'TT',
      limit: 10
    });
    
    if (results.length > 1) {
      // Should be ordered by priority DESC
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].priority).toBeGreaterThanOrEqual(results[i + 1].priority);
      }
    }
  });
});

describe('RAG Helper - generateEmbedding', () => {
  it('should generate embedding vector', async () => {
    const text = 'electrical safety procedures';
    const embedding = await generateEmbedding(text);
    
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(384); // Standard embedding dimension
    
    // All values should be numbers
    embedding.forEach(val => {
      expect(typeof val).toBe('number');
      expect(isNaN(val)).toBe(false);
    });
  });
  
  it('should generate consistent embeddings for same text', async () => {
    const text = 'ohms law application';
    const embedding1 = await generateEmbedding(text);
    const embedding2 = await generateEmbedding(text);
    
    expect(embedding1.length).toBe(embedding2.length);
    
    // Embeddings should be identical for same input
    for (let i = 0; i < embedding1.length; i++) {
      expect(embedding1[i]).toBeCloseTo(embedding2[i], 5);
    }
  });
  
  it('should generate different embeddings for different text', async () => {
    const text1 = 'electrical safety';
    const text2 = 'mechanical tools';
    
    const embedding1 = await generateEmbedding(text1);
    const embedding2 = await generateEmbedding(text2);
    
    // Embeddings should be different
    let differences = 0;
    for (let i = 0; i < embedding1.length; i++) {
      if (Math.abs(embedding1[i] - embedding2[i]) > 0.01) {
        differences++;
      }
    }
    
    expect(differences).toBeGreaterThan(50); // Significant differences
  });
  
  it('should handle empty text', async () => {
    const embedding = await generateEmbedding('');
    
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(384);
  });
  
  it('should normalize embedding vectors', async () => {
    const text = 'electrical circuit analysis';
    const embedding = await generateEmbedding(text);
    
    // Calculate magnitude
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    
    // Normalized vector should have magnitude close to 1
    expect(magnitude).toBeCloseTo(1.0, 1);
  });
});
