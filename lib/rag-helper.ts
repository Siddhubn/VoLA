/**
 * Optimized RAG Helper - Performance-enhanced version
 * 
 * This module provides optimized versions of RAG functions with:
 * 1. Caching for frequently accessed data
 * 2. Batch processing for multiple operations
 * 3. Connection pooling optimization
 * 4. Performance monitoring
 */

import { 
  cachedSearchKnowledgeBase,
  cachedGenerateEmbedding,
  cachedGetModuleContent,
  OptimizedQueries,
  PerformanceMonitor
} from './rag-performance';

// Define types directly to avoid circular dependency
export interface RAGChunk {
  content: string;
  module_name: string;
  module_number: number;
  content_type: string;
  section_title: string;
  priority: number;
  trade_type: 'TT' | 'TP';
  topic_keywords?: string[];
  distance: number;
  word_count?: number;
  module_id?: string;
}

export interface SearchOptions {
  trade?: string;
  tradeType?: 'TT' | 'TP';
  moduleId?: string;
  contentType?: string;
  limit?: number;
  maxDistance?: number;
  minPriority?: number;
}

/**
 * Optimized search with caching and performance monitoring
 */
export async function optimizedSearchKnowledgeBase(
  embeddingVector: number[],
  options: SearchOptions = {}
): Promise<RAGChunk[]> {
  const endTimer = PerformanceMonitor.startTimer('searchKnowledgeBase');
  
  try {
    const results = await cachedSearchKnowledgeBase(embeddingVector, options);
    return results;
  } finally {
    endTimer();
  }
}

/**
 * Optimized embedding generation with caching
 */
export async function optimizedGenerateEmbedding(text: string): Promise<number[]> {
  const endTimer = PerformanceMonitor.startTimer('generateEmbedding');
  
  try {
    return await cachedGenerateEmbedding(text);
  } finally {
    endTimer();
  }
}

/**
 * Optimized module content retrieval
 */
export async function optimizedGetModuleContent(
  moduleId: string,
  tradeType: 'TT' | 'TP',
  contentType?: string,
  limit: number = 20
): Promise<RAGChunk[]> {
  const endTimer = PerformanceMonitor.startTimer('getModuleContent');
  
  try {
    return await cachedGetModuleContent(moduleId, tradeType, contentType, limit);
  } finally {
    endTimer();
  }
}

/**
 * Optimized safety content retrieval with prepared queries
 */
export async function optimizedGetSafetyContent(
  tradeType: 'TT' | 'TP',
  limit: number = 10
): Promise<RAGChunk[]> {
  const endTimer = PerformanceMonitor.startTimer('getSafetyContent');
  
  try {
    return await OptimizedQueries.searchByContentType('safety', tradeType, limit);
  } finally {
    endTimer();
  }
}

/**
 * Optimized context-aware search with intelligent caching
 */
export async function optimizedContextAwareSearch(
  embeddingVector: number[],
  context: {
    preferredModule?: string;
    preferredContentType?: string;
    tradeType?: 'TT' | 'TP';
    userLevel?: 'beginner' | 'intermediate' | 'advanced';
  } = {},
  limit: number = 5
): Promise<RAGChunk[]> {
  const endTimer = PerformanceMonitor.startTimer('contextAwareSearch');
  
  try {
    // Use cached search with context-specific options
    const searchOptions: SearchOptions = {
      trade: 'electrician',
      tradeType: context.tradeType,
      moduleId: context.preferredModule,
      contentType: context.preferredContentType,
      limit,
      // Adjust parameters based on user level
      maxDistance: context.userLevel === 'beginner' ? 0.4 : 0.5,
      minPriority: context.userLevel === 'beginner' ? 6 : 1
    };
    
    return await optimizedSearchKnowledgeBase(embeddingVector, searchOptions);
  } finally {
    endTimer();
  }
}

/**
 * Batch search for multiple queries (optimized)
 */
export async function batchSearch(
  queries: string[],
  options: SearchOptions = {}
): Promise<RAGChunk[][]> {
  const endTimer = PerformanceMonitor.startTimer('batchSearch');
  
  try {
    // Generate embeddings in batch (with caching)
    const embeddings = await Promise.all(
      queries.map(query => optimizedGenerateEmbedding(query))
    );
    
    // Perform searches in parallel
    const results = await Promise.all(
      embeddings.map(embedding => optimizedSearchKnowledgeBase(embedding, options))
    );
    
    return results;
  } finally {
    endTimer();
  }
}

/**
 * Get content statistics with caching
 */
