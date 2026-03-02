/**
 * Property-Based Tests for Chunk Module Association
 * 
 * Feature: syllabus-restructure, Property 4: Chunk module association
 * Validates: Requirements 2.3
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { ModuleContextTracker } from '../module-context-tracker'

describe('Chunk Module Association - Property Tests', () => {
  /**
   * Property 4: Chunk module association
   * 
   * For any chunk processed after a module header is detected,
   * that chunk should be associated with the detected module.
   */
  it('Property 4: should associate chunks with detected module', () => {
    // Generator for module headers
    const moduleHeaderArb = fc.tuple(
      fc.integer({ min: 1, max: 10 }),
      fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/)
    ).map(([num, name]) => ({
      header: `Module ${num} - ${name}`,
      expectedNumber: num,
      expectedName: name,
      expectedId: `module-${num}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    }))
    
    // Generator for chunk content
    const chunkContentArb = fc.lorem({ maxCount: 20 })
    
    // Combine header and chunk
    const headerAndChunkArb = fc.tuple(moduleHeaderArb, chunkContentArb)
    
    fc.assert(
      fc.property(headerAndChunkArb, ([moduleInfo, chunkContent]) => {
        const tracker = new ModuleContextTracker()
        
        // Process the module header
        const isHeader = tracker.processLine(moduleInfo.header, 0)
        expect(isHeader).toBe(true)
        
        // Associate a chunk after the header
        const chunk = tracker.associateChunk(chunkContent, 1)
        
        // Chunk should be associated with the detected module
        expect(chunk.moduleNumber).toBe(moduleInfo.expectedNumber)
        expect(chunk.moduleName).toBe(moduleInfo.header)
        expect(chunk.module).toBe(moduleInfo.expectedId)
        expect(chunk.content).toBe(chunkContent)
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Multiple chunks after same header
   * 
   * For any sequence of chunks after a single module header,
   * all chunks should be associated with that same module.
   */
  it('should associate multiple chunks with the same module', () => {
    const moduleHeaderArb = fc.tuple(
      fc.integer({ min: 1, max: 10 }),
      fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/)
    ).map(([num, name]) => ({
      header: `Module ${num} - ${name}`,
      expectedNumber: num,
      expectedId: `module-${num}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    }))
    
    const chunksArb = fc.array(fc.lorem({ maxCount: 10 }), { minLength: 2, maxLength: 5 })
    
    const testCaseArb = fc.tuple(moduleHeaderArb, chunksArb)
    
    fc.assert(
      fc.property(testCaseArb, ([moduleInfo, chunks]) => {
        const tracker = new ModuleContextTracker()
        
        // Process the module header
        tracker.processLine(moduleInfo.header, 0)
        
        // Associate multiple chunks
        const associatedChunks = chunks.map((content, idx) => 
          tracker.associateChunk(content, idx + 1)
        )
        
        // All chunks should have the same module association
        associatedChunks.forEach(chunk => {
          expect(chunk.moduleNumber).toBe(moduleInfo.expectedNumber)
          expect(chunk.module).toBe(moduleInfo.expectedId)
        })
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Chunks before any header
   * 
   * For any chunks processed before any module header is detected,
   * those chunks should be associated with the default "General Content" module.
   */
  it('should associate chunks with default module when no header detected', () => {
    const chunksArb = fc.array(fc.lorem({ maxCount: 10 }), { minLength: 1, maxLength: 5 })
    
    fc.assert(
      fc.property(chunksArb, (chunks) => {
        const tracker = new ModuleContextTracker()
        
        // Associate chunks without processing any headers
        const associatedChunks = chunks.map((content, idx) => 
          tracker.associateChunk(content, idx)
        )
        
        // All chunks should be associated with default module
        associatedChunks.forEach(chunk => {
          expect(chunk.moduleNumber).toBeNull()
          expect(chunk.moduleName).toBe('General Content')
          expect(chunk.module).toBe('general-content')
        })
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Chunks switch modules correctly
   * 
   * For any sequence of module headers with chunks in between,
   * chunks should be associated with the most recently detected module.
   */
  it('should switch chunk associations when new module is detected', () => {
    // Generator for a sequence of modules with content
    const moduleSequenceArb = fc.array(
      fc.tuple(
        fc.integer({ min: 1, max: 10 }),
        fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/),
        fc.array(fc.lorem({ maxCount: 10 }), { minLength: 1, maxLength: 3 })
      ),
      { minLength: 2, maxLength: 4 }
    ).map(modules => modules.map(([num, name, chunks]) => ({
      header: `Module ${num} - ${name}`,
      expectedNumber: num,
      expectedId: `module-${num}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      chunks
    })))
    
    fc.assert(
      fc.property(moduleSequenceArb, (moduleSequence) => {
        const tracker = new ModuleContextTracker()
        let lineIndex = 0
        
        for (const module of moduleSequence) {
          // Process module header
          tracker.processLine(module.header, lineIndex++)
          
          // Associate chunks for this module
          for (const chunkContent of module.chunks) {
            const chunk = tracker.associateChunk(chunkContent, lineIndex++)
            
            // Chunk should be associated with current module
            expect(chunk.moduleNumber).toBe(module.expectedNumber)
            expect(chunk.module).toBe(module.expectedId)
          }
        }
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Line indices are preserved
   * 
   * For any chunk association, the line index should be preserved correctly.
   */
  it('should preserve line indices in chunk associations', () => {
    const chunkWithIndexArb = fc.tuple(
      fc.lorem({ maxCount: 10 }),
      fc.integer({ min: 0, max: 1000 })
    )
    
    fc.assert(
      fc.property(chunkWithIndexArb, ([content, lineIndex]) => {
        const tracker = new ModuleContextTracker()
        
        const chunk = tracker.associateChunk(content, lineIndex)
        
        expect(chunk.lineIndex).toBe(lineIndex)
      }),
      { numRuns: 100 }
    )
  })
})
