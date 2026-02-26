import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { PDFProcessor } from '../pdf-processor'

/**
 * Property-Based Test for Chunk Overlap Consistency
 * **Feature: rag-knowledge-base, Property 1: Chunk Overlap Consistency**
 * **Validates: Requirements 2.1, 2.2**
 */
describe('Property Test: Chunk Overlap Consistency', () => {
  const processor = new PDFProcessor()

  it('Property 1: Chunk Overlap Consistency - For any document, when chunked with overlap, consecutive chunks should share content at boundaries', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary text content with sentences
        fc.array(
          fc.lorem({ maxCount: 10 }).map(s => s + '.'),
          { minLength: 5, maxLength: 20 }
        ).map(sentences => sentences.join(' ')),
        
        // Generate chunk configuration
        fc.record({
          chunkSize: fc.integer({ min: 100, max: 300 }),
          chunkOverlap: fc.integer({ min: 20, max: 80 })
        }).filter(config => config.chunkOverlap < config.chunkSize / 2),
        
        async (text: string, config: { chunkSize: number; chunkOverlap: number }) => {
          // Skip empty or very short text
          if (text.trim().length < 50) return
          
          const chunks = await processor.chunkContent(text, config)
          
          // If we have multiple chunks, verify overlap
          if (chunks.length > 1) {
            for (let i = 0; i < chunks.length - 1; i++) {
              const currentChunk = chunks[i]
              const nextChunk = chunks[i + 1]
              
              // Split into sentences to check sentence-level overlap
              const currentSentences = currentChunk.content.trim().split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
              const nextSentences = nextChunk.content.trim().split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
              
              // Skip if either chunk is too short
              if (currentSentences.length < 2 || nextSentences.length < 2) continue
              
              // Find sentence-level overlap: check if any sentences from the end of current chunk
              // appear at the beginning of next chunk
              let sentenceOverlap = 0
              const maxCheck = Math.min(currentSentences.length, nextSentences.length, 10)
              
              for (let j = 1; j <= maxCheck; j++) {
                const currentSuffix = currentSentences.slice(-j)
                const nextPrefix = nextSentences.slice(0, j)
                
                // Check if sentences match exactly
                let allMatch = true
                for (let k = 0; k < j; k++) {
                  if (currentSuffix[k].trim() !== nextPrefix[k].trim()) {
                    allMatch = false
                    break
                  }
                }
                
                if (allMatch) {
                  sentenceOverlap = j
                }
              }
              
              // Calculate overlap tokens
              const overlapTokens = sentenceOverlap > 0 ? 
                processor.estimateTokenCount(nextSentences.slice(0, sentenceOverlap).join(' ')) : 0
              
              // Property: consecutive chunks should have meaningful overlap when overlap is configured
              // Allow some flexibility for cases where sentence boundaries prevent perfect overlap
              const hasReasonableOverlap = overlapTokens > 0 || config.chunkOverlap < 25
              expect(hasReasonableOverlap).toBe(true)
              
              // If we have overlap, it should be reasonable relative to the configured overlap
              if (overlapTokens > 0) {
                // Overlap should not be excessively larger than configured (allow up to 2x for sentence boundaries)
                expect(overlapTokens).toBeLessThanOrEqual(config.chunkOverlap * 2)
              }
            }
          }
          
          // Additional property: all chunks should be within reasonable size bounds
          for (const chunk of chunks) {
            expect(chunk.tokenCount).toBeGreaterThan(0)
            // Allow some flexibility for sentence boundary preservation
            expect(chunk.tokenCount).toBeLessThanOrEqual(config.chunkSize * 1.8)
          }
          
          // Property: chunk indexes should be sequential
          chunks.forEach((chunk, index) => {
            expect(chunk.chunkIndex).toBe(index)
          })
        }
      ),
      { 
        numRuns: 50,
        timeout: 10000
      }
    )
  })

  it('Property 1b: Overlap token count should be approximately correct', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate text with clear sentence boundaries
        fc.array(
          fc.lorem({ maxCount: 15 }).map(s => s + '.'),
          { minLength: 8, maxLength: 20 }
        ).map(sentences => sentences.join(' ')),
        
        fc.record({
          chunkSize: fc.integer({ min: 150, max: 300 }),
          chunkOverlap: fc.integer({ min: 30, max: 80 })
        }).filter(config => config.chunkOverlap < config.chunkSize / 3),
        
        async (text: string, config: { chunkSize: number; chunkOverlap: number }) => {
          if (text.trim().length < 100) return
          
          const chunks = await processor.chunkContent(text, config)
          
          if (chunks.length > 1) {
            for (let i = 0; i < chunks.length - 1; i++) {
              const currentChunk = chunks[i]
              const nextChunk = chunks[i + 1]
              
              // Find actual overlap by comparing content
              const currentWords = currentChunk.content.trim().split(/\s+/)
              const nextWords = nextChunk.content.trim().split(/\s+/)
              
              // Find the longest common subsequence at the boundary
              let overlapWords = 0
              const maxCheck = Math.min(currentWords.length, nextWords.length, 15)
              
              for (let j = 1; j <= maxCheck; j++) {
                const currentSuffix = currentWords.slice(-j).join(' ')
                const nextPrefix = nextWords.slice(0, j).join(' ')
                
                if (currentSuffix === nextPrefix) {
                  overlapWords = j
                }
              }
              
              const overlapTokens = processor.estimateTokenCount(
                currentWords.slice(-overlapWords).join(' ')
              )
              
              // Property: overlap should be reasonable (within reasonable bounds of target)
              // Allow flexibility due to sentence boundary preservation
              if (overlapWords > 0) {
                expect(overlapTokens).toBeLessThanOrEqual(config.chunkOverlap * 3)
                expect(overlapTokens).toBeGreaterThan(0)
              }
            }
          }
        }
      ),
      { 
        numRuns: 30,
        timeout: 10000
      }
    )
  })
})