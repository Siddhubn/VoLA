import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CacheService,
  EmbeddingCache,
  ModuleMappingCache,
  ChunkCache
} from '../cache-service'

describe('CacheService', () => {
  let cache: CacheService<string>

  beforeEach(() => {
    cache = new CacheService<string>({
      maxSize: 5,
      defaultTTL: 1000, // 1 second for testing
      enableStats: true
    })
  })

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull()
    })

    it('should check if key exists', () => {
      cache.set('key1', 'value1')
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('key2')).toBe(false)
    })

    it('should delete values', () => {
      cache.set('key1', 'value1')
      expect(cache.delete('key1')).toBe(true)
      expect(cache.get('key1')).toBeNull()
      expect(cache.delete('key1')).toBe(false)
    })

    it('should clear all values', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.clear()
      expect(cache.size()).toBe(0)
      expect(cache.get('key1')).toBeNull()
    })

    it('should return all keys', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      const keys = cache.keys()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys.length).toBe(2)
    })

    it('should return cache size', () => {
      expect(cache.size()).toBe(0)
      cache.set('key1', 'value1')
      expect(cache.size()).toBe(1)
      cache.set('key2', 'value2')
      expect(cache.size()).toBe(2)
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 100) // 100ms TTL
      expect(cache.get('key1')).toBe('value1')

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      expect(cache.get('key1')).toBeNull()
    })

    it('should use default TTL when not specified', async () => {
      cache.set('key1', 'value1') // Uses default 1000ms TTL
      expect(cache.get('key1')).toBe('value1')

      // Should still be valid after 500ms
      await new Promise(resolve => setTimeout(resolve, 500))
      expect(cache.get('key1')).toBe('value1')
    })

    it('should remove expired entries on has() check', async () => {
      cache.set('key1', 'value1', 100)
      expect(cache.has('key1')).toBe(true)

      await new Promise(resolve => setTimeout(resolve, 150))
      expect(cache.has('key1')).toBe(false)
    })

    it('should cleanup expired entries', async () => {
      cache.set('key1', 'value1', 100)
      cache.set('key2', 'value2', 100)
      cache.set('key3', 'value3', 5000) // Long TTL

      await new Promise(resolve => setTimeout(resolve, 150))

      const removed = cache.cleanup()
      expect(removed).toBe(2)
      expect(cache.size()).toBe(1)
      expect(cache.get('key3')).toBe('value3')
    })
  })

  describe('LRU Eviction', () => {
    it('should evict least recently used item when at capacity', () => {
      // Fill cache to capacity (5 items)
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      cache.set('key4', 'value4')
      cache.set('key5', 'value5')

      expect(cache.size()).toBe(5)

      // Access keys 2-5 to make key1 the least recently used
      cache.get('key2')
      cache.get('key3')
      cache.get('key4')
      cache.get('key5')

      // Add new item, should evict key1 (least recently used)
      cache.set('key6', 'value6')

      expect(cache.size()).toBe(5)
      expect(cache.get('key1')).toBeNull() // Evicted
      expect(cache.get('key2')).toBe('value2') // Still exists
      expect(cache.get('key6')).toBe('value6') // New item
    })

    it('should not evict when updating existing key', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      cache.set('key4', 'value4')
      cache.set('key5', 'value5')

      // Update existing key
      cache.set('key1', 'updated')

      expect(cache.size()).toBe(5)
      expect(cache.get('key1')).toBe('updated')
    })
  })

  describe('Statistics', () => {
    it('should track cache hits', () => {
      cache.set('key1', 'value1')
      cache.get('key1')
      cache.get('key1')

      const stats = cache.getStats()
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(0)
    })

    it('should track cache misses', () => {
      cache.get('nonexistent1')
      cache.get('nonexistent2')

      const stats = cache.getStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(2)
    })

    it('should calculate hit rate', () => {
      cache.set('key1', 'value1')
      cache.get('key1') // hit
      cache.get('key2') // miss
      cache.get('key1') // hit

      const stats = cache.getStats()
      expect(stats.hitRate).toBeCloseTo(2 / 3, 2)
    })

    it('should track evictions', () => {
      // Fill cache beyond capacity
      for (let i = 1; i <= 7; i++) {
        cache.set(`key${i}`, `value${i}`)
      }

      const stats = cache.getStats()
      expect(stats.evictions).toBe(2) // 2 items evicted
    })

    it('should reset statistics', () => {
      cache.set('key1', 'value1')
      cache.get('key1')
      cache.get('nonexistent')

      cache.resetStats()

      const stats = cache.getStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.evictions).toBe(0)
    })

    it('should include size and maxSize in stats', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')

      const stats = cache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.maxSize).toBe(5)
    })
  })
})

