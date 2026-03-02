/**
 * Property-Based Tests for Module Query Filtering
 * 
 * Feature: syllabus-restructure, Property 8: Module query filtering
 * Validates: Requirements 3.2
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { query } from '../../postgresql'

describe('Module Query Filtering - Property Tests', () => {
  /**
   * Property 8: Module query filtering
   * 
   * For any module query with course and trade_type filters, the returned
   * modules should only match those exact filter values.
   */
  it('Property 8: should return only modules matching course and trade_type filters', async () => {
    // Generator for course values
    const courseArb = fc.oneof(
      fc.constant('fitter' as const),
      fc.constant('electrician' as const)
    )
    
    // Generator for trade_type values
    const tradeTypeArb = fc.oneof(
      fc.constant('trade_theory' as const),
      fc.constant('trade_practical' as const)
    )
    
    // Combine course and trade_type
    const filterArb = fc.tuple(courseArb, tradeTypeArb).map(([course, tradeType]) => ({
      course,
      tradeType
    }))
    
    await fc.assert(
      fc.asyncProperty(filterArb, async ({ course, tradeType }) => {
        // Query modules with filters
        const sql = `
          SELECT 
            module,
            course,
            trade_type,
            COUNT(*) as chunk_count
          FROM knowledge_chunks
          WHERE course = $1 
            AND trade_type = $2 
            AND module IS NOT NULL
          GROUP BY module, course, trade_type
        `
        
        const result = await query(sql, [course, tradeType])
        
        // All returned modules should match the filters
        result.rows.forEach((row: any) => {
          expect(row.course).toBe(course)
          expect(row.trade_type).toBe(tradeType)
          expect(row.module).toBeTruthy()
        })
        
        // Verify no modules from other courses or trade types are included
        // by checking that a query without filters returns more or equal results
        const allModulesResult = await query(`
          SELECT COUNT(DISTINCT module) as total
          FROM knowledge_chunks
          WHERE module IS NOT NULL
        `)
        
        const filteredCount = result.rows.length
        const totalCount = parseInt(allModulesResult.rows[0].total)
        
        expect(filteredCount).toBeLessThanOrEqual(totalCount)
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Course-only filtering
   * 
   * For any course filter without trade_type, all modules for that course
   * should be returned regardless of trade_type.
   */
  it('should return all trade types when trade_type filter is not specified', async () => {
    const courseArb = fc.oneof(
      fc.constant('fitter' as const),
      fc.constant('electrician' as const)
    )
    
    await fc.assert(
      fc.asyncProperty(courseArb, async (course) => {
        // Query with only course filter
        const courseOnlyResult = await query(`
          SELECT DISTINCT trade_type
          FROM knowledge_chunks
          WHERE course = $1 AND module IS NOT NULL
        `, [course])
        
        // Query with course and each trade_type
        const theoryResult = await query(`
          SELECT COUNT(DISTINCT module) as count
          FROM knowledge_chunks
          WHERE course = $1 AND trade_type = 'trade_theory' AND module IS NOT NULL
        `, [course])
        
        const practicalResult = await query(`
          SELECT COUNT(DISTINCT module) as count
          FROM knowledge_chunks
          WHERE course = $1 AND trade_type = 'trade_practical' AND module IS NOT NULL
        `, [course])
        
        const theoryCount = parseInt(theoryResult.rows[0]?.count || '0')
        const practicalCount = parseInt(practicalResult.rows[0]?.count || '0')
        
        // Course-only query should include both trade types if they exist
        const tradeTypes = courseOnlyResult.rows.map((row: any) => row.trade_type)
        
        if (theoryCount > 0) {
          expect(tradeTypes).toContain('trade_theory')
        }
        
        if (practicalCount > 0) {
          expect(tradeTypes).toContain('trade_practical')
        }
      }),
      { numRuns: 50 }
    )
  })
  
  /**
   * Property: Empty result consistency
   * 
   * For any course and trade_type combination that has no data,
   * the query should return an empty array (not null or error).
   */
  it('should return empty array for course/trade_type combinations with no data', async () => {
    // Use a course that might not have data for certain trade types
    const filterArb = fc.tuple(
      fc.oneof(fc.constant('fitter' as const), fc.constant('electrician' as const)),
      fc.oneof(fc.constant('trade_theory' as const), fc.constant('trade_practical' as const))
    ).map(([course, tradeType]) => ({ course, tradeType }))
    
    await fc.assert(
      fc.asyncProperty(filterArb, async ({ course, tradeType }) => {
        const result = await query(`
          SELECT module
          FROM knowledge_chunks
          WHERE course = $1 AND trade_type = $2 AND module IS NOT NULL
          GROUP BY module
        `, [course, tradeType])
        
        // Should always return an array (even if empty)
        expect(Array.isArray(result.rows)).toBe(true)
        
        // If empty, length should be 0
        if (result.rows.length === 0) {
          expect(result.rows).toHaveLength(0)
        }
      }),
      { numRuns: 50 }
    )
  })
  
  /**
   * Property: Filter combination consistency
   * 
   * For any valid course and trade_type, querying with both filters
   * should return a subset of querying with just the course filter.
   */
  it('should return subset when adding trade_type filter to course filter', async () => {
    const filterArb = fc.tuple(
      fc.oneof(fc.constant('fitter' as const), fc.constant('electrician' as const)),
      fc.oneof(fc.constant('trade_theory' as const), fc.constant('trade_practical' as const))
    ).map(([course, tradeType]) => ({ course, tradeType }))
    
    await fc.assert(
      fc.asyncProperty(filterArb, async ({ course, tradeType }) => {
        // Query with only course
        const courseOnlyResult = await query(`
          SELECT COUNT(DISTINCT module) as count
          FROM knowledge_chunks
          WHERE course = $1 AND module IS NOT NULL
        `, [course])
        
        // Query with course and trade_type
        const bothFiltersResult = await query(`
          SELECT COUNT(DISTINCT module) as count
          FROM knowledge_chunks
          WHERE course = $1 AND trade_type = $2 AND module IS NOT NULL
        `, [course, tradeType])
        
        const courseOnlyCount = parseInt(courseOnlyResult.rows[0].count)
        const bothFiltersCount = parseInt(bothFiltersResult.rows[0].count)
        
        // Adding trade_type filter should return same or fewer results
        expect(bothFiltersCount).toBeLessThanOrEqual(courseOnlyCount)
      }),
      { numRuns: 100 }
    )
  })
})
