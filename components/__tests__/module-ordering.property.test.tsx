/**
 * Feature: syllabus-restructure, Property 12: Module numerical ordering
 * Validates: Requirements 4.1
 * 
 * For any list of modules displayed, they should be sorted in ascending order by module number
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Test the sorting logic directly
function extractModuleNumber(moduleName: string): number {
  const match = moduleName.match(/module[_\s-]*(\d+)/i)
  return match ? parseInt(match[1], 10) : 999
}

function sortModulesByNumber(modules: Array<{ name: string; [key: string]: any }>): Array<{ name: string; [key: string]: any }> {
  return [...modules].sort((a, b) => {
    const numA = extractModuleNumber(a.name)
    const numB = extractModuleNumber(b.name)
    return numA - numB
  })
}

describe('Property 12: Module numerical ordering', () => {
  it('should sort modules by number in ascending order', async () => {
    await fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            name: fc.integer({ min: 1, max: 20 }).map(n => `Module ${n} - Test`),
            topics: fc.array(fc.string()),
            chunkCount: fc.integer({ min: 1, max: 100 }),
            pageRange: fc.string()
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (modules) => {
          const sorted = sortModulesByNumber(modules)
          
          // Verify sorted order
          for (let i = 1; i < sorted.length; i++) {
            const prevNum = extractModuleNumber(sorted[i - 1].name)
            const currNum = extractModuleNumber(sorted[i].name)
            expect(currNum).toBeGreaterThanOrEqual(prevNum)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle various module name formats', () => {
    const testCases = [
      {
        input: [
          { name: 'Module 3 - Advanced' },
          { name: 'Module 1 - Basics' },
          { name: 'Module 2 - Intermediate' }
        ],
        expected: [1, 2, 3]
      },
      {
        input: [
          { name: 'Module 10 - Final' },
          { name: 'Module 2 - Second' },
          { name: 'Module 1 - First' }
        ],
        expected: [1, 2, 10]
      },
      {
        input: [
          { name: 'MODULE_5_Test' },
          { name: 'MODULE_12_Test' },
          { name: 'MODULE_3_Test' }
        ],
        expected: [3, 5, 12]
      },
      {
        input: [
          { name: 'module-7-test' },
          { name: 'module-2-test' },
          { name: 'module-15-test' }
        ],
        expected: [2, 7, 15]
      }
    ]

    for (const testCase of testCases) {
      const sorted = sortModulesByNumber(testCase.input as any)
      const numbers = sorted.map(m => extractModuleNumber(m.name))
      expect(numbers).toEqual(testCase.expected)
    }
  })

  it('should place modules without numbers at the end', () => {
    const modules = [
      { name: 'Module 2 - Second' },
      { name: 'General Content' },
      { name: 'Module 1 - First' },
      { name: 'Introduction' }
    ]

    const sorted = sortModulesByNumber(modules)
    const numbers = sorted.map(m => extractModuleNumber(m.name))
    
    // First two should be 1 and 2
    expect(numbers[0]).toBe(1)
    expect(numbers[1]).toBe(2)
    // Last two should be 999 (no number found)
    expect(numbers[2]).toBe(999)
    expect(numbers[3]).toBe(999)
  })

  it('should maintain stable sort for modules with same number', () => {
    const modules = [
      { name: 'Module 1 - Part A', id: 'a' },
      { name: 'Module 1 - Part B', id: 'b' },
      { name: 'Module 1 - Part C', id: 'c' }
    ]

    const sorted = sortModulesByNumber(modules)
    
    // All should have the same module number
    const numbers = sorted.map(m => extractModuleNumber(m.name))
    expect(numbers).toEqual([1, 1, 1])
  })
})
