/**
 * Performance Optimization Utilities for RAG System
 * 
 * Provides utilities for optimizing vector search, database queries, and batch processing
 */

import { query } from '../postgresql'

export interface IndexOptimizationConfig {
  lists?: number          // Number of IVFFlat lists (default: sqrt(rows))
  probes?: number         // Number of lists to search (default: lists/10)
  maintenanceWorkMem?: string  // Memory for index operations (default: '256MB')
}

export interface QueryCacheConfig {
  maxSize: number         // Maximum number of cached queries
  ttl: number            // Time to live in milliseconds
}

export class PerformanceOptimizer {
  private queryCache: Map<string, { result: any; timestamp: number }>
  private cacheConfig: QueryCacheConfig

  constructor(cacheConfig?: Partial<QueryCacheConfig>) {
    this.cacheConfig = {
      maxSize: cacheConfig?.maxSize || 1000,
      ttl: cacheConfig?.ttl || 300000 // 5 minutes default
    }
    this.queryCache = new Map()
  }

  /**
   * Optimize IVFFlat index parameters for better performance
   */
  async optimizeVectorIndex(config?: IndexOptimizationConfig): Promise<void> {
    try {
      // Get current row count
      const countResult = await query(
        'SELECT COUNT(*) as count FROM knowledge_chunks WHERE embedding IS NOT NULL'
      )
      const rowCount = parseInt(countResult.rows[0].count)

      if (rowCount === 0) {
        console.log('⚠️ No embeddings found, skipping index optimization')
        return
      }

      // Calculate optimal number of lists (sqrt of row count is a good heuristic)
      const optimalLists = config?.lists || Math.max(Math.floor(Math.sqrt(rowCount)), 10)
      const optimalProbes = config?.probes || Math.max(Math.floor(optimalLists / 10), 1)

      console.log('🔧 Optimizing vector index...')
      console.log(`   Rows: ${rowCount}`)
      console.log(`   Lists: ${optimalLists}`)
      console.log(`   Probes: ${optimalProbes}`)

      // Drop existing index if it exists
      await query('DROP INDEX IF EXISTS idx_chunks_embedding')

      // Create optimized IVFFlat index
      await query(`
        CREATE INDEX idx_chunks_embedding 
        ON knowledge_chunks 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = ${optimalLists})
      `)

      // Set optimal number of probes for queries
      await query(`SET ivfflat.probes = ${optimalProbes}`)

      // Set maintenance work memory for better index creation
      if (config?.maintenanceWorkMem) {
        await query(`SET maintenance_work_mem = '${config.maintenanceWorkMem}'`)
      }

      console.log('✅ Vector index optimized successfully')
    } catch (error) {
      console.error('❌ Error optimizing vector index:', error)
      throw error
    }
  }

  /**
   * Create additional indexes for common query patterns
   */
  async createOptimizedIndexes(): Promise<void> {
    try {
      console.log('🔧 Creating optimized indexes...')

      const indexes = [
        // Composite index for course + module filtering
        {
          name: 'idx_chunks_course_module_composite',
          sql: 'CREATE INDEX IF NOT EXISTS idx_chunks_course_module_composite ON knowledge_chunks(course, module) WHERE embedding IS NOT NULL'
        },
        // Index for similarity threshold filtering
        {
          name: 'idx_chunks_embedding_not_null',
          sql: 'CREATE INDEX IF NOT EXISTS idx_chunks_embedding_not_null ON knowledge_chunks(id) WHERE embedding IS NOT NULL'
        },
        // Partial index for fitter course
        {
          name: 'idx_chunks_fitter',
          sql: "CREATE INDEX IF NOT EXISTS idx_chunks_fitter ON knowledge_chunks(module) WHERE course = 'fitter' AND embedding IS NOT NULL"
        },
        // Partial index for electrician course
        {
          name: 'idx_chunks_electrician',
          sql: "CREATE INDEX IF NOT EXISTS idx_chunks_electrician ON knowledge_chunks(module) WHERE course = 'electrician' AND embedding IS NOT NULL"
        }
      ]

      for (const index of indexes) {
        try {
          await query(index.sql)
          console.log(`   ✅ Created ${index.name}`)
        } catch (error: any) {
          if (error.code === '42P07') {
            console.log(`   ⏭️ ${index.name} already exists`)
          } else {
            console.error(`   ❌ Failed to create ${index.name}:`, error.message)
          }
        }
      }

      console.log('✅ Optimized indexes created')
    } catch (error) {
      console.error('❌ Error creating optimized indexes:', error)
      throw error
    }
  }

  /**
   * Analyze tables for better query planning
   */
  async analyzeTables(): Promise<void> {
    try {
      console.log('🔧 Analyzing tables for query optimization...')
      
      await query('ANALYZE knowledge_chunks')
      await query('ANALYZE pdf_documents')
      await query('ANALYZE module_mapping')
      
      console.log('✅ Tables analyzed successfully')
    } catch (error) {
      console.error('❌ Error analyzing tables:', error)
      throw error
    }
  }

  /**
   * Get query from cache or execute and cache result
   */
  async cachedQuery(
    cacheKey: string,
    queryFn: () => Promise<any>
  ): Promise<any> {
    // Check cache
    const cached = this.queryCache.get(cacheKey)
    if (cached) {
      const age = Date.now() - cached.timestamp
      if (age < this.cacheConfig.ttl) {
        return cached.result
      } else {
        // Expired, remove from cache
        this.queryCache.delete(cacheKey)
      }
    }

    // Execute query
    const result = await queryFn()

    // Cache result
    this.queryCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    })

    // Enforce max cache size (LRU eviction)
    if (this.queryCache.size > this.cacheConfig.maxSize) {
      // Remove oldest entry
      const oldestKey = this.queryCache.keys().next().value
      this.queryCache.delete(oldestKey)
    }

    return result
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    maxSize: number
    ttl: number
  } {
    return {
      size: this.queryCache.size,
      maxSize: this.cacheConfig.maxSize,
      ttl: this.cacheConfig.ttl
    }
  }

  /**
   * Optimize database connection pool settings
   */
  async optimizeConnectionPool(): Promise<void> {
    try {
      console.log('🔧 Optimizing connection pool settings...')

      // Set optimal work memory for queries
      await query("SET work_mem = '64MB'")

      // Set optimal shared buffers (if we have permission)
      try {
        await query("SET shared_buffers = '256MB'")
      } catch (error) {
        console.log('   ⚠️ Could not set shared_buffers (requires superuser)')
      }

      // Set effective cache size
      try {
        await query("SET effective_cache_size = '1GB'")
      } catch (error) {
        console.log('   ⚠️ Could not set effective_cache_size')
      }

      // Enable parallel query execution
      await query("SET max_parallel_workers_per_gather = 2")

      console.log('✅ Connection pool settings optimized')
    } catch (error) {
      console.error('❌ Error optimizing connection pool:', error)
    }
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(): Promise<{
    totalChunks: number
    chunksWithEmbeddings: number
    indexSize: string
    tableSize: string
    cacheHitRatio: number
  }> {
    try {
      // Get chunk counts
      const countResult = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(embedding) as with_embeddings
        FROM knowledge_chunks
      `)

      // Get table and index sizes
      const sizeResult = await query(`
        SELECT 
          pg_size_pretty(pg_total_relation_size('knowledge_chunks')) as table_size,
          pg_size_pretty(pg_indexes_size('knowledge_chunks')) as index_size
      `)

      // Get cache hit ratio
      const cacheResult = await query(`
        SELECT 
          CASE 
            WHEN (blks_hit + blks_read) = 0 THEN 0
            ELSE ROUND(blks_hit::numeric / (blks_hit + blks_read) * 100, 2)
          END as cache_hit_ratio
        FROM pg_stat_database
        WHERE datname = current_database()
      `)

      return {
        totalChunks: parseInt(countResult.rows[0].total),
        chunksWithEmbeddings: parseInt(countResult.rows[0].with_embeddings),
        indexSize: sizeResult.rows[0].index_size,
        tableSize: sizeResult.rows[0].table_size,
        cacheHitRatio: parseFloat(cacheResult.rows[0].cache_hit_ratio)
      }
    } catch (error) {
      console.error('❌ Error getting performance stats:', error)
      throw error
    }
  }

  /**
   * Run VACUUM to reclaim space and update statistics
   */
  async vacuum(): Promise<void> {
    try {
      console.log('🔧 Running VACUUM on knowledge_chunks...')
      await query('VACUUM ANALYZE knowledge_chunks')
      console.log('✅ VACUUM completed')
    } catch (error) {
      console.error('❌ Error running VACUUM:', error)
      throw error
    }
  }

  /**
   * Optimize batch processing by adjusting batch sizes based on system load
   */
  getBatchSize(totalItems: number, systemLoad: 'low' | 'medium' | 'high' = 'medium'): number {
    const baseBatchSize = {
      low: 100,
      medium: 50,
      high: 25
    }[systemLoad]

    // Adjust based on total items
    if (totalItems < 100) {
      return Math.min(totalItems, 25)
    } else if (totalItems < 1000) {
      return baseBatchSize
    } else {
      return Math.min(baseBatchSize * 2, 200)
    }
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer()
