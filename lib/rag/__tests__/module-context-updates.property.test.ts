/**
 * Property-Based Tests for Module Context Updates
 * 
 * Feature: syllabus-restructure, Property 5: Module context updates on new module
 * Validates: Requirements 2.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { ModuleContextTracker } from '../module-context-tracker'

describe('Module Context Updates - Property Tests', () => {
  /**
   * Property 5: Module context updates on new module
   * 
   * For any sequence of chunks where a new module header appears,
   * all chunks after the header should have the new module context.
   */
  it('Property 5: should update module context when new module header is detected', () => {
    // Generator for module information with unique numbers
    const moduleInfoArb = fc.tuple(
      fc.integer({ min: 1, max: 100 }),
      fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/)
    ).map(([num, name]) => ({
      header: `Module ${num} - ${name}`,
      expectedNumber: num,
      expectedId: `module-${num}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    }))
    
    // Generator for content lines
    const contentLineArb = fc.lorem({ maxCount: 10 })
    
    // Test with two distinct modules
    const twoModulesArb = fc.tuple(
      moduleInfoArb,
      contentLineArb,
      moduleInfoArb,
      contentLineArb
    ).filter(([mod1, _, mod2, __]) => mod1.expectedNumber !== mod2.expectedNumber)
    
    fc.assert(
      fc.property(twoModulesArb, ([module1, content1, module2, content2]) => {
        const tracker = new ModuleContextTracker()
        
        // Process first module header
        tracker.processLine(module1.header, 0)
        
        // Associate chunk with first module
        const chunk1 = tracker.associateChunk(content1, 1)
        expect(chunk1.moduleNumber).toBe(module1.expectedNumber)
        expect(chunk1.module).toBe(module1.expectedId)
        
        // Process second module header
        tracker.processLine(module2.header, 2)
        
        // Associate chunk with second module
        const chunk2 = tracker.associateChunk(content2, 3)
        expect(chunk2.moduleNumber).toBe(module2.expectedNumber)
        expect(chunk2.module).toBe(module2.expectedId)
        
        // Verify they're different
        expect(chunk1.moduleNumber).not.toBe(chunk2.moduleNumber)
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Context persists until new header
   * 
   * For any module context, it should persist for all subsequent chunks
   * until a new module header is encountered.
   */
  it('should maintain module context until new header is detected', () => {
    // Generator for a module with multiple content chunks
    const moduleWithContentArb = fc.tuple(
      fc.integer({ min: 1, max: 10 }),
      fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/),
      fc.array(fc.lorem({ maxCount: 10 }), { minLength: 3, maxLength: 10 })
    ).map(([num, name, content]) => ({
      header: `Module ${num} - ${name}`,
      expectedNumber: num,
      expectedId: `module-${num}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      content
    }))
    
    fc.assert(
      fc.property(moduleWithContentArb, (module) => {
        const tracker = new ModuleContextTracker()
        
        // Process module header
        tracker.processLine(module.header, 0)
        
        // Associate multiple chunks
        const chunks = module.content.map((content, idx) => 
          tracker.associateChunk(content, idx + 1)
        )
        
        // All chunks should have the same module context
        chunks.forEach(chunk => {
          expect(chunk.module).toBe(module.expectedId)
          expect(chunk.moduleNumber).toBe(module.expectedNumber)
        })
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Sequential module updates
   * 
   * For any sequence of module headers, each subsequent chunk should
   * be associated with the most recently encountered module header.
   */
  it('should update context sequentially for multiple modules', () => {
    // Generator for a sequence of modules with unique numbers
    const moduleSequenceArb = fc.array(
      fc.tuple(
        fc.integer({ min: 1, max: 100 }),
        fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/),
        fc.lorem({ maxCount: 10 })
      ),
      { minLength: 2, maxLength: 5 }
    ).map(modules => {
      // Ensure unique module numbers
      const seen = new Set<number>()
      return modules.filter(([num]) => {
        if (seen.has(num)) return false
        seen.add(num)
        return true
      }).map(([num, name, content]) => ({
        header: `Module ${num} - ${name}`,
        expectedNumber: num,
        expectedId: `module-${num}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        content
      }))
    }).filter(modules => modules.length >= 2)
    
    fc.assert(
      fc.property(moduleSequenceArb, (modules) => {
        const tracker = new ModuleContextTracker()
        let lineIndex = 0
        
        for (const module of modules) {
          // Process module header
          tracker.processLine(module.header, lineIndex++)
          
          // Associate chunk for this module
          const chunk = tracker.associateChunk(module.content, lineIndex++)
          
          // Chunk should be associated with current module
          expect(chunk.moduleNumber).toBe(module.expectedNumber)
          expect(chunk.module).toBe(module.expectedId)
        }
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Context boundary detection
   * 
   * For any text with module headers, chunks should be associated
   * with the correct module based on their position.
   */
  it('should associate chunks with correct module based on position', () => {
    const twoModuleSequenceArb = fc.tuple(
      fc.integer({ min: 1, max: 50 }),
      fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/),
      fc.lorem({ maxCount: 10 }),
      fc.integer({ min: 51, max: 100 }), // Ensure different module number
      fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/),
      fc.lorem({ maxCount: 10 })
    ).map(([num1, name1, content1, num2, name2, content2]) => ({
      module1: {
        header: `Module ${num1} - ${name1}`,
        number: num1,
        id: `module-${num1}-${name1.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        content: content1
      },
      module2: {
        header: `Module ${num2} - ${name2}`,
        number: num2,
        id: `module-${num2}-${name2.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        content: content2
      }
    }))
    
    fc.assert(
      fc.property(twoModuleSequenceArb, ({ module1, module2 }) => {
        const tracker = new ModuleContextTracker()
        
        // Process first module and associate chunk
        tracker.processLine(module1.header, 0)
        const chunk1 = tracker.associateChunk(module1.content, 1)
        
        // Process second module and associate chunk
        tracker.processLine(module2.header, 2)
        const chunk2 = tracker.associateChunk(module2.content, 3)
        
        // Verify correct associations
        expect(chunk1.moduleNumber).toBe(module1.number)
        expect(chunk1.module).toBe(module1.id)
        
        expect(chunk2.moduleNumber).toBe(module2.number)
        expect(chunk2.module).toBe(module2.id)
        
        // Verify they're different
        expect(chunk1.moduleNumber).not.toBe(chunk2.moduleNumber)
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Empty content between modules
   * 
   * For any sequence of module headers with empty lines between them,
   * the context should still update correctly.
   */
  it('should handle empty content between module headers', () => {
    const moduleHeadersArb = fc.array(
      fc.tuple(
        fc.integer({ min: 1, max: 100 }),
        fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/)
      ),
      { minLength: 2, maxLength: 4 }
    ).map(headers => {
      // Ensure unique module numbers
      const seen = new Set<number>()
      return headers.filter(([num]) => {
        if (seen.has(num)) return false
        seen.add(num)
        return true
      }).map(([num, name]) => ({
        header: `Module ${num} - ${name}`,
        number: num
      }))
    }).filter(modules => modules.length >= 2)
    
    fc.assert(
      fc.property(moduleHeadersArb, (modules) => {
        const tracker = new ModuleContextTracker()
        
        // Process all headers
        modules.forEach((module, idx) => {
          tracker.processLine(module.header, idx)
        })
        
        // Should have detected all modules
        const headers = tracker.getDetectedHeaders()
        expect(headers.length).toBe(modules.length)
        
        // Last module should be current context
        const lastModule = modules[modules.length - 1]
        const context = tracker.getCurrentContext()
        expect(context.moduleNumber).toBe(lastModule.number)
      }),
      { numRuns: 100 }
    )
  })
})
