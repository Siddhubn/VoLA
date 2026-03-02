import { query } from '../postgresql'
import { LocalEmbeddingService } from './local-embedding-service'
import { ChunkCache } from './cache-service'
import { performanceOptimizer } from './performance-optimizer'

type EmbeddingService = LocalEmbeddingService

export interface SearchQuery {
  query: string
  course?: 'fitter' | 'electrician'
  module?: string
  topK?: number
  minSimilarity?: number
}

export interface SearchResult {
  chunkId: number
  content: string
  similarity: number
  source: {
    course: string
    module: string | null
    section: string | null
    pageNumber: number | null
    pdfSource: string
  }
  metadata?: Record<string, any>
}

export interface VectorSearchConfig {
  defaultTopK?: number
  defaultMinSimilarity?: number
  embeddingService?: LocalEmbeddingService
  chunkCache?: ChunkCache
  enableQueryCache?: boolean
}

export class OptimizedVectorSearchService {
  private embeddingService: LocalEmbeddingService
  private config: Required<VectorSearchConfig>
  private chunkCache: ChunkCache
  private enableQueryCache: boolean

  constructor(config?: VectorSearchConfig) {
    this.config = {
      defaultTopK: config?.defaultTopK || 5,
      defaultMinSimilarity: config?.defaultMinSimilarity || 0.7,
      embeddingService: config?.embeddingService || new LocalEmbeddingService(),
      chunkCache: config?.chunkCache || new ChunkCache(),
      enableQueryCache: config?.enableQueryCache !== undefined ? config.enableQueryCache : true
    }
    
    this.embeddingService = this.config.embeddingService
    this.chunkCache = this.config.chunkCache
    this.enableQueryCache = this.config.enableQueryCache
  }

  /**
   * Perform semantic search on the knowledge base with query result caching
   */
  async search(searchQuery: SearchQuery): Promise<SearchResult[]> {
    if (!searchQuery.query || searchQuery.query.trim().length === 0) {
      throw new Error('Search query cannot be empty')
    }

    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.embedQuery(searchQuery.query)

    // Search using the embedding
    return this.searchByEmbedding(queryEmbedding, {
      course: searchQuery.course,
      module: searchQuery.module,
      topK: searchQuery.topK || this.config.defaultTopK,
      minSimilarity: searchQuery.minSimilarity || this.config.defaultMinSimilarity
    })
  }

  /**
   * Search by pre-computed embedding vector with caching
   */
  async searchByEmbedding(
    embedding: number[],
    filters: {
      course?: 'fitter' | 'electrician'
      module?: string
      topK?: number
      minSimilarity?: number
    }
  ): Promise<SearchResult[]> {
    if (!embedding || embedding.length === 0) {
      throw new Error('Embedding vector cannot be empty')
    }

    const topK = filters.topK || this.config.defaultTopK
    const minSimilarity = filters.minSimilarity || this.config.defaultMinSimilarity

    // Create cache key for query result caching (use first 10 dimensions for key)
    const cacheKey = `vsearch:${embedding.slice(0, 10).map(v => v.toFixed(4)).join(',')}:${JSON.stringify({ filters, topK, minSimilarity })}`

    // Use cached query if enabled
    if (this.enableQueryCache) {
      return performanceOptimizer.cachedQuery(cacheKey, async () => {
        return this.executeSearch(embedding, filters, topK, minSimilarity)
      })
    } else {
      return this.executeSearch(embedding, filters, topK, minSimilarity)
    }
  }

  /**
   * Execute the actual search query (optimized version)
   */
  private async executeSearch(
    embedding: number[],
    filters: {
      course?: 'fitter' | 'electrician'
      module?: string
    },
    topK: number,
    minSimilarity: number
  ): Promise<SearchResult[]> {
    // Check if pgvector is available
    const vectorCheck = await query(
      "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
    )
    const hasVector = vectorCheck.rows[0].exists

    if (!hasVector) {
      throw new Error('pgvector extension is not enabled. Please install and enable pgvector.')
    }

    // Build optimized SQL query with proper parameter placeholders
    let sql = `
      SELECT 
        id as chunk_id,
        course,
        pdf_source,
        module,
        section,
        page_number,
        content,
        metadata,
        1 - (embedding <=> $1::vector) as similarity
      FROM knowledge_chunks
      WHERE embedding IS NOT NULL
    `

    const params: any[] = [`[${embedding.join(',')}]`]
    let paramIndex = 2

    // Add course filter
    if (filters.course) {
      sql += ` AND course = $${paramIndex}`
      params.push(filters.course)
      paramIndex++
    }

    // Add module filter
    if (filters.module) {
      sql += ` AND module = $${paramIndex}`
      params.push(filters.module)
      paramIndex++
    }

    // Add similarity threshold
    sql += ` AND (1 - (embedding <=> $1::vector)) >= $${paramIndex}`
    params.push(minSimilarity)
    paramIndex++

    // Order by similarity and limit results
    sql += ` ORDER BY embedding <=> $1::vector LIMIT $${paramIndex}`
    params.push(topK)

    try {
      const result = await query(sql, params)

      // Transform results to SearchResult format
      const searchResults = result.rows.map((row: any) => {
        const searchResult: SearchResult = {
          chunkId: row.chunk_id,
          content: row.content,
          similarity: parseFloat(row.similarity),
          source: {
            course: row.course,
            module: row.module,
            section: row.section,
            pageNumber: row.page_number,
            pdfSource: row.pdf_source
          },
          metadata: row.metadata
        }
        
        // Cache the chunk
        this.chunkCache.setChunk(row.chunk_id, searchResult)
        
        return searchResult
      })
      
      return searchResults
    } catch (error) {
      console.error('Vector search error:', error)
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Search within a specific course
   */
  async searchByCourse(
    searchQuery: string,
    course: 'fitter' | 'electrician',
    options?: {
      topK?: number
      minSimilarity?: number
    }
  ): Promise<SearchResult[]> {
    return this.search({
      query: searchQuery,
      course,
      topK: options?.topK,
      minSimilarity: options?.minSimilarity
    })
  }

  /**
   * Search within a specific module
   */
  async searchByModule(
    searchQuery: string,
    course: 'fitter' | 'electrician',
    module: string,
    options?: {
      topK?: number
      minSimilarity?: number
    }
  ): Promise<SearchResult[]> {
    return this.search({
      query: searchQuery,
      course,
      module,
      topK: options?.topK,
      minSimilarity: options?.minSimilarity
    })
  }

  /**
   * Get configuration
   */
  getConfig(): Required<VectorSearchConfig> {
    return {
      defaultTopK: this.config.defaultTopK,
      defaultMinSimilarity: this.config.defaultMinSimilarity,
      embeddingService: this.config.embeddingService,
      chunkCache: this.config.chunkCache,
      enableQueryCache: this.config.enableQueryCache
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      chunkCache: this.chunkCache.getStats(),
      queryCache: performanceOptimizer.getCacheStats()
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.chunkCache.clear()
    performanceOptimizer.clearCache()
  }
}

// Export optimized instance
export const optimizedVectorSearchService = new OptimizedVectorSearchService()
