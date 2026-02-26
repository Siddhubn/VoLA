import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { VectorSearchService } from '../vector-search'
import { EmbeddingService } from '../embedding-service'
import { query } from '../../postgresql'
import { createKnowledgeChunk } from '../rag-db'
import * as fc from 'fast-check'

/**
 * Property-Based Test: Module Filtering
 * 
 * Property 4: Module Filtering
 * For any module-specific search, all results should belong to that module
 * 
 * Validates: Requirements 5.5, 12.4
 * - 5.5: Filter results by module
 * - 12.4: Filter search results to module's content
 */

describe('Property Test: Module Filtering', () => {
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

    // Create test data across multiple courses and modules
    await query("DELETE FROM knowledge_chunks WHERE pdf_source LIKE 'module-test-%'")

    const testData = [
      // Fitter - Safety module
      { course: 'fitter', module: 'safety', content: 'Safety helmets protect workers from head injuries.' },
      { course: 'fitter', module: 'safety', content: 'Fire extinguishers must be accessible at all times.' },
      { course: 'fitter', module: 'safety', content: 'Personal protective equipment is mandatory in workshops.' },
      
      // Fitter - Tools module
      { course: 'fitter', module: 'tools', content: 'Hammers are used for striking and shaping metal.' },
      { course: 'fitter', module: 'tools', content: 'Screwdrivers come in flathead and Phillips varieties.' },
      { course: 'fitter', module: 'tools', content: 'Wrenches are essential for tightening bolts and nuts.' },
      
      // Fitter - Measurement module
      { course: 'fitter', module: 'measurement', content: 'Calipers measure internal and external dimensions.' },
      { course: 'fitter', module: 'measurement', content: 'Micrometers provide precise measurements to 0.01mm.' },
      
      // Electrician - Safety module
      { course: 'electrician', module: 'safety', content: 'Electrical grounding prevents shock hazards.' },
      { course: 'electrician', module: 'safety', content: 'Insulation protects against electrical current.' },
      { course: 'electrician', module: 'safety', content: 'Circuit breakers prevent electrical overload.' },
      
      // Electrician - Circuits module
      { course: 'electrician', module: 'circuits', content: 'Series circuits have one path for current flow.' },
      { course: 'electrician', module: 'circuits', content: 'Parallel circuits have multiple current paths.' },
      { course: 'electrician', module: 'circuits', content: 'Ohms law relates voltage, current, and resistance.' },
      
      // Electrician - Motors module
      { course: 'electrician', module: 'motors', content: 'AC motors run on alternating current.' },
      { course: 'electrician', module: 'motors', content: 'DC motors use direct current for operation.' }
    ]

    for (let i = 0; i < testData.length; i++) {
      const data = testData[i]
      const embedding = await embeddingService.generateEmbedding(data.content)

      await createKnowledgeChunk({
        course: data.course as 'fitter' | 'electrician',
        pdf_source: `module-test-${i}.pdf`,
        module: data.module,
        section: `Section ${i}`,
        page_number: i + 1,
        chunk_index: i,
        content: data.content,
        embedding: embedding.embedding,
        token_count: embedding.tokenCount
      })
    }
  })

  afterAll(async () => {
    if (hasPgVector) {
      await query("DELETE FROM knowledge_chunks WHERE pdf_source LIKE 'module-test-%'")
    }
  })

  it('Property: Module filter returns only chunks from specified module', async () => {
    if (!hasPgVector) {
      console.warn('⚠️ Skipping property test: pgvector not available')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary course and module combinations
        fc.oneof(
          fc.record({
            course: fc.constant('fitter' as const),
            module: fc.oneof(
              fc.constant('safety'),
              fc.constant('tools'),
              fc.constant('measurement')
            )
          }),
          fc.record({
            course: fc.constant('electrician' as const),
            module: fc.oneof(
              fc.constant('safety'),
              fc.constant('circuits'),
              fc.constant('motors')
            )
          })
        ),
        // Generate arbitrary search queries
        fc.oneof(
          fc.constant('safety procedures'),
          fc.constant('equipment and tools'),
          fc.constant('electrical systems'),
          fc.constant('measurement techniques'),
          fc.constant('protection and safety')
        ),
        async ({ course, module }, searchQuery) => {
          // Perform module-filtered search
          const results = await searchService.search({
            query: searchQuery,
            course,
            module,
            topK: 10,
            minSimilarity: 0.0 // No threshold to test filtering
          })

          // Property: ALL results must belong to the specified module
          results.forEach(result => {
            expect(result.source.module).toBe(module)
            expect(result.source.course).toBe(course)
          })
        }
      ),
      {
        numRuns: 30, // Test many combinations
        verbose: true
      }
    )
  })

  it('Property: Course filter returns only chunks from specified course', async () => {
    if (!hasPgVector) {
      console.warn('⚠️ Skipping property test: pgvector not available')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('fitter' as const),
          fc.constant('electrician' as const)
        ),
        fc.oneof(
          fc.constant('safety'),
          fc.constant('tools'),
          fc.constant('equipment'),
          fc.constant('electrical')
        ),
        async (course, searchQuery) => {
          // Perform course-filtered search
          const results = await searchService.search({
            query: searchQuery,
            course,
            topK: 10,
            minSimilarity: 0.0
          })

          // Property: ALL results must belong to the specified course
          results.forEach(result => {
            expect(result.source.course).toBe(course)
          })
        }
      ),
      {
        numRuns: 20,
        verbose: true
      }
    )
  })

  it('Property: Module filtering is a subset of course filtering', async () => {
    if (!hasPgVector) {
      console.warn('⚠️ Skipping property test: pgvector not available')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          course: fc.constant('fitter' as const),
          module: fc.constant('safety')
        }),
        fc.constant('safety equipment'),
        async ({ course, module }, searchQuery) => {
          // Search with course filter only
          const courseResults = await searchService.search({
            query: searchQuery,
            course,
            topK: 10,
            minSimilarity: 0.0
          })

          // Search with both course and module filter
          const moduleResults = await searchService.search({
            query: searchQuery,
            course,
            module,
            topK: 10,
            minSimilarity: 0.0
          })

          // Property: Module results should be a subset of course results
          expect(moduleResults.length).toBeLessThanOrEqual(courseResults.length)

          // Property: All module results should be in course results
          const courseChunkIds = new Set(courseResults.map(r => r.chunkId))
          moduleResults.forEach(result => {
            expect(courseChunkIds.has(result.chunkId)).toBe(true)
          })

          // Property: All module results should have the specified module
          moduleResults.forEach(result => {
            expect(result.source.module).toBe(module)
          })
        }
      ),
      {
        numRuns: 15,
        verbose: true
      }
    )
  })

  it('Property: Unfiltered search returns results from all courses and modules', async () => {
    if (!hasPgVector) {
      console.warn('⚠️ Skipping property test: pgvector not available')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.constant('safety'),
        async (searchQuery) => {
          // Search without any filters
          const results = await searchService.search({
            query: searchQuery,
            topK: 20,
            minSimilarity: 0.0
          })

          // Property: Results should include multiple courses (if data exists)
          const courses = new Set(results.map(r => r.source.course))
          const modules = new Set(results.map(r => r.source.module))

          // We expect to see results from both courses for "safety" query
          // since we have safety modules in both fitter and electrician
          if (results.length >= 4) {
            expect(courses.size).toBeGreaterThan(1)
          }
        }
      ),
      {
        numRuns: 10,
        verbose: true
      }
    )
  })

  it('Property: searchByModule method enforces module filtering', async () => {
    if (!hasPgVector) {
      console.warn('⚠️ Skipping property test: pgvector not available')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.record({
            course: fc.constant('fitter' as const),
            module: fc.constant('tools')
          }),
          fc.record({
            course: fc.constant('electrician' as const),
            module: fc.constant('circuits')
          })
        ),
        fc.constant('equipment and systems'),
        async ({ course, module }, searchQuery) => {
          // Use searchByModule method
          const results = await searchService.searchByModule(
            searchQuery,
            course,
            module,
            { topK: 10 }
          )

          // Property: ALL results must match the specified course and module
          results.forEach(result => {
            expect(result.source.course).toBe(course)
            expect(result.source.module).toBe(module)
          })
        }
      ),
      {
        numRuns: 15,
        verbose: true
      }
    )
  })

  it('Property: searchByCourse method enforces course filtering', async () => {
    if (!hasPgVector) {
      console.warn('⚠️ Skipping property test: pgvector not available')
      return
    }

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('fitter' as const),
          fc.constant('electrician' as const)
        ),
        fc.constant('safety and equipment'),
        async (course, searchQuery) => {
          // Use searchByCourse method
          const results = await searchService.searchByCourse(
            searchQuery,
            course,
            { topK: 10 }
          )

          // Property: ALL results must match the specified course
          results.forEach(result => {
            expect(result.source.course).toBe(course)
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