describe('EmbeddingCache', () => {
  let cache: EmbeddingCache

  beforeEach(() => {
    cache = new EmbeddingCache({
      maxSize: 10,
      defaultTTL: 5000
    })
  })

  it('should generate consistent cache keys', () => {
    const text = 'test embedding text'
    const key1 = EmbeddingCache.generateKey(text)
    const key2 = EmbeddingCache.generateKey(text)
    expect(key1).toBe(key2)
  })

  it('should generate different keys for different texts', () => {
    const key1 = EmbeddingCache.generateKey('text1')
    const key2 = EmbeddingCache.generateKey('text2')
    expect(key1).not.toBe(key2)
  })

  it('should cache and retrieve embeddings', () => {
    const text = 'test text'
    const embedding = [0.1, 0.2, 0.3, 0.4]

    cache.setEmbedding(text, embedding)
    const retrieved = cache.getEmbedding(text)

    expect(retrieved).toEqual(embedding)
  })

  it('should return null for non-cached embeddings', () => {
    const retrieved = cache.getEmbedding('uncached text')
    expect(retrieved).toBeNull()
  })

  it('should respect custom TTL', async () => {
    const text = 'test text'
    const embedding = [0.1, 0.2, 0.3]

    cache.setEmbedding(text, embedding, 100) // 100ms TTL
    expect(cache.getEmbedding(text)).toEqual(embedding)

    await new Promise(resolve => setTimeout(resolve, 150))
    expect(cache.getEmbedding(text)).toBeNull()
  })
})

describe('ModuleMappingCache', () => {
  let cache: ModuleMappingCache

  beforeEach(() => {
    cache = new ModuleMappingCache()
  })

  it('should cache and retrieve module mappings', () => {
    const mapping = {
      modules: [
        { id: 1, name: 'Module 1' },
        { id: 2, name: 'Module 2' }
      ]
    }

    cache.setModuleMapping('fitter', mapping)
    const retrieved = cache.getModuleMapping('fitter')

    expect(retrieved).toEqual(mapping)
  })

  it('should return null for non-cached courses', () => {
    const retrieved = cache.getModuleMapping('electrician')
    expect(retrieved).toBeNull()
  })

  it('should invalidate specific course mapping', () => {
    const mapping1 = { modules: [{ id: 1, name: 'Module 1' }] }
    const mapping2 = { modules: [{ id: 2, name: 'Module 2' }] }

    cache.setModuleMapping('fitter', mapping1)
    cache.setModuleMapping('electrician', mapping2)

    cache.invalidateModuleMapping('fitter')

    expect(cache.getModuleMapping('fitter')).toBeNull()
    expect(cache.getModuleMapping('electrician')).toEqual(mapping2)
  })

  it('should use long TTL by default (24 hours)', () => {
    const mapping = { modules: [] }
    cache.setModuleMapping('fitter', mapping)

    // Should still be cached after 1 second
    expect(cache.getModuleMapping('fitter')).toEqual(mapping)
  })
})

describe('ChunkCache', () => {
  let cache: ChunkCache

  beforeEach(() => {
    cache = new ChunkCache({
      maxSize: 20
    })
  })

  it('should cache and retrieve chunks by ID', () => {
    const chunk = {
      id: 1,
      content: 'test content',
      course: 'fitter',
      module: 'safety'
    }

    cache.setChunk(1, chunk)
    const retrieved = cache.getChunk(1)

    expect(retrieved).toEqual(chunk)
  })

  it('should return null for non-cached chunks', () => {
    const retrieved = cache.getChunk(999)
    expect(retrieved).toBeNull()
  })

  it('should invalidate chunks by course', () => {
    const chunk1 = { id: 1, content: 'content1', course: 'fitter' }
    const chunk2 = { id: 2, content: 'content2', course: 'fitter' }
    const chunk3 = { id: 3, content: 'content3', course: 'electrician' }

    cache.setChunk(1, chunk1)
    cache.setChunk(2, chunk2)
    cache.setChunk(3, chunk3)

    const removed = cache.invalidateChunksByCourse('fitter')

    expect(removed).toBe(2)
    expect(cache.getChunk(1)).toBeNull()
    expect(cache.getChunk(2)).toBeNull()
    expect(cache.getChunk(3)).toEqual(chunk3)
  })

  it('should handle chunks without course field', () => {
    const chunk = { id: 1, content: 'content' }
    cache.setChunk(1, chunk)

    const removed = cache.invalidateChunksByCourse('fitter')
    expect(removed).toBe(0)
    expect(cache.getChunk(1)).toEqual(chunk)
  })
})
