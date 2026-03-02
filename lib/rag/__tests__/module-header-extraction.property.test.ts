/**
 * Property-Based Tests for Module Header Extraction
 * 
 * Feature: syllabus-restructure, Property 3: Module header detection extracts number and name
 * Validates: Requirements 2.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { detectModuleHeader, extractModuleHeaders } from '../module-header-detector'

describe('Module Header Extraction - Property Tests', () => {
  /**
   * Property 3: Module header detection extracts number and name
   * 
   * For any valid module header pattern, the system should extract both
   * the module number and module name correctly.
   */
  it('Property 3: should extract module number and name from any valid header pattern', () => {
    // Generator for module numbers (1-99)
    const moduleNumberArb = fc.integer({ min: 1, max: 99 })
    
    // Generator for module names (realistic names)
    const moduleNameArb = fc.oneof(
      fc.constant('Safety Practice and Hand Tools'),
      fc.constant('Basic Electrical Theory'),
      fc.constant('Workshop Technology'),
      fc.constant('Fitting Operations'),
      fc.constant('Maintenance and Repair'),
      fc.constant('AC/DC Theory & Applications'),
      fc.constant('Machine Tools Operation'),
      fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,4}$/)
    )
    
    // Generator for separator patterns
    const separatorArb = fc.oneof(
      fc.constant(' - '),
      fc.constant(': '),
      fc.constant(' ')
    )
    
    // Generator for case variations
    const caseArb = fc.oneof(
      fc.constant('Module'),
      fc.constant('MODULE'),
      fc.constant('module')
    )
    
    // Generator for whitespace variations
    const whitespaceArb = fc.oneof(
      fc.constant(' '),
      fc.constant('  '),
      fc.constant('   ')
    )
    
    // Combine to create valid module headers
    const moduleHeaderArb = fc.tuple(
      caseArb,
      whitespaceArb,
      moduleNumberArb,
      separatorArb,
      moduleNameArb
    ).map(([moduleWord, ws1, num, sep, name]) => ({
      header: `${moduleWord}${ws1}${num}${sep}${name}`,
      expectedNumber: num,
      expectedName: name
    }))
    
    fc.assert(
      fc.property(moduleHeaderArb, ({ header, expectedNumber, expectedName }) => {
        const result = detectModuleHeader(header)
        
        // Should detect the header
        expect(result).not.toBeNull()
        
        // Should extract correct module number
        expect(result?.moduleNumber).toBe(expectedNumber)
        
        // Should extract correct module name
        expect(result?.moduleName).toBe(expectedName)
        
        // Full header should be the trimmed input
        expect(result?.fullHeader).toBe(header.trim())
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Invalid headers should not be detected
   * 
   * For any text that doesn't match the module header patterns,
   * the detector should return null.
   */
  it('should return null for non-module header text', () => {
    // Generator for invalid headers
    const invalidHeaderArb = fc.oneof(
      // Regular text
      fc.lorem({ maxCount: 10 }),
      
      // Chapter headers (not module)
      fc.tuple(fc.integer({ min: 1, max: 20 }), fc.lorem({ maxCount: 3 }))
        .map(([num, text]) => `Chapter ${num} - ${text}`),
      
      // Section headers
      fc.tuple(fc.integer({ min: 1, max: 20 }), fc.integer({ min: 1, max: 20 }))
        .map(([a, b]) => `Section ${a}.${b}`),
      
      // Empty or whitespace
      fc.oneof(
        fc.constant(''),
        fc.constant('   '),
        fc.constant('\n\n')
      ),
      
      // Numbers without "Module" keyword
      fc.integer({ min: 1, max: 99 }).map(n => `${n}. Some Topic`),
      
      // "Module" without number
      fc.lorem({ maxCount: 3 }).map(text => `Module ${text}`)
    )
    
    fc.assert(
      fc.property(invalidHeaderArb, (invalidHeader) => {
        const result = detectModuleHeader(invalidHeader)
        expect(result).toBeNull()
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Extracting headers from multi-line text
   * 
   * For any text containing valid module headers interspersed with
   * other content, all module headers should be extracted with correct
   * line indices.
   */
  it('should extract all module headers from multi-line text with correct indices', () => {
    // Generator for a single module header line
    const moduleHeaderLineArb = fc.tuple(
      fc.integer({ min: 1, max: 10 }),
      fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/)
    ).map(([num, name]) => `Module ${num} - ${name}`)
    
    // Generator for non-header lines
    const regularLineArb = fc.oneof(
      fc.lorem({ maxCount: 10 }),
      fc.constant(''),
      fc.stringMatching(/^[A-Z][a-z ]{10,50}$/)
    )
    
    // Generator for text with multiple module headers
    const textWithHeadersArb = fc.array(
      fc.oneof(
        moduleHeaderLineArb.map(line => ({ type: 'header' as const, line })),
        regularLineArb.map(line => ({ type: 'regular' as const, line }))
      ),
      { minLength: 5, maxLength: 20 }
    ).map(lines => {
      const text = lines.map(l => l.line).join('\n')
      const expectedHeaderCount = lines.filter(l => l.type === 'header').length
      return { text, expectedHeaderCount }
    })
    
    fc.assert(
      fc.property(textWithHeadersArb, ({ text, expectedHeaderCount }) => {
        const headers = extractModuleHeaders(text)
        
        // Should extract correct number of headers
        expect(headers.length).toBe(expectedHeaderCount)
        
        // All extracted headers should have valid module numbers
        headers.forEach(header => {
          expect(header.moduleNumber).toBeGreaterThan(0)
          expect(header.moduleName).toBeTruthy()
          expect(header.lineIndex).toBeGreaterThanOrEqual(0)
        })
        
        // Line indices should be in ascending order
        for (let i = 1; i < headers.length; i++) {
          expect(headers[i].lineIndex).toBeGreaterThan(headers[i - 1].lineIndex)
        }
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Whitespace normalization
   * 
   * For any valid module header with extra whitespace, the extracted
   * module name should be properly trimmed.
   */
  it('should normalize whitespace in extracted module names', () => {
    const moduleHeaderWithWhitespaceArb = fc.tuple(
      fc.integer({ min: 1, max: 99 }),
      fc.stringMatching(/^[A-Z][a-z]+(?: [A-Z][a-z]+){0,2}$/),
      fc.oneof(fc.constant(''), fc.constant(' '), fc.constant('  '), fc.constant('   ')),
      fc.oneof(fc.constant(''), fc.constant(' '), fc.constant('  '), fc.constant('   '))
    ).map(([num, name, leadingWs, trailingWs]) => ({
      header: `Module ${num} - ${leadingWs}${name}${trailingWs}`,
      expectedNumber: num,
      expectedName: name
    }))
    
    fc.assert(
      fc.property(moduleHeaderWithWhitespaceArb, ({ header, expectedNumber, expectedName }) => {
        const result = detectModuleHeader(header)
        
        expect(result).not.toBeNull()
        expect(result?.moduleNumber).toBe(expectedNumber)
        expect(result?.moduleName).toBe(expectedName)
        
        // Module name should not have leading/trailing whitespace
        expect(result?.moduleName.trim()).toBe(result?.moduleName)
      }),
      { numRuns: 100 }
    )
  })
})
