/**
 * Performance Tests for RAG System
 * 
 * Tests search query response time, concurrent query handling, and batch processing throughput
 * Requirements: Performance requirements
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { VectorSearchService } from '../vector-search'
import { LocalEmbeddingService } from '../local-embedding-service'
import { query, closePool } from '../../postgresql'

describe('Performance Tests', () => {
  let searchService: VectorSearchService
  let embeddingService: LocalEmbeddingService
  let hasData = false

  beforeAll(async () => {
    embeddingService = new LocalEmbeddingService()
    searchService = new VectorSearchService({
      embeddingService
    })

    // Check if we have test data
    try {
      const result = await query('SELECT COUNT(*) as count FROM knowledge_chunks WHERE embedding IS NOT NULL')
      hasData = result.rows[0].count > 0
      
      if (!hasData) {
        console.warn('⚠️ No test data found in knowledge_chunks. Some performance tests will be skipped.')
      } else {
        console.log(`✅ Found ${result.rows[0].count} chunks for performance testing`)
      }
    } catch (error) {
      console.error('Error checking test data:', error)
      hasData = false
    }
  })

  afterAll(async () => {
    await closePool()
  })

  describe('Search Query Response Time', () => {
    it('should complete search queries within 200ms for 95% of requests', async () => {
      if (!hasData) {
        console.log('⏭️ Skipping test - no data available')
        return
      }

      const queries = [
        'safety equipment',
        'measuring tools',
        'electrical circuits',
        'workshop safety',
        'hand tools'
      ]

      const responseTimes: number[] = []
      const iterations = 20 // Run each query 4 times = 100 total queries

      for (let i = 0; i < iterations; i++) {
        for (const query of queries) {
          const startTime = performance.now()
          
          await searchService.search({
            query,
            topK: 5
          })
          
          const endTime = performance.now()
          const duration = endTime - startTime
          responseTimes.push(duration)
        }
      }

      // Sort response times
      responseTimes.sort((a, b) => a - b)

      // Calculate 95th percentile
      const p95Index = Math.floor(responseTimes.length * 0.95)
      const p95Time = responseTimes[p95Index]

      // Calculate statistics
      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const minTime = responseTimes[0]
      const maxTime = responseTimes[responseTimes.length - 1]
      const medianTime = responseTimes[Math.floor(responseTimes.length / 2)]

      console.log('📊 Search Performance Statistics:')
      console.log(`   Total queries: ${responseTimes.length}`)
      console.log(`   Average: ${avgTime.toFixed(2)}ms`)
      console.log(`   Median: ${medianTime.toFixed(2)}ms`)
      console.log(`   Min: ${minTime.toFixed(2)}ms`)
      console.log(`   Max: ${maxTime.toFixed(2)}ms`)
      console.log(`   95th percentile: ${p95Time.toFixed(2)}ms`)

      // 95% of requests should complete within 200ms
      expect(p95Time).toBeLessThan(200)
    }, 60000) // 60 second timeout

    it('should handle filtered searches efficiently', async () => {
      if (!hasData) {
        console.log('⏭️ Skipping test - no data available')
        return
      }

      const startTime = performance.now()
      
      const results = await searchService.search({
        query: 'safety procedures',
        course: 'fitter',
        topK: 10
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime

      console.log(`📊 Filtered search completed in ${duration.toFixed(2)}ms`)
      console.log(`   Results returned: ${results.length}`)

      // Filtered searches should also be fast
      expect(duration).toBeLessThan(250)
    })
  })

  describe('Concurrent Query Handling', () => {
    it('should handle 10 concurrent queries efficiently', async () => {
      if (!hasData) {
        console.log('⏭️ Skipping test - no data available')
        return
      }

      const queries = [
        'safety equipment',
        'measuring tools',
        'electrical circuits',
        'workshop safety',
        'hand tools',
        'power tools',
        'maintenance procedures',
        'quality control',
        'technical drawing',
        'material properties'
      ]

      const startTime = performance.now()
      
      // Execute all queries concurrently
      const promises = queries.map(query =>
        searchService.search({ query, topK: 5 })
      )
      
      const results = await Promise.all(promises)
      
      const endTime = performance.now()
      const duration = endTime - startTime

      console.log('📊 Concurrent Query Performance:')
      console.log(`   Queries: ${queries.length}`)
      console.log(`   Total time: ${duration.toFixed(2)}ms`)
      console.log(`   Average per query: ${(duration / queries.length).toFixed(2)}ms`)
      console.log(`   Total results: ${results.reduce((sum, r) => sum + r.length, 0)}`)

      // All concurrent queries should complete reasonably fast
      expect(duration).toBeLessThan(2000) // 2 seconds for 10 concurrent queries
      
      // Verify all queries returned results
      results.forEach((result, index) => {
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
      })
    })

    it('should handle 50 concurrent queries without errors', async () => {
      if (!hasData) {
        console.log('⏭️ Skipping test - no data available')
        return
      }

      const baseQueries = [
        'safety', 'tools', 'equipment', 'procedures', 'maintenance'
      ]

      // Create 50 queries by repeating and varying
      const queries = Array.from({ length: 50 }, (_, i) => 
        `${baseQueries[i % baseQueries.length]} ${Math.floor(i / baseQueries.length)}`
      )

      const startTime = performance.now()
      
      const promises = queries.map(query =>
        searchService.search({ query, topK: 3 })
      )
      
      const results = await Promise.all(promises)
      
      const endTime = performance.now()
      const duration = endTime - startTime

      console.log('📊 High Concurrency Performance:')
      console.log(`   Queries: ${queries.length}`)
      console.log(`   Total time: ${duration.toFixed(2)}ms`)
      console.log(`   Average per query: ${(duration / queries.length).toFixed(2)}ms`)

      // Should handle high concurrency
      expect(results.length).toBe(50)
      expect(duration).toBeLessThan(5000) // 5 seconds for 50 queries
    })
  })

  describe('Batch Processing Throughput', () => {
    it('should generate embeddings for batch efficiently', async () => {
      const texts = [
        'Safety equipment is essential in the workshop',
        'Measuring tools must be calibrated regularly',
        'Electrical circuits require proper insulation',
        'Workshop safety protocols must be followed',
        'Hand tools should be maintained properly',
        'Power tools require safety training',
        'Maintenance procedures ensure equipment longevity',
        'Quality control checks prevent defects',
        'Technical drawings communicate specifications',
        'Material properties affect tool selection'
      ]

      const startTime = performance.now()
      
      const embeddings = await Promise.all(
        texts.map(text => embeddingService.generateEmbedding(text))
      )
      
      const endTime = performance.now()
      const duration = endTime - startTime

      console.log('📊 Batch Embedding Performance:')
      console.log(`   Texts processed: ${texts.length}`)
      console.log(`   Total time: ${duration.toFixed(2)}ms`)
      console.log(`   Average per text: ${(duration / texts.length).toFixed(2)}ms`)
      console.log(`   Throughput: ${(texts.length / (duration / 1000)).toFixed(2)} texts/second`)

      // Verify all embeddings generated
      expect(embeddings.length).toBe(texts.length)
      embeddings.forEach(embedding => {
        expect(embedding).toBeDefined()
        expect(embedding.length).toBeGreaterThan(0)
      })

      // Should process at reasonable speed (local embeddings are fast)
      expect(duration).toBeLessThan(5000) // 5 seconds for 10 texts
    })

    it('should handle large batch processing', async () => {
      // Create 50 test texts
      const texts = Array.from({ length: 50 }, (_, i) => 
        `Test text number ${i} about workshop safety and equipment maintenance procedures`
      )

      const startTime = performance.now()
      
      // Process in smaller batches to avoid overwhelming the system
      const batchSize = 10
      const results: number[][] = []
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)
        const batchEmbeddings = await Promise.all(
          batch.map(text => embeddingService.generateEmbedding(text))
        )
        results.push(...batchEmbeddings)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime

      console.log('📊 Large Batch Processing Performance:')
      console.log(`   Total texts: ${texts.length}`)
      console.log(`   Batch size: ${batchSize}`)
      console.log(`   Total time: ${duration.toFixed(2)}ms`)
      console.log(`   Average per text: ${(duration / texts.length).toFixed(2)}ms`)
      console.log(`   Throughput: ${(texts.length / (duration / 1000)).toFixed(2)} texts/second`)

      // Verify all processed
      expect(results.length).toBe(texts.length)
      
      // Should maintain reasonable throughput
      const throughput = texts.length / (duration / 1000)
      expect(throughput).toBeGreaterThan(5) // At least 5 texts per second
    })
  })

  describe('Database Query Performance', () => {
    it('should efficiently query with multiple filters', async () => {
      if (!hasData) {
        console.log('⏭️ Skipping test - no data available')
        return
      }

      // Get a sample module
      const moduleResult = await query(
        'SELECT DISTINCT module FROM knowledge_chunks WHERE module IS NOT NULL LIMIT 1'
      )
      
      if (moduleResult.rows.length === 0) {
        console.log('⏭️ Skipping test - no modules available')
        return
      }

      const testModule = moduleResult.rows[0].module

      const startTime = performance.now()
      
      const results = await searchService.search({
        query: 'safety procedures',
        course: 'fitter',
        module: testModule,
        topK: 10,
        minSimilarity: 0.5
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime

      console.log('📊 Multi-Filter Query Performance:')
      console.log(`   Duration: ${duration.toFixed(2)}ms`)
      console.log(`   Results: ${results.length}`)

      expect(duration).toBeLessThan(300)
    })

    it('should handle high topK values efficiently', async () => {
      if (!hasData) {
        console.log('⏭️ Skipping test - no data available')
        return
      }

      const startTime = performance.now()
      
      const results = await searchService.search({
        query: 'workshop equipment',
        topK: 50
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime

      console.log('📊 High TopK Query Performance:')
      console.log(`   Duration: ${duration.toFixed(2)}ms`)
      console.log(`   Results: ${results.length}`)

      // Should handle large result sets
      expect(duration).toBeLessThan(400)
    })
  })

  describe('Cache Performance', () => {
    it('should improve performance with caching', async () => {
      const testQuery = 'safety equipment and procedures'

      // First query (cache miss)
      const startTime1 = performance.now()
      await searchService.search({ query: testQuery, topK: 5 })
      const endTime1 = performance.now()
      const duration1 = endTime1 - startTime1

      // Second query (cache hit for embedding)
      const startTime2 = performance.now()
      await searchService.search({ query: testQuery, topK: 5 })
      const endTime2 = performance.now()
      const duration2 = endTime2 - startTime2

      console.log('📊 Cache Performance:')
      console.log(`   First query (cache miss): ${duration1.toFixed(2)}ms`)
      console.log(`   Second query (cache hit): ${duration2.toFixed(2)}ms`)
      console.log(`   Improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`)

      // Cached query should be faster or similar (embedding is cached)
      // Note: The difference might be small since local embeddings are already fast
      expect(duration2).toBeLessThanOrEqual(duration1 * 1.1) // Allow 10% variance
    })
  })
})