export async function getContentStatistics(
  moduleId?: string,
  tradeType?: 'TT' | 'TP'
): Promise<{
  moduleStats?: any;
  contentTypeDistribution: any[];
  totalChunks: number;
}> {
  const endTimer = PerformanceMonitor.startTimer('getContentStatistics');
  
  try {
    const [moduleStats, contentTypeDistribution] = await Promise.all([
      moduleId && tradeType 
        ? OptimizedQueries.getModuleStats(moduleId, tradeType)
        : Promise.resolve(null),
      OptimizedQueries.getContentTypeDistribution(tradeType)
    ]);
    
    const totalChunks = contentTypeDistribution.reduce(
      (sum, item) => sum + parseInt(item.chunk_count), 
      0
    );
    
    return {
      moduleStats,
      contentTypeDistribution,
      totalChunks
    };
  } finally {
    endTimer();
  }
}

/**
 * Smart content recommendation based on user behavior
 */
export async function getSmartRecommendations(
  userHistory: string[],
  currentModule?: string,
  tradeType: 'TT' | 'TP' = 'TT',
  limit: number = 5
): Promise<RAGChunk[]> {
  const endTimer = PerformanceMonitor.startTimer('getSmartRecommendations');
  
  try {
    // Analyze user history to determine preferences
    const historyText = userHistory.join(' ');
    const embedding = await optimizedGenerateEmbedding(historyText);
    
    // Search with preference for current module
    const searchOptions: SearchOptions = {
      trade: 'electrician',
      tradeType,
      moduleId: currentModule,
      limit: limit * 2, // Get more results for filtering
      minPriority: 5 // Focus on higher quality content
    };
    
    const results = await optimizedSearchKnowledgeBase(embedding, searchOptions);
    
    // Filter and rank results
    const filtered = results
      .filter(r => r.priority >= 5)
      .sort((a, b) => {
        // Prefer current module content
        if (currentModule) {
          const aIsCurrentModule = a.module_name.includes(currentModule.split('-')[1]);
          const bIsCurrentModule = b.module_name.includes(currentModule.split('-')[1]);
          
          if (aIsCurrentModule && !bIsCurrentModule) return -1;
          if (!aIsCurrentModule && bIsCurrentModule) return 1;
        }
        
        // Then by priority and relevance
        return (b.priority - a.priority) || (a.distance - b.distance);
      })
      .slice(0, limit);
    
    return filtered;
  } finally {
    endTimer();
  }
}

/**
 * Preload common content for faster access
 */
export async function preloadCommonContent(): Promise<void> {
  const endTimer = PerformanceMonitor.startTimer('preloadCommonContent');
  
  try {
    console.log('🚀 Preloading common content...');
    
    // Preload module content for first 3 modules
    const modules = ['module-1', 'module-2', 'module-3'];
    const tradeTypes: ('TT' | 'TP')[] = ['TT', 'TP'];
    
    const preloadPromises = [];
    
    for (const moduleId of modules) {
      for (const tradeType of tradeTypes) {
        preloadPromises.push(
          optimizedGetModuleContent(moduleId, tradeType, undefined, 10)
        );
      }
    }
    
    // Preload safety content
    preloadPromises.push(
      optimizedGetSafetyContent('TT', 10),
      optimizedGetSafetyContent('TP', 10)
    );
    
    // Preload common embeddings
    const commonQueries = [
      'electrical safety procedures',
      'tools and equipment',
      'electrical theory basics',
      'practical applications',
      'safety guidelines'
    ];
    
    preloadPromises.push(
      ...commonQueries.map(query => optimizedGenerateEmbedding(query))
    );
    
    await Promise.all(preloadPromises);
    
    console.log('✅ Common content preloaded');
  } finally {
    endTimer();
  }
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics(): {
  operations: Record<string, any>;
  cache: Record<string, any>;
} {
  return {
    operations: PerformanceMonitor.getMetrics(),
    cache: PerformanceMonitor.getCacheStats()
  };
}

/**
 * Health check for RAG system
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  metrics: any;
}> {
  const checks: Record<string, boolean> = {};
  
  try {
    // Test embedding generation
    const testEmbedding = await optimizedGenerateEmbedding('test');
    checks.embeddingGeneration = testEmbedding.length > 0;
    
    // Test search functionality
    const testResults = await optimizedSearchKnowledgeBase(testEmbedding, { limit: 1 });
    checks.searchFunctionality = Array.isArray(testResults);
    
    // Test module content retrieval
    const moduleContent = await optimizedGetModuleContent('module-1', 'TT', undefined, 1);
    checks.moduleContentRetrieval = Array.isArray(moduleContent);
    
    // Test database queries
    const stats = await getContentStatistics();
    checks.databaseQueries = stats.totalChunks > 0;
    
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (passedChecks === totalChecks) {
      status = 'healthy';
    } else if (passedChecks >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      checks,
      metrics: getPerformanceMetrics()
    };
    
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      status: 'unhealthy',
      checks,
      metrics: getPerformanceMetrics()
    };
  }
}

// Export optimized functions as default interface
export {
  optimizedSearchKnowledgeBase as searchKnowledgeBase,
  optimizedGenerateEmbedding as generateEmbedding,
  optimizedGetModuleContent as getModuleContent,
  optimizedGetSafetyContent as getSafetyContent,
  optimizedContextAwareSearch as contextAwareSearch
};