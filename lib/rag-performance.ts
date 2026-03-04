/**
 * RAG Performance Optimizations
 * 
 * This module provides performance optimizations for RAG operations:
 * 1. Query result caching
 * 2. Embedding caching
 * 3. Connection pooling optimization
 * 4. Batch processing optimization
 */

import { query } from './postgresql';

// Simple in-memory cache for development
// In production, use Redis or similar
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set(key: string, data: T, ttlSeconds: number = 300): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Cache instances
const searchCache = new SimpleCache<any[]>(500);
const embeddingCache = new SimpleCache<number[]>(200);
const contentCache = new SimpleCache<any[]>(300);

// Cache key generators
function generateSearchCacheKey(
  queryHash: string,
  options: Record<string, any>
): string {
  const optionsStr = JSON.stringify(options, Object.keys(options).sort());
  return `search:${queryHash}:${Buffer.from(optionsStr).toString('base64')}`;
}

function generateEmbeddingCacheKey(text: string): string {
  // Use first 100 chars + length as key (simple but effective)
  const textKey = text.substring(0, 100) + text.length;
  return `embedding:${Buffer.from(textKey).toString('base64')}`;
}

function generateContentCacheKey(
  type: string,
  params: Record<string, any>
): string {
  const paramsStr = JSON.stringify(params, Object.keys(params).sort());
  return `content:${type}:${Buffer.from(paramsStr).toString('base64')}`;
}

/**
 * Cached search function
 */
export async function cachedSearchKnowledgeBase(
  embeddingVector: number[],
  options: Record<string, any> = {},
  cacheTTL: number = 300
): Promise<any[]> {
  // Generate cache key
  const queryHash = embeddingVector.slice(0, 10).join(','); // Use first 10 dimensions as hash
  const cacheKey = generateSearchCacheKey(queryHash, options);

  // Check cache first
  const cached = searchCache.get(cacheKey);
  if (cached) {
    console.log('🚀 Cache hit for search query');
    return cached;
  }

  // Execute search (import dynamically to avoid circular dependency)
  const { searchKnowledgeBase } = await import('./rag-helper');
  const results = await searchKnowledgeBase(embeddingVector, options);

  // Cache results
  searchCache.set(cacheKey, results, cacheTTL);
  console.log(`💾 Cached search results (${results.length} items)`);

  return results;
}

/**
 * Cached embedding generation
 */
export async function cachedGenerateEmbedding(
  text: string,
  cacheTTL: number = 3600
): Promise<number[]> {
  const cacheKey = generateEmbeddingCacheKey(text);

  // Check cache first
  const cached = embeddingCache.get(cacheKey);
  if (cached) {
    console.log('🚀 Cache hit for embedding');
    return cached;
  }

  // Generate embedding (import dynamically)
  const { generateEmbedding } = await import('./rag-helper');
  const embedding = await generateEmbedding(text);

  // Cache embedding
  embeddingCache.set(cacheKey, embedding, cacheTTL);
  console.log('💾 Cached embedding');

  return embedding;
}

/**
 * Cached content retrieval
 */
export async function cachedGetModuleContent(
  moduleId: string,
  tradeType: 'TT' | 'TP',
  contentType?: string,
  limit: number = 20,
  cacheTTL: number = 600
): Promise<any[]> {
  const cacheKey = generateContentCacheKey('module', {
    moduleId,
    tradeType,
    contentType,
    limit
  });

  // Check cache first
  const cached = contentCache.get(cacheKey);
  if (cached) {
    console.log('🚀 Cache hit for module content');
    return cached;
  }

  // Get content (import dynamically)
  const { getModuleContent } = await import('./rag-helper');
  const results = await getModuleContent(moduleId, tradeType, contentType, limit);

  // Cache results
  contentCache.set(cacheKey, results, cacheTTL);
  console.log(`💾 Cached module content (${results.length} items)`);

  return results;
}

/**
 * Cached quiz content retrieval
 */
