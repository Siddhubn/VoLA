/**
 * Property-Based Tests for Default Module Assignment
 * 
 * Feature: syllabus-restructure, Property 6: Default module assignment
 * Validates: Requirements 2.5
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { ModuleContextTracker } from '../module-context-tracker'

describe('Default Module Assignment - Property Tests', () => {
  /**
   * Property 6: Default module assignment
   * 
   * For any chunk processed without a detected module context,
   * it should be assigned to the "General Content" module.
   */
  it('Property 6: should assign chunks to General Content when no module detected', () => {
    // Generator for content without module headers
    const contentArb = fc.array(
      fc.lorem({ maxCount: 20 }),
      { minLength: 1, maxLength: 10 }
    )
    
    fc.assert(
      fc.property(contentArb, (contentLines) => {
        const tracker = new ModuleContextTracker()
        
        // Process content without any module headers
        const chunks = contentLines.map((content, idx) => 
          tracker.associateChunk(content, idx)
        )
        
        // All chunks should be assigned to General Content
        chunks.forEach(chunk => {
          expect(chunk.moduleNumber).toBeNull()
          expect(chunk.moduleName).toBe('General Content')
          expect(chunk.module).toBe('general-content')
        })
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Initial state default
   * 
   * For any tracker in initial state, chunks should be assigned
   * to General Content.
   */
  it('should assign to General Content in initial state', () => {
    const chunkContentArb = fc.lorem({ maxCount: 20 })
    
    fc.assert(
      fc.property(chunkContentArb, (content) => {
        const tracker = new ModuleContextTracker()
        
        // Don't process any headers, just associate chunk
        const chunk = tracker.associateChunk(content, 0)
        
        expect(chunk.moduleNumber).toBeNull()
        expect(chunk.moduleName).toBe('General Content')
        expect(chunk.module).toBe('general-content')
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Content before first module
   * 
   * For any content that appears before the first module header,
   * it should be assigned to General Content.
   */
  it('should assign content before first module to General Content', () => {
    const testCaseArb = fc.tuple(
      fc.array(fc.lorem({ maxCount: 10 }), { minLength: 1, maxLength: 5 }),
      fc.integer({ min: 1, max: 10 }),
      fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/)
    ).map(([beforeContent, moduleNum, moduleName]) => ({
      beforeContent,
      moduleHeader: `Module ${moduleNum} - ${moduleName}`
    }))
    
    fc.assert(
      fc.property(testCaseArb, ({ beforeContent, moduleHeader }) => {
        const tracker = new ModuleContextTracker()
        
        // Associate chunks before processing any module header
        const chunksBeforeModule = beforeContent.map((content, idx) => 
          tracker.associateChunk(content, idx)
        )
        
        // All chunks before module should be General Content
        chunksBeforeModule.forEach(chunk => {
          expect(chunk.moduleNumber).toBeNull()
          expect(chunk.moduleName).toBe('General Content')
          expect(chunk.module).toBe('general-content')
        })
        
        // Process module header
        tracker.processLine(moduleHeader, beforeContent.length)
        
        // Chunks after module should have module context
        const chunkAfterModule = tracker.associateChunk('After module', beforeContent.length + 1)
        expect(chunkAfterModule.moduleNumber).not.toBeNull()
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Reset to default
   * 
   * For any tracker that is reset, subsequent chunks should be
   * assigned to General Content.
   */
  it('should assign to General Content after reset', () => {
    const testCaseArb = fc.tuple(
      fc.integer({ min: 1, max: 10 }),
      fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/),
      fc.lorem({ maxCount: 10 })
    ).map(([num, name, content]) => ({
      moduleHeader: `Module ${num} - ${name}`,
      content
    }))
    
    fc.assert(
      fc.property(testCaseArb, ({ moduleHeader, content }) => {
        const tracker = new ModuleContextTracker()
        
        // Process a module header
        tracker.processLine(moduleHeader, 0)
        
        // Verify module is set
        const chunkWithModule = tracker.associateChunk(content, 1)
        expect(chunkWithModule.moduleNumber).not.toBeNull()
        
        // Reset tracker
        tracker.reset()
        
        // Chunks after reset should be General Content
        const chunkAfterReset = tracker.associateChunk(content, 2)
        expect(chunkAfterReset.moduleNumber).toBeNull()
        expect(chunkAfterReset.moduleName).toBe('General Content')
        expect(chunkAfterReset.module).toBe('general-content')
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Non-header lines don't change default
   * 
   * For any sequence of non-header lines, the default module
   * assignment should remain consistent.
   */
  it('should maintain General Content for all non-header lines', () => {
    const nonHeaderLinesArb = fc.array(
      fc.oneof(
        fc.lorem({ maxCount: 10 }),
        fc.stringMatching(/^[A-Z][a-z ]{10,50}$/),
        fc.constant(''),
        fc.stringMatching(/^Chapter \d+ - [A-Z][a-z]+$/)
      ),
      { minLength: 5, maxLength: 20 }
    )
    
    fc.assert(
      fc.property(nonHeaderLinesArb, (lines) => {
        const tracker = new ModuleContextTracker()
        
        // Process all lines
        lines.forEach((line, idx) => {
          tracker.processLine(line, idx)
        })
        
        // Associate a chunk - should still be General Content
        const chunk = tracker.associateChunk('Test content', lines.length)
        
        expect(chunk.moduleNumber).toBeNull()
        expect(chunk.moduleName).toBe('General Content')
        expect(chunk.module).toBe('general-content')
      }),
      { numRuns: 100 }
    )
  })
})
