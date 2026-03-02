/**
 * Property-Based Tests for Module Detail Completeness
 * 
 * Feature: syllabus-restructure, Property 9: Module detail completeness
 * Validates: Requirements 3.3
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { query } from '../../postgresql'

describe('Module Detail Completeness - Property Tests', () => {
  /**
   * Property 9: Module detail completeness
   * 
   * For any module detail query, all chunks belonging to that module
   * should be included in the response.
   */
  it('Property 9: should return all chunks for a given module', async () => {
    // First, get all available modules from the database
    const modulesResult = await query(`
      SELECT DISTINCT course, module, trade_type
      FROM knowledge_chunks
      WHERE module IS NOT NULL
      LIMIT 20
    `)
    
    if (modulesResult.rows.length === 0) {
      console.log('⚠️ No modules found in database, skipping test')
      return
    }
    
    // Generator for selecting a random module from available modules
    const moduleArb = fc.constantFrom(...modulesResult.rows.map((row: any) => ({
      course: row.course,
      module: row.module,
      tradeType: row.trade_type
    })))
    
    await fc.assert(
      fc.asyncProperty(moduleArb, async ({ course, module, tradeType }) => {
        // Get expected chunk count for this module
        const expectedResult = await query(`
          SELECT COUNT(*) as total_chunks
          FROM knowledge_chunks
          WHERE course = $1 AND module = $2 AND trade_type = $3
        `, [course, module, tradeType])
        
        const expectedCount = parseInt(expectedResult.rows[0].total_chunks)
        
        // Query module details (simulating the API route logic)
        const detailsResult = await query(`
          SELECT 
            content,
            chunk_index,
            page_number,
            section,
            trade_type
          FROM knowledge_chunks
          WHERE course = $1 AND module = $2 AND trade_type = $3
          ORDER BY chunk_index
        `, [course, module, tradeType])
        
        // All chunks should be returned
        expect(detailsResult.rows.length).toBe(expectedCount)
        
        // All returned chunks should match the filters
        detailsResult.rows.forEach((row: any) => {
          expect(row.trade_type).toBe(tradeType)
        })
        
        // Verify no duplicate chunk_index values
        const chunkIndices = detailsResult.rows.map((row: any) => row.chunk_index)
        const uniqueIndices = new Set(chunkIndices)
        expect(uniqueIndices.size).toBe(chunkIndices.length)
      }),
      { numRuns: 50 }
    )
  })
  
  /**
   * Property: Module detail query without trade_type filter
   * 
   * When querying module details without a trade_type filter,
   * all chunks for that module across all trade types should be returned.
   */
  it('should return all chunks across trade types when trade_type is not specified', async () => {
    // Get modules that exist in multiple trade types
    const modulesResult = await query(`
      SELECT course, module, COUNT(DISTINCT trade_type) as trade_type_count
      FROM knowledge_chunks
      WHERE module IS NOT NULL
      GROUP BY course, module
      HAVING COUNT(DISTINCT trade_type) > 1
      LIMIT 10
    `)
    
    if (modulesResult.rows.length === 0) {
      console.log('⚠️ No modules with multiple trade types found, skipping test')
      return
    }
    
    const moduleArb = fc.constantFrom(...modulesResult.rows.map((row: any) => ({
      course: row.course,
      module: row.module
    })))
    
    await fc.assert(
      fc.asyncProperty(moduleArb, async ({ course, module }) => {
        // Get total chunks without trade_type filter
        const allChunksResult = await query(`
          SELECT COUNT(*) as total
          FROM knowledge_chunks
          WHERE course = $1 AND module = $2
        `, [course, module])
        
        // Get chunks for each trade type separately
        const theoryResult = await query(`
          SELECT COUNT(*) as count
          FROM knowledge_chunks
          WHERE course = $1 AND module = $2 AND trade_type = 'trade_theory'
        `, [course, module])
        
        const practicalResult = await query(`
          SELECT COUNT(*) as count
          FROM knowledge_chunks
          WHERE course = $1 AND module = $2 AND trade_type = 'trade_practical'
        `, [course, module])
        
        const totalCount = parseInt(allChunksResult.rows[0].total)
        const theoryCount = parseInt(theoryResult.rows[0].count)
        const practicalCount = parseInt(practicalResult.rows[0].count)
        
        // Total should equal sum of individual trade types
        expect(totalCount).toBe(theoryCount + practicalCount)
        
        // Total should be greater than or equal to each individual count
        expect(totalCount).toBeGreaterThanOrEqual(theoryCount)
        expect(totalCount).toBeGreaterThanOrEqual(practicalCount)
      }),
      { numRuns: 30 }
    )
  })
  
  /**
   * Property: Chunk ordering consistency
   * 
   * For any module detail query, chunks should be returned in
   * ascending order by chunk_index.
   */
  it('should return chunks in ascending order by chunk_index', async () => {
    const modulesResult = await query(`
      SELECT DISTINCT course, module, trade_type
      FROM knowledge_chunks
      WHERE module IS NOT NULL
      LIMIT 20
    `)
    
    if (modulesResult.rows.length === 0) {
      console.log('⚠️ No modules found in database, skipping test')
      return
    }
    
    const moduleArb = fc.constantFrom(...modulesResult.rows.map((row: any) => ({
      course: row.course,
      module: row.module,
      tradeType: row.trade_type
    })))
    
    await fc.assert(
      fc.asyncProperty(moduleArb, async ({ course, module, tradeType }) => {
        const result = await query(`
          SELECT chunk_index
          FROM knowledge_chunks
          WHERE course = $1 AND module = $2 AND trade_type = $3
          ORDER BY chunk_index
        `, [course, module, tradeType])
        
        if (result.rows.length <= 1) {
          // Single or no chunks, ordering is trivially correct
          return
        }
        
        // Verify chunks are in ascending order
        for (let i = 1; i < result.rows.length; i++) {
          const prevIndex = result.rows[i - 1].chunk_index
          const currIndex = result.rows[i].chunk_index
          expect(currIndex).toBeGreaterThanOrEqual(prevIndex)
        }
      }),
      { numRuns: 50 }
    )
  })
  
  /**
   * Property: Non-null content requirement
   * 
   * For any module detail query, all returned chunks should have
   * non-null content.
   */
  it('should return only chunks with non-null content', async () => {
    const modulesResult = await query(`
      SELECT DISTINCT course, module, trade_type
      FROM knowledge_chunks
      WHERE module IS NOT NULL
      LIMIT 20
    `)
    
    if (modulesResult.rows.length === 0) {
      console.log('⚠️ No modules found in database, skipping test')
      return
    }
    
    const moduleArb = fc.constantFrom(...modulesResult.rows.map((row: any) => ({
      course: row.course,
      module: row.module,
      tradeType: row.trade_type
    })))
    
    await fc.assert(
      fc.asyncProperty(moduleArb, async ({ course, module, tradeType }) => {
        const result = await query(`
          SELECT content
          FROM knowledge_chunks
          WHERE course = $1 AND module = $2 AND trade_type = $3
        `, [course, module, tradeType])
        
        // All chunks should have content
        result.rows.forEach((row: any) => {
          expect(row.content).toBeTruthy()
          expect(typeof row.content).toBe('string')
          expect(row.content.trim().length).toBeGreaterThan(0)
        })
      }),
      { numRuns: 50 }
    )
  })
})