export async function cachedGetBalancedQuizContent(
  moduleId: string,
  tradeType: 'TT' | 'TP',
  totalQuestions: number = 10,
  cacheTTL: number = 600
): Promise<{ content: any[]; distribution: Record<string, number> }> {
  const cacheKey = generateContentCacheKey('quiz', {
    moduleId,
    tradeType,
    totalQuestions
  });

  // Check cache first - use a separate cache for quiz content since it's not an array
  const cached = contentCache.get(cacheKey);
  if (cached) {
    console.log('🚀 Cache hit for quiz content');
    // Cast to the expected type since we know what we cached
    return cached as unknown as { content: any[]; distribution: Record<string, number> };
  }

  // Get content (import dynamically)
  const { getBalancedQuizContent } = await import('./quiz-helper');
  const results = await getBalancedQuizContent(moduleId, tradeType, totalQuestions);

  // Cache results - store as any[] to satisfy cache type
  contentCache.set(cacheKey, results as any, cacheTTL);
  console.log(`💾 Cached quiz content (${results.content.length} items)`);

  return results;
}

/**
 * Optimized batch embedding generation
 */
export async function batchGenerateEmbeddings(
  texts: string[],
  batchSize: number = 10
): Promise<number[][]> {
  const results: number[][] = [];
  const uncachedTexts: string[] = [];
  const uncachedIndices: number[] = [];

  // Check cache for each text
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const cacheKey = generateEmbeddingCacheKey(text);
    const cached = embeddingCache.get(cacheKey);

    if (cached) {
      results[i] = cached;
    } else {
      uncachedTexts.push(text);
      uncachedIndices.push(i);
    }
  }

  console.log(`🚀 Cache hits: ${texts.length - uncachedTexts.length}/${texts.length}`);

  // Process uncached texts in batches
  if (uncachedTexts.length > 0) {
    const { generateEmbedding } = await import('./rag-helper');

    for (let i = 0; i < uncachedTexts.length; i += batchSize) {
      const batch = uncachedTexts.slice(i, i + batchSize);
      const batchIndices = uncachedIndices.slice(i, i + batchSize);

      // Process batch (sequential for now, could be parallel)
      for (let j = 0; j < batch.length; j++) {
        const text = batch[j];
        const originalIndex = batchIndices[j];

        const embedding = await generateEmbedding(text);
        results[originalIndex] = embedding;

        // Cache the result
        const cacheKey = generateEmbeddingCacheKey(text);
        embeddingCache.set(cacheKey, embedding, 3600);
      }

      console.log(`💾 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uncachedTexts.length / batchSize)}`);
    }
  }

  return results;
}

/**
 * Optimized database queries with prepared statements
 */
export class OptimizedQueries {
  private static preparedQueries = new Map<string, string>();

  static async searchByContentType(
    contentType: string,
    tradeType: 'TT' | 'TP',
    limit: number = 10
  ): Promise<any[]> {
    const queryKey = 'searchByContentType';
    
    if (!this.preparedQueries.has(queryKey)) {
      this.preparedQueries.set(queryKey, `
        SELECT 
          content,
          module_name,
          module_number,
          content_type,
          section_title,
          priority,
          trade_type,
          topic_keywords,
          0 as distance
        FROM knowledge_chunks
        WHERE trade = 'electrician'
          AND trade_type = $1
          AND content_type = $2
        ORDER BY priority DESC, module_number ASC
        LIMIT $3
      `);
    }

    const result = await query(this.preparedQueries.get(queryKey)!, [
      tradeType,
      contentType,
      limit
    ]);

    return result.rows;
  }

