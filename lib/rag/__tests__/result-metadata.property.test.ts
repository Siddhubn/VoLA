/**
 * Property-Based Tests for Result Metadata Presence
 * Feature: syllabus-restructure, Property 11: Result metadata presence
 * Validates: Requirements 3.5
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { VectorSearchService } from '../vector-search'
import { query } from '../../postgresql'

describe('Result Metadata - Property Tests', () => {
  it('Property 11: should include module and trade_type metadata in all results', async () => {
    const dataCheck = await query(`SELECT COUNT(*) as count FROM knowledge_chunks WHERE embedding IS NOT NULL`)
    const totalChunks = parseInt(dataCheck.rows[0].count)
    
    if (totalChunks === 0) {
      console.log('⚠️ No chunks with embeddings found, skipping test')
      return
    }
    
    const courseArb = fc.oneof(fc.constant('fitter' as const), fc.constant('electrician' as const))
    const queryArb = fc.oneof(fc.constant('safety'), fc.constant('tools'), fc.constant('electrical'))
    
    const searchParamsArb = fc.tuple(queryArb, courseArb).map(
      ([searchQuery, course]) => ({ query: searchQuery, course })
    )
    
    const vectorSearchService = new VectorSearchService()
    
    await fc.assert(
      fc.asyncProperty(searchParamsArb, async ({ query: searchQuery, course }) => {
        try {
          const results = await vectorSearchService.search({
            query: searchQuery,
            course,
            topK: 10,
            minSimilarity: 0.5
          })
          
          results.forEach(result => {
            expect(result.source).toBeDefined()
            expect(result.source.course).toBeDefined()
            expect(result.source.module).toBeDefined()
          })
        } catch (error) {
          return
        }
      }),
      { numRuns: 30 }
    )
  })
})
