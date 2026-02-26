import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { VectorSearchService } from '../vector-search'
import { EmbeddingService } from '../embedding-service'
import { query } from '../../postgresql'
import { createKnowledgeChunk } from '../rag-db'
import * as fc from 'fast-check'

/**
 * Property-Based Test: Search Relevance
 * 
 * Property 3: Search Relevance
 * For any search query, results should be ordered by decreasing similarity score
 * 
 * Validates: Requirements 5.2, 5.3
 * - 5.2: Return the top K most similar chunks
 * - 5.3: Include similarity scores and source metadata
 */

describe('Property Test: Search Relevance', () => {
  let searchService: VectorSearchService
  let embeddingService: EmbeddingService
  let hasPgVector = false

  beforeAll(async () => {
    // Check if pgvector is available
    const vectorCheck = await query(
      "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
    )
    hasPgVector = vectorCheck.rows[0].exists

    if (!hasPgVector) {
      console.warn('⚠️ pgvector extension not available, skipping property tests')
      return
    }

    embeddingService = new EmbeddingService()
    searchService = new VectorSearchService({ embeddingService })

    // Create diverse test data for property testing
    await query("DELETE FROM knowledge_chunks WHERE pdf_source LIKE 'prop-test-%'")

    const testContents = [
      'Safety equipment includes helmets, gloves, and protective eyewear for worker protection.',
      'Fire safety procedures require regular drills and proper extinguisher maintenance.',
      'Hand tools such as hammers, screwdrivers, and wrenches are essential for fitters.',
      'Electrical circuits can be connected in series or parallel configurations.',
      'Proper grounding is critical for electrical safety in all installations.',
      'Measuring instruments include calipers, micrometers, and dial indicators.',
      'Welding safety requires proper ventilation and protective equipment.',
      'Machine tools include lathes, milling machines, and drilling machines.',
      'Electrical motors convert electrical energy into mechanical energy.',
      'Workshop safety rules must be followed at all times to prevent accidents.'
    ]

    for (let i = 0; i < testContents.length; i++) {
      const content = testContents[i]
      const embedding = await embeddingService.generateEmbedding(content)

      await createKnowledgeChunk({
        course: i % 2 === 0 ? 'fitter' : 'electrician',
        pdf_source: `prop-test-${i}.pdf`,
        module: i < 5 ? 'safety' : 'tools',
        section: `Section ${i}`,
        page_number: i + 1,
        chunk_index: i,
        content,
        embedding: embedding.embedding,
        token_count: embedding.tokenCount
      })
    }
  })

  afterAll(async () => {
    if (hasPgVector) {
      await query("DELETE FROM knowledge_chunks WHERE pdf_source LIKE 'prop-test-%'")
    }
  })

  it('Property: Search results are ordered by decreasing similarity', async () => {
    if (!hasPgVector) {
      console.warn('⚠️ Skipping property test: pgvector not available')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary search queries
        fc.oneof(
          fc.constant('safety equipment'),
          fc.constant('electrical circuits'),
          fc.constant('hand tools'),
          fc.constant('fire safety'),
          fc.constant('welding procedures'),
          fc.constant('measuring instruments'),
          fc.constant('workshop safety'),
          fc.constant('machine tools'),
          fc.constant('protective gear'),
          fc.constant('electrical motors')
        ),
        // Generate arbitrary topK values
        fc.integer({ min: 2, max: 10 }),
        async (searchQuery, topK) => {
          // Perform search
          const results = await searchService.search({
            query: searchQuery,
            topK,
            minSimilarity: 0.0 // No threshold to test ordering
          })

          // Property: Results must be ordered by decreasing similarity
          if (results.length > 1) {
            for (let i = 1; i < results.length; i++) {
              const prevSimilarity = results[i - 1].similarity
              const currSimilarity = results[i].similarity

              // Each result should have similarity <= previous result
              expect(currSimilarity).toBeLessThanOrEqual(prevSimilarity)
            }
          }

          // Property: All results should have similarity scores between 0 and 1
          results.forEach(result => {
            expect(result.similarity).toBeGreaterThanOrEqual(0)
            expect(result.similarity).toBeLessThanOrEqual(1)
          })

          // Property: Number of results should not exceed topK
          expect(results.length).toBeLessThanOrEqual(topK)

          // Property: Each result should have required metadata
          results.forEach(result => {
            expect(result).toHaveProperty('chunkId')
            expect(result).toHaveProperty('content')
            expect(result).toHaveProperty('similarity')
            expect(result).toHaveProperty('source')
            expect(result.source).toHaveProperty('course')
            expect(result.source).toHaveProperty('pdfSource')
          })
        }
      ),
      {
        numRuns: 20, // Run 20 test cases
        verbose: true
      }
    )
  })

  it('Property: Similarity scores are consistent across multiple searches', async () => {
    if (!hasPgVector) {
      console.warn('⚠️ Skipping property test: pgvector not available')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('safety'),
          fc.constant('electrical'),
          fc.constant('tools'),
          fc.constant('equipment')
        ),
        async (searchQuery) => {
          // Perform the same search twice
          const results1 = await searchService.search({
            query: searchQuery,
            topK: 5
          })

          const results2 = await searchService.search({
            query: searchQuery,
            topK: 5
          })

          // Property: Results should be identical (same order, same scores)
          expect(results1.length).toBe(results2.length)

          for (let i = 0; i < results1.length; i++) {
            expect(results1[i].chunkId).toBe(results2[i].chunkId)
            // Similarity scores should be very close (within floating point precision)
            expect(Math.abs(results1[i].similarity - results2[i].similarity)).toBeLessThan(0.0001)
          }
        }
      ),
      {
        numRuns: 10,
        verbose: true
      }
    )
  })

  it('Property: Higher topK returns more results (when available)', async () => {
    if (!hasPgVector) {
      console.warn('⚠️ Skipping property test: pgvector not available')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constant('safety'),
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 6, max: 10 }),
        async (searchQuery, smallTopK, largeTopK) => {
          const smallResults = await searchService.search({
            query: searchQuery,
            topK: smallTopK,
            minSimilarity: 0.0
          })

          const largeResults = await searchService.search({
            query: searchQuery,
            topK: largeTopK,
            minSimilarity: 0.0
          })

          // Property: Larger topK should return at least as many results
          expect(largeResults.length).toBeGreaterThanOrEqual(smallResults.length)

          // Property: The first N results should be the same
          const minLength = Math.min(smallResults.length, largeResults.length)
          for (let i = 0; i < minLength; i++) {
            expect(smallResults[i].chunkId).toBe(largeResults[i].chunkId)
          }
        }
      ),
      {
        numRuns: 10,
        verbose: true
      }
    )
  })

  it('Property: Minimum similarity threshold filters results correctly', async () => {
    if (!hasPgVector) {
      console.warn('⚠️ Skipping property test: pgvector not available')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constant('safety equipment'),
        fc.double({ min: 0.5, max: 0.9 }),
        async (searchQuery, minSimilarity) => {
          const results = await searchService.search({
            query: searchQuery,
            topK: 10,
            minSimilarity
          })

          // Property: All results must meet or exceed the minimum similarity
          results.forEach(result => {
            expect(result.similarity).toBeGreaterThanOrEqual(minSimilarity)
          })
        }
      ),
      {
        numRuns: 15,
        verbose: true
      }
    )
  })
})
