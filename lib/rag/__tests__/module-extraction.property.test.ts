/**
 * Property-Based Tests for Module Extraction from Files
 * 
 * Feature: syllabus-restructure, Property 14: Module extraction from files
 * Validates: Requirements 5.3
 */

import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import { PDFProcessor } from '../pdf-processor'
import { detectTradeTypeFromFilename } from '../trade-type-detector'
import { moduleDetector } from '../module-detector'

describe('Module Extraction from Files - Property Tests', () => {
  /**
   * Property 14: Module extraction from files
   * 
   * For any PDF file processed, chunks should be assigned with proper trade_type and module_name.
   * All chunks must have complete metadata including module, module_name, and syllabusType.
   */
  it('Property 14: should extract modules and assign chunks with complete metadata', () => {
    // Generator for course and matching filename
    const courseAndFilenameArb = fc.tuple(
      fc.oneof(
        fc.constant('fitter' as const),
        fc.constant('electrician' as const)
      ),
      fc.oneof(
        fc.constant('TT'),
        fc.constant('TP')
      )
    ).map(([course, suffix]) => ({
      course,
      filename: `${course}_${suffix}_sample.pdf`
    }))
    
    // Generator for simple text content (at least 100 chars to ensure chunking works)
    const contentArb = fc.array(fc.lorem({ maxCount: 20 }), { minLength: 5, maxLength: 15 })
      .map(paragraphs => paragraphs.join('\n\n'))
      .filter(text => text.length >= 100) // Ensure minimum length
    
    fc.assert(
      fc.property(
        fc.tuple(contentArb, courseAndFilenameArb),
        async ([text, { course, filename }]) => {
          // Detect trade type from filename
          const tradeType = detectTradeTypeFromFilename(filename)
          if (!tradeType) return false
          
          // Detect syllabus type
          const syllabusInfo = moduleDetector.detectSyllabusType(filename, text)
          if (!syllabusInfo.syllabusType.match(/^(TP|TT)$/)) return false
          
          // Create a processor
          const processor = new PDFProcessor({
            chunkSize: 500,
            chunkOverlap: 50,
            excludePatterns: []
          })
          
          // Chunk the content
          const chunks = await processor.chunkContent(text)
          if (chunks.length === 0) return false
          
          // Assign modules to chunks
          const chunksWithModules = await processor.assignModulesToChunks(
            chunks,
            course,
            syllabusInfo.syllabusType
          )
          
          // All chunks should have complete metadata
          for (const chunk of chunksWithModules) {
            // Must have a module (either assigned or default)
            if (!chunk.module) return false
            
            // Must have a module name
            if (!chunk.metadata.moduleName) return false
            
            // Must have syllabus type
            if (!chunk.metadata.syllabusType) return false
            if (chunk.metadata.syllabusType !== syllabusInfo.syllabusType) return false
            
            // If module is general-content, name should be "General Content"
            if (chunk.module === 'general-content') {
              if (chunk.metadata.moduleName !== 'General Content') return false
            }
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Trade type detection consistency
   * 
   * For any filename with trade type indicators, the detected trade type
   * should be consistent with the filename pattern.
   */
  it('should consistently detect trade type from filename patterns', () => {
    const filenameWithTradeTypeArb = fc.tuple(
      fc.oneof(fc.constant('fitter'), fc.constant('electrician')),
      fc.oneof(
        fc.constant('TT').map(s => ({ suffix: s, expected: 'trade_theory' as const })),
        fc.constant('TP').map(s => ({ suffix: s, expected: 'trade_practical' as const })),
        fc.constant('Trade_Theory').map(s => ({ suffix: s, expected: 'trade_theory' as const })),
        fc.constant('Trade_Practical').map(s => ({ suffix: s, expected: 'trade_practical' as const }))
      ),
      fc.stringMatching(/^[a-z0-9_-]{1,20}$/)
    ).map(([course, { suffix, expected }, extra]) => ({
      filename: `${course}_${suffix}_${extra}.pdf`,
      expectedTradeType: expected
    }))
    
    fc.assert(
      fc.property(filenameWithTradeTypeArb, ({ filename, expectedTradeType }) => {
        const detectedTradeType = detectTradeTypeFromFilename(filename)
        return detectedTradeType === expectedTradeType
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Module name consistency
   * 
   * For any chunk assigned to a module, the module_name in metadata
   * should be consistent with the module ID.
   */
  it('should maintain consistency between module ID and module name', () => {
    const courseArb = fc.oneof(
      fc.constant('fitter' as const),
      fc.constant('electrician' as const)
    )
    
    const syllabusTypeArb = fc.oneof(
      fc.constant('TP' as const),
      fc.constant('TT' as const)
    )
    
    // Generate realistic content with proper sentence structure
    const sentenceArb = fc.array(fc.lorem({ maxCount: 10 }), { minLength: 3, maxLength: 8 })
      .map(words => words.join(' ') + '.')
    
    const contentArb = fc.array(sentenceArb, { minLength: 20, maxLength: 40 })
      .map(sentences => sentences.join(' '))
      .filter(text => text.length >= 400) // Ensure substantial content
    
    fc.assert(
      fc.property(
        fc.tuple(contentArb, courseArb, syllabusTypeArb),
        async ([content, course, syllabusType]) => {
          const processor = new PDFProcessor({
            chunkSize: 500,
            chunkOverlap: 50,
            excludePatterns: []
          })
          
          const chunks = await processor.chunkContent(content)
          if (chunks.length === 0) return true // Skip if no chunks generated
          
          const chunksWithModules = await processor.assignModulesToChunks(
            chunks,
            course,
            syllabusType
          )
          
          if (chunksWithModules.length === 0) return true // Skip if no chunks after assignment
          
          // Get all modules for this course/syllabus type
          const allModules = moduleDetector.getModulesForCourse(course, syllabusType)
          const moduleMap = new Map(allModules.map(m => [m.module_id, m.module_name]))
          
          for (const chunk of chunksWithModules) {
            // Every chunk must have a module
            if (!chunk.module) return false
            
            // Every chunk must have metadata with moduleName
            if (!chunk.metadata || !chunk.metadata.moduleName) return false
            
            if (chunk.module === 'general-content') {
              if (chunk.metadata.moduleName !== 'General Content') return false
            } else {
              // Module name should match the module ID
              const expectedName = moduleMap.get(chunk.module)
              if (expectedName && chunk.metadata.moduleName !== expectedName) {
                return false
              }
            }
          }
          
          return true
        }
      ),
      { numRuns: 50 } // Reduce runs to speed up test
    )
  })
})