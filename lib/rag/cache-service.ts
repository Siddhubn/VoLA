/**
 * Cache Service for RAG System
 * 
 * Provides in-memory caching for:
 * - Frequently accessed chunks
 * - Module mappings
 * - Embedding results
 * 
 * Features:
 * - TTL (Time To Live) support
 * - LRU (Least Recently Used) eviction
 * - Cache statistics
 * - Configurable size limits
 */

export interface CacheConfig {
  maxSize: number           // Maximum number of items in cache
  defaultTTL: number        // Default TTL in milliseconds
  enableStats: boolean      // Enable statistics tracking
}

export interface CacheEntry<T> {
  value: T
  expiresAt: number
  accessCount: number
  lastAccessed: number
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  maxSize: number
  hitRate: number
  evictions: number
}

export class CacheService<T = any> {
  private cache: Map<string, CacheEntry<T>>
  private config: CacheConfig
  private stats: {
    hits: number
    misses: number
    evictions: number
  }

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new Map()
    this.config = {
      maxSize: config?.maxSize || 1000,
      defaultTTL: config?.defaultTTL || 3600000, // 1 hour default
      enableStats: config?.enableStats !== false
    }
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    }
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++
      }
      return null
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      if (this.config.enableStats) {
        this.stats.misses++
      }
      return null
    }

    // Update access metadata
    entry.accessCount++
    entry.lastAccessed = Date.now()

    if (this.config.enableStats) {
      this.stats.hits++
    }

    return entry.value
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    const expiresAt = Date.now() + (ttl || this.config.defaultTTL)

    this.cache.set(key, {
      value,
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now()
    })
  }

  /**
   * Check if key exists in cache (without updating access stats)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    if (this.config.enableStats) {
      this.stats.hits = 0
      this.stats.misses = 0
      this.stats.evictions = 0
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      if (this.config.enableStats) {
        this.stats.evictions++
      }
    }
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate,
      evictions: this.stats.evictions
    }
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.hits = 0
    this.stats.misses = 0
    this.stats.evictions = 0
  }
}

/**
 * Specialized cache for embeddings
 */
export class EmbeddingCache extends CacheService<number[]> {
  constructor(config?: Partial<CacheConfig>) {
    super({
      maxSize: config?.maxSize || 500,
      defaultTTL: config?.defaultTTL || 7200000, // 2 hours
      enableStats: config?.enableStats !== false
    })
  }

  /**
   * Generate cache key for text
   */
  static generateKey(text: string): string {
    // Simple hash function for cache key
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `emb_${hash}_${text.length}`
  }

  /**
   * Get embedding from cache
   */
  getEmbedding(text: string): number[] | null {
    const key = EmbeddingCache.generateKey(text)
    return this.get(key)
  }

  /**
   * Set embedding in cache
   */
  setEmbedding(text: string, embedding: number[], ttl?: number): void {
    const key = EmbeddingCache.generateKey(text)
    this.set(key, embedding, ttl)
  }
}

/**
 * Specialized cache for module mappings
 */
export class ModuleMappingCache extends CacheService<any> {
  constructor(config?: Partial<CacheConfig>) {
    super({
      maxSize: config?.maxSize || 100,
      defaultTTL: config?.defaultTTL || 86400000, // 24 hours
      enableStats: config?.enableStats !== false
    })
  }

  /**
   * Get module mapping by course
   */
  getModuleMapping(course: string): any | null {
    return this.get(`module_${course}`)
  }

  /**
   * Set module mapping for course
   */
  setModuleMapping(course: string, mapping: any, ttl?: number): void {
    this.set(`module_${course}`, mapping, ttl)
  }

  /**
   * Invalidate module mapping for course
   */
  invalidateModuleMapping(course: string): boolean {
    return this.delete(`module_${course}`)
  }
}

/**
 * Specialized cache for knowledge chunks
 */
export class ChunkCache extends CacheService<any> {
  constructor(config?: Partial<CacheConfig>) {
    super({
      maxSize: config?.maxSize || 1000,
      defaultTTL: config?.defaultTTL || 3600000, // 1 hour
      enableStats: config?.enableStats !== false
    })
  }

  /**
   * Get chunk by ID
   */
  getChunk(chunkId: number): any | null {
    return this.get(`chunk_${chunkId}`)
  }

  /**
   * Set chunk in cache
   */
  setChunk(chunkId: number, chunk: any, ttl?: number): void {
    this.set(`chunk_${chunkId}`, chunk, ttl)
  }

  /**
   * Invalidate chunks by course
   */
  invalidateChunksByCourse(course: string): number {
    let removed = 0
    for (const key of this.keys()) {
      const chunk = this.get(key)
      if (chunk && chunk.course === course) {
        this.delete(key)
        removed++
      }
    }
    return removed
  }
}

// Export singleton instances
export const embeddingCache = new EmbeddingCache()
export const moduleMappingCache = new ModuleMappingCache()
export const chunkCache = new ChunkCache()
