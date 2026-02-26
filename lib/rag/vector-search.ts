import { query } from '../postgresql'
import { EmbeddingService } from './embedding-service'

export interface SearchQuery {
  query: string
  course?: 'fitter' | 'electrician'
  module?: string
  topK?: number              // Number of results (default: 5)
  minSimilarity?: number     // Minimum similarity score (default: 0.7)
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
  embeddingService?: EmbeddingService
}

export class VectorSearchService {
  private embeddingService: EmbeddingService
  private config: Required<VectorSearchConfig>

  constructor(config?: VectorSearchConfig) {
    this.config = {
      defaultTopK: config?.defaultTopK || 5,
      defaultMinSimilarity: config?.defaultMinSimilarity || 0.7,
      embeddingService: config?.embeddingService || new EmbeddingService()
    }
    
    this.embeddingService = this.config.embeddingService
  }

  /**
   * Perform semantic search on the knowledge base
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
   * Search by pre-computed embedding vector
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

    // Check if pgvector is available
    const vectorCheck = await query(
      "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
    )
    const hasVector = vectorCheck.rows[0].exists

    if (!hasVector) {
      throw new Error('pgvector extension is not enabled. Please install and enable pgvector.')
    }

    // Build the SQL query with filters
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
      return result.rows.map(row => ({
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
      }))
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
   * Get similar chunks to a given chunk
   */
  async findSimilarChunks(
    chunkId: number,
    options?: {
      course?: 'fitter' | 'electrician'
      module?: string
      topK?: number
      minSimilarity?: number
    }
  ): Promise<SearchResult[]> {
    // Get the chunk's embedding
    const chunkResult = await query(
      'SELECT embedding FROM knowledge_chunks WHERE id = $1',
      [chunkId]
    )

    if (chunkResult.rows.length === 0) {
      throw new Error(`Chunk with id ${chunkId} not found`)
    }

    const embedding = chunkResult.rows[0].embedding

    if (!embedding) {
      throw new Error(`Chunk ${chunkId} does not have an embedding`)
    }

    // Parse the embedding if it's a string
    let embeddingArray: number[]
    if (typeof embedding === 'string') {
      // Remove brackets and parse
      embeddingArray = embedding
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map(v => parseFloat(v))
    } else if (Array.isArray(embedding)) {
      embeddingArray = embedding
    } else {
      throw new Error('Invalid embedding format')
    }

    // Search using the embedding, excluding the original chunk
    const results = await this.searchByEmbedding(embeddingArray, {
      course: options?.course,
      module: options?.module,
      topK: (options?.topK || this.config.defaultTopK) + 1, // Get one extra to exclude original
      minSimilarity: options?.minSimilarity
    })

    // Filter out the original chunk
    return results.filter(result => result.chunkId !== chunkId).slice(0, options?.topK || this.config.defaultTopK)
  }

  /**
   * Get configuration
   */
  getConfig(): Required<VectorSearchConfig> {
    return {
      defaultTopK: this.config.defaultTopK,
      defaultMinSimilarity: this.config.defaultMinSimilarity,
      embeddingService: this.config.embeddingService
    }
  }
}

// Export a default instance for convenience
export const vectorSearchService = new VectorSearchService()