  static async getModuleStats(moduleId: string, tradeType: 'TT' | 'TP'): Promise<any> {
    const queryKey = 'getModuleStats';
    
    if (!this.preparedQueries.has(queryKey)) {
      this.preparedQueries.set(queryKey, `
        SELECT 
          COUNT(*) as total_chunks,
          AVG(priority)::numeric(3,1) as avg_priority,
          COUNT(DISTINCT content_type) as content_types,
          SUM(word_count) as total_words
        FROM knowledge_chunks
        WHERE trade = 'electrician'
          AND trade_type = $1
          AND module_id = $2
      `);
    }

    const result = await query(this.preparedQueries.get(queryKey)!, [
      tradeType,
      moduleId
    ]);

    return result.rows[0];
  }

  static async getContentTypeDistribution(tradeType?: 'TT' | 'TP'): Promise<any[]> {
    const queryKey = tradeType ? 'getContentTypeDistributionFiltered' : 'getContentTypeDistribution';
    
    if (!this.preparedQueries.has(queryKey)) {
      const whereClause = tradeType ? "WHERE trade = 'electrician' AND trade_type = $1" : "WHERE trade = 'electrician'";
      
      this.preparedQueries.set(queryKey, `
        SELECT 
          content_type,
          COUNT(*) as chunk_count,
          AVG(priority)::numeric(3,1) as avg_priority,
          AVG(word_count)::int as avg_words
        FROM knowledge_chunks
        ${whereClause}
        GROUP BY content_type
        ORDER BY chunk_count DESC
      `);
    }

    const params = tradeType ? [tradeType] : [];
    const result = await query(this.preparedQueries.get(queryKey)!, params);

    return result.rows;
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static metrics = new Map<string, { count: number; totalTime: number; avgTime: number }>();

  static startTimer(operation: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration);
    };
  }

  private static recordMetric(operation: string, duration: number): void {
    const existing = this.metrics.get(operation) || { count: 0, totalTime: 0, avgTime: 0 };
    
    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    
    this.metrics.set(operation, existing);
  }

  static getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [operation, metrics] of this.metrics.entries()) {
      result[operation] = {
        count: metrics.count,
        totalTime: metrics.totalTime,
        avgTime: Math.round(metrics.avgTime),
        unit: 'ms'
      };
    }
    
    return result;
  }

  static getCacheStats(): Record<string, any> {
    return {
      searchCache: {
        size: searchCache.size(),
        maxSize: 500
      },
      embeddingCache: {
        size: embeddingCache.size(),
        maxSize: 200
      },
      contentCache: {
        size: contentCache.size(),
        maxSize: 300
      }
    };
  }

  static clearMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * Cache management utilities
 */
export class CacheManager {
  static clearAllCaches(): void {
    searchCache.clear();
    embeddingCache.clear();
    contentCache.clear();
    console.log('🧹 Cleared all caches');
  }

  static cleanupExpiredEntries(): void {
    searchCache.cleanup();
    embeddingCache.cleanup();
    contentCache.cleanup();
    console.log('🧹 Cleaned up expired cache entries');
  }

  static getCacheStats(): Record<string, any> {
    return PerformanceMonitor.getCacheStats();
  }

  // Warm up cache with common queries
  static async warmupCache(): Promise<void> {
    console.log('🔥 Warming up cache...');
    
    try {
      // Common embeddings
      const commonQueries = [
        'electrical safety',
        'tools and equipment',
        'electrical theory',
        'practical procedures',
        'safety procedures'
      ];

      for (const query of commonQueries) {
        await cachedGenerateEmbedding(query);
      }

      // Common module content
      const modules = ['module-1', 'module-2', 'module-3'];
      const tradeTypes: ('TT' | 'TP')[] = ['TT', 'TP'];

      for (const moduleId of modules) {
        for (const tradeType of tradeTypes) {
          await cachedGetModuleContent(moduleId, tradeType, undefined, 10);
        }
      }

      console.log('🔥 Cache warmup completed');
    } catch (error) {
      console.error('❌ Cache warmup failed:', error);
    }
  }
}

// Auto-cleanup expired entries every 5 minutes
setInterval(() => {
  CacheManager.cleanupExpiredEntries();
}, 5 * 60 * 1000);

export {
  searchCache,
  embeddingCache,
  contentCache
};