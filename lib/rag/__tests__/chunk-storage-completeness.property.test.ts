/**
 * Property-Based Tests for Chunk Storage Completeness
 * 
 * Feature: syllabus-restructure, Property 7: Chunk storage completeness
 * Validates: Requirements 3.1
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  validateChunk,
  isValidChunk,
  createStorageChunk,
  type StorageChunk
} from '../chunk-storage'

describe('Chunk Storage Completeness - Property Tests', () => {
  /**
   * Property 7: Chunk storage completeness
   * 
   * For any knowledge chunk stored, it must include non-null values
   * for course, trade_type, module, and content fields.
   */
  it('Property 7: should validate all required fields are present', () => {
    // Generator for valid storage chunks
    const validChunkArb = fc.record({
      content: fc.lorem({ maxCount: 20 }).filter(s => s.trim().length > 0),
      course: fc.constantFrom('fitter' as const, 'electrician' as const),
      trade_type: fc.constantFrom('trade_theory' as const, 'trade_practical' as const),
      module: fc.stringMatching(/^module-\d+-[a-z-]+$/),
      module_name: fc.stringMatching(/^Module \d+ - [A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/),
      section: fc.oneof(fc.constant(null), fc.lorem({ maxCount: 5 })),
      page_number: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 1000 })),
      chunk_index: fc.integer({ min: 0, max: 1000 })
    })
    
    fc.assert(
      fc.property(validChunkArb, (chunk) => {
        // All required fields should be present
        expect(chunk.content).toBeTruthy()
        expect(chunk.course).toBeTruthy()
        expect(chunk.trade_type).toBeTruthy()
        expect(chunk.module).toBeTruthy()
        expect(chunk.module_name).toBeTruthy()
        expect(chunk.chunk_index).toBeGreaterThanOrEqual(0)
        
        // Validation should pass
        const errors = validateChunk(chunk)
        expect(errors).toHaveLength(0)
        
        // Should be valid
        expect(isValidChunk(chunk)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Missing required fields fail validation
   * 
   * For any chunk missing a required field, validation should fail.
   */
  it('should fail validation when required fields are missing', () => {
    // Generator for chunks with missing fields
    const incompleteChunkArb = fc.oneof(
      // Missing content
      fc.record({
        course: fc.constantFrom('fitter' as const, 'electrician' as const),
        trade_type: fc.constantFrom('trade_theory' as const, 'trade_practical' as const),
        module: fc.string(),
        module_name: fc.string(),
        chunk_index: fc.integer({ min: 0 })
      }),
      // Missing course
      fc.record({
        content: fc.lorem({ maxCount: 10 }),
        trade_type: fc.constantFrom('trade_theory' as const, 'trade_practical' as const),
        module: fc.string(),
        module_name: fc.string(),
        chunk_index: fc.integer({ min: 0 })
      }),
      // Missing trade_type
      fc.record({
        content: fc.lorem({ maxCount: 10 }),
        course: fc.constantFrom('fitter' as const, 'electrician' as const),
        module: fc.string(),
        module_name: fc.string(),
        chunk_index: fc.integer({ min: 0 })
      }),
      // Missing module
      fc.record({
        content: fc.lorem({ maxCount: 10 }),
        course: fc.constantFrom('fitter' as const, 'electrician' as const),
        trade_type: fc.constantFrom('trade_theory' as const, 'trade_practical' as const),
        module_name: fc.string(),
        chunk_index: fc.integer({ min: 0 })
      })
    )
    
    fc.assert(
      fc.property(incompleteChunkArb, (chunk) => {
        const errors = validateChunk(chunk)
        expect(errors.length).toBeGreaterThan(0)
        expect(isValidChunk(chunk)).toBe(false)
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Created chunks are always valid
   * 
   * For any chunk created with createStorageChunk, it should
   * always pass validation.
   */
  it('should create valid chunks with createStorageChunk', () => {
    const chunkParamsArb = fc.record({
      content: fc.lorem({ maxCount: 20 }).filter(s => s.trim().length > 0),
      course: fc.constantFrom('fitter' as const, 'electrician' as const),
      trade_type: fc.constantFrom('trade_theory' as const, 'trade_practical' as const),
      module: fc.stringMatching(/^module-\d+$/),
      module_name: fc.stringMatching(/^Module \d+$/),
      section: fc.oneof(fc.constant(undefined), fc.lorem({ maxCount: 5 })),
      page_number: fc.oneof(fc.constant(undefined), fc.integer({ min: 1, max: 1000 })),
      chunk_index: fc.integer({ min: 0, max: 1000 })
    })
    
    fc.assert(
      fc.property(chunkParamsArb, (params) => {
        const chunk = createStorageChunk(params)
        
        // Should have all required fields
        expect(chunk.content).toBeTruthy()
        expect(chunk.course).toBeTruthy()
        expect(chunk.trade_type).toBeTruthy()
        expect(chunk.module).toBeTruthy()
        expect(chunk.module_name).toBeTruthy()
        
        // Should pass validation
        expect(isValidChunk(chunk)).toBe(true)
        const errors = validateChunk(chunk)
        expect(errors).toHaveLength(0)
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Course values are constrained
   * 
   * For any valid chunk, course must be either 'fitter' or 'electrician'.
   */
  it('should only accept valid course values', () => {
    const chunkWithCourseArb = fc.record({
      content: fc.lorem({ maxCount: 10 }),
      course: fc.string(),
      trade_type: fc.constantFrom('trade_theory' as const, 'trade_practical' as const),
      module: fc.string(),
      module_name: fc.string(),
      chunk_index: fc.integer({ min: 0 })
    }).filter(chunk => chunk.course !== 'fitter' && chunk.course !== 'electrician')
    
    fc.assert(
      fc.property(chunkWithCourseArb, (chunk) => {
        const errors = validateChunk(chunk)
        const hasCourseError = errors.some(e => e.field === 'course')
        expect(hasCourseError).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Trade type values are constrained
   * 
   * For any valid chunk, trade_type must be either 'trade_theory' or 'trade_practical'.
   */
  it('should only accept valid trade_type values', () => {
    const chunkWithTradeTypeArb = fc.record({
      content: fc.lorem({ maxCount: 10 }),
      course: fc.constantFrom('fitter' as const, 'electrician' as const),
      trade_type: fc.string(),
      module: fc.string(),
      module_name: fc.string(),
      chunk_index: fc.integer({ min: 0 })
    }).filter(chunk => chunk.trade_type !== 'trade_theory' && chunk.trade_type !== 'trade_practical')
    
    fc.assert(
      fc.property(chunkWithTradeTypeArb, (chunk) => {
        const errors = validateChunk(chunk)
        const hasTradeTypeError = errors.some(e => e.field === 'trade_type')
        expect(hasTradeTypeError).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Chunk index must be non-negative
   * 
   * For any chunk with a negative chunk_index, validation should fail.
   */
  it('should reject negative chunk indices', () => {
    const chunkWithNegativeIndexArb = fc.record({
      content: fc.lorem({ maxCount: 10 }),
      course: fc.constantFrom('fitter' as const, 'electrician' as const),
      trade_type: fc.constantFrom('trade_theory' as const, 'trade_practical' as const),
      module: fc.string(),
      module_name: fc.string(),
      chunk_index: fc.integer({ max: -1 })
    })
    
    fc.assert(
      fc.property(chunkWithNegativeIndexArb, (chunk) => {
        const errors = validateChunk(chunk)
        const hasIndexError = errors.some(e => e.field === 'chunk_index')
        expect(hasIndexError).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})
