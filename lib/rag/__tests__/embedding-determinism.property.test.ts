import { describe, it, expect, beforeAll } from 'vitest'
import * as fc from 'fast-check'
import { LocalEmbeddingService } from '../local-embedding-service'

/**
 * Property-Based Test for Embedding Determinism
 * **Feature: rag-knowledge-base, Property 2: Embedding Determinism**
 * **Validates: Requirements 3.1, 3.3**
 * 
 * Uses Local embedding service with all-MiniLM-L6-v2 model (384 dimensions)
 * Runs completely offline, no API calls needed
 */
describe('Property Test: Embedding Determinism', () => {
  let embeddingService: LocalEmbeddingService

  beforeAll(() => {
    embeddingService = new LocalEmbeddingService()
  })

  it('Property 2: Embedding Determinism - For any text input, generating embeddings multiple times should produce identical results', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary text inputs
        fc.oneof(
          fc.lorem({ maxCount: 50 }), // Lorem ipsum text
          fc.string({ minLength: 10, maxLength: 200 }), // Random strings
          fc.array(fc.string({ minLength: 3, maxLength: 15 }), { minLength: 3, maxLength: 20 }).map(words => words.join(' ')), // Word arrays
          fc.constantFrom(
            'Safety procedures in the workshop',
            'Electrical circuit analysis',
            'Hand tools and measuring instruments',
            'Voltage and current relationships'
          ) // Technical content
        ),
        
        async (text: string) => {
          // Skip empty or very short text
          if (!text || text.trim().length < 5) return

          try {
            // Generate embedding multiple times
            const embedding1 = await embeddingService.generateEmbedding(text)
            const embedding2 = await embeddingService.generateEmbedding(text)
            const embedding3 = await embeddingService.generateEmbedding(text)

            // Property: All embeddings should be identical
            expect(embedding1.embedding).toEqual(embedding2.embedding)
            expect(embedding2.embedding).toEqual(embedding3.embedding)
            expect(embedding1.embedding).toEqual(embedding3.embedding)

            // Property: Embeddings should have consistent dimensions (384 for all-MiniLM-L6-v2)
            expect(embedding1.embedding.length).toBe(384)
            expect(embedding2.embedding.length).toBe(384)
            expect(embedding3.embedding.length).toBe(384)

            // Property: Embeddings should contain valid numbers
            embedding1.embedding.forEach(value => {
              expect(typeof value).toBe('number')
              expect(isFinite(value)).toBe(true)
              expect(isNaN(value)).toBe(false)
            })

            // Property: Token counts should be consistent
            if (embedding1.tokenCount && embedding2.tokenCount) {
              expect(embedding1.tokenCount).toBe(embedding2.tokenCount)
            }

          } catch (error) {
            console.error('Embedding generation error:', error)
            throw error
          }
        }
      ),
      { 
        numRuns: 20,
        timeout: 60000 // Longer timeout for first run (model download)
      }
    )
  })

  it('Property 2b: Batch embedding determinism - Batch and individual embeddings should be identical', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate array of texts
        fc.array(
          fc.oneof(
            fc.lorem({ maxCount: 20 }),
            fc.string({ minLength: 10, maxLength: 100 })
          ),
          { minLength: 2, maxLength: 5 }
        ).filter(texts => texts.every(t => t && t.trim().length >= 5)),
        
        async (texts: string[]) => {
          if (texts.length === 0) return

          try {
            // Generate embeddings individually
            const individualEmbeddings = await Promise.all(
              texts.map(text => embeddingService.generateEmbedding(text))
            )

            // Generate embeddings in batch
            const batchResult = await embeddingService.generateBatchEmbeddings(texts)

            // Property: Batch embeddings should match individual embeddings
            expect(batchResult.embeddings.length).toBe(individualEmbeddings.length)
            
            for (let i = 0; i < individualEmbeddings.length; i++) {
              if (batchResult.embeddings[i] && individualEmbeddings[i]) {
                expect(batchResult.embeddings[i]).toEqual(individualEmbeddings[i].embedding)
              }
            }

            // Property: No failed indices for valid inputs
            expect(batchResult.failedIndices.length).toBe(0)

          } catch (error) {
            console.error('Batch embedding error:', error)
            throw error
          }
        }
      ),
      { 
        numRuns: 10,
        timeout: 60000
      }
    )
  })

  it('Property 2c: Query embedding consistency - embedQuery should match generateEmbedding', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.lorem({ maxCount: 30 }),
          fc.constantFrom(
            'What is electrical safety?',
            'How to use a micrometer?',
            'Safety procedures in workshop',
            'Voltage measurement techniques'
          )
        ),
        
        async (query: string) => {
          if (!query || query.trim().length < 5) return

          try {
            // Generate embedding using both methods
            const embeddingResult = await embeddingService.generateEmbedding(query)
            const queryEmbedding = await embeddingService.embedQuery(query)

            // Property: Both methods should produce identical results
            expect(queryEmbedding).toEqual(embeddingResult.embedding)
            expect(queryEmbedding.length).toBe(384) // Local all-MiniLM-L6-v2 dimension

          } catch (error) {
            console.error('Query embedding error:', error)
            throw error
          }
        }
      ),
      { 
        numRuns: 15,
        timeout: 60000
      }
    )
  })
})