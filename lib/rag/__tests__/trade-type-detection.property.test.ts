/**
 * Property-Based Tests for Trade Type Detection
 * 
 * Feature: syllabus-restructure, Property 13: Trade type filename detection
 * Validates: Requirements 5.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { detectTradeTypeFromFilename } from '../trade-type-detector'

describe('Trade Type Detection - Property Tests', () => {
  /**
   * Property 13: Trade type filename detection
   * 
   * For any filename containing "TT" or "TP", the system should correctly
   * identify it as trade_theory or trade_practical respectively.
   */
  it('Property 13: should detect trade_practical from filenames with TP', () => {
    // Generator for filenames with TP pattern
    // Use prefixes that don't contain 'tp' or 'tt' to avoid false matches
    const tpFilenameArb = fc.oneof(
      // Direct TP pattern
      fc.tuple(
        fc.stringMatching(/^[a-z]{3,8}$/).filter(s => !s.includes('tp') && !s.includes('tt')),
        fc.constantFrom('TP', 'tp', 'Tp', 'tP'),
        fc.constant('.pdf')
      ).map(([prefix, tp, ext]) => `${prefix}-${tp}${ext}`),
      
      // Trade Practical pattern
      fc.tuple(
        fc.stringMatching(/^[a-z]{3,8}$/).filter(s => !s.includes('tp') && !s.includes('tt')),
        fc.constantFrom('Trade Practical', 'trade practical', 'TRADE PRACTICAL', 'TradePractical', 'trade_practical'),
        fc.constant('.pdf')
      ).map(([prefix, tp, ext]) => `${prefix}-${tp}${ext}`),
      
      // TP in middle of filename
      fc.tuple(
        fc.stringMatching(/^[a-z]{3,8}$/).filter(s => !s.includes('tp') && !s.includes('tt')),
        fc.constantFrom('TP', 'tp'),
        fc.stringMatching(/^[a-z0-9]{3,8}$/).filter(s => !s.includes('tp') && !s.includes('tt')),
        fc.constant('.pdf')
      ).map(([prefix, tp, suffix, ext]) => `${prefix}_${tp}_${suffix}${ext}`)
    )
    
    fc.assert(
      fc.property(tpFilenameArb, (filename) => {
        const result = detectTradeTypeFromFilename(filename)
        expect(result).toBe('trade_practical')
      }),
      { numRuns: 100 }
    )
  })
  
  it('Property 13: should detect trade_theory from filenames with TT', () => {
    // Generator for filenames with TT pattern
    // Use prefixes that don't contain 'tp' or 'tt' to avoid false matches
    const ttFilenameArb = fc.oneof(
      // Direct TT pattern
      fc.tuple(
        fc.stringMatching(/^[a-z]{3,8}$/).filter(s => !s.includes('tp') && !s.includes('tt')),
        fc.constantFrom('TT', 'tt', 'Tt', 'tT'),
        fc.constant('.pdf')
      ).map(([prefix, tt, ext]) => `${prefix}-${tt}${ext}`),
      
      // Trade Theory pattern
      fc.tuple(
        fc.stringMatching(/^[a-z]{3,8}$/).filter(s => !s.includes('tp') && !s.includes('tt')),
        fc.constantFrom('Trade Theory', 'trade theory', 'TRADE THEORY', 'TradeTheory', 'trade_theory'),
        fc.constant('.pdf')
      ).map(([prefix, tt, ext]) => `${prefix}-${tt}${ext}`),
      
      // TT in middle of filename
      fc.tuple(
        fc.stringMatching(/^[a-z]{3,8}$/).filter(s => !s.includes('tp') && !s.includes('tt')),
        fc.constantFrom('TT', 'tt'),
        fc.stringMatching(/^[a-z0-9]{3,8}$/).filter(s => !s.includes('tp') && !s.includes('tt')),
        fc.constant('.pdf')
      ).map(([prefix, tt, suffix, ext]) => `${prefix}_${tt}_${suffix}${ext}`)
    )
    
    fc.assert(
      fc.property(ttFilenameArb, (filename) => {
        const result = detectTradeTypeFromFilename(filename)
        expect(result).toBe('trade_theory')
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Default to trade_theory
   * 
   * For any filename that doesn't contain TP or TT patterns,
   * the system should default to trade_theory.
   */
  it('should default to trade_theory for filenames without TP/TT', () => {
    // Generator for filenames without TP/TT patterns
    const genericFilenameArb = fc.tuple(
      fc.stringMatching(/^[a-z]+$/),
      fc.oneof(
        fc.constant('module'),
        fc.constant('syllabus'),
        fc.constant('course'),
        fc.constant('chapter')
      ),
      fc.integer({ min: 1, max: 10 }),
      fc.constant('.pdf')
    ).map(([prefix, middle, num, ext]) => `${prefix}-${middle}${num}${ext}`)
    
    fc.assert(
      fc.property(genericFilenameArb, (filename) => {
        const result = detectTradeTypeFromFilename(filename)
        expect(result).toBe('trade_theory')
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Case insensitivity
   * 
   * For any filename with TP/TT in any case combination,
   * the detection should work correctly.
   */
  it('should be case insensitive for TP/TT detection', () => {
    // Generator for case variations
    // Use prefixes that don't contain 'tp' or 'tt' to avoid false matches
    const caseVariationArb = fc.tuple(
      fc.stringMatching(/^[a-z]{3,8}$/).filter(s => !s.includes('tp') && !s.includes('tt')),
      fc.oneof(
        fc.constantFrom('TP', 'tp', 'Tp', 'tP'),
        fc.constantFrom('TT', 'tt', 'Tt', 'tT')
      ),
      fc.constant('.pdf')
    ).map(([prefix, code, ext]) => ({
      filename: `${prefix}-${code}${ext}`,
      expectedType: code.toLowerCase() === 'tp' ? 'trade_practical' as const : 'trade_theory' as const
    }))
    
    fc.assert(
      fc.property(caseVariationArb, ({ filename, expectedType }) => {
        const result = detectTradeTypeFromFilename(filename)
        expect(result).toBe(expectedType)
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: Path handling
   * 
   * For any filename with a path prefix, the detection should
   * work correctly based on the filename portion.
   */
  it('should handle filenames with path prefixes', () => {
    // Generator for filenames with paths
    // Use prefixes that don't contain 'tp' or 'tt' to avoid false matches
    const filenameWithPathArb = fc.tuple(
      fc.oneof(
        fc.constant('/path/to/'),
        fc.constant('C:\\\\pdfs\\\\'),
        fc.constant('../documents/'),
        fc.constant('')
      ),
      fc.stringMatching(/^[a-z]{3,8}$/).filter(s => !s.includes('tp') && !s.includes('tt')),
      fc.oneof(
        fc.constantFrom('TP', 'tp'),
        fc.constantFrom('TT', 'tt')
      ),
      fc.constant('.pdf')
    ).map(([path, prefix, code, ext]) => ({
      filename: `${path}${prefix}-${code}${ext}`,
      expectedType: code.toLowerCase() === 'tp' ? 'trade_practical' as const : 'trade_theory' as const
    }))
    
    fc.assert(
      fc.property(filenameWithPathArb, ({ filename, expectedType }) => {
        const result = detectTradeTypeFromFilename(filename)
        expect(result).toBe(expectedType)
      }),
      { numRuns: 100 }
    )
  })
  
  /**
   * Property: TP takes precedence over TT
   * 
   * If a filename somehow contains both TP and TT patterns,
   * TP should be detected (since it's checked first).
   */
  it('should detect TP when filename contains both TP and TT', () => {
    const bothPatternsArb = fc.tuple(
      fc.stringMatching(/^[a-z]+$/),
      fc.constant('TP'),
      fc.constant('TT'),
      fc.constant('.pdf')
    ).map(([prefix, tp, tt, ext]) => `${prefix}-${tp}-${tt}${ext}`)
    
    fc.assert(
      fc.property(bothPatternsArb, (filename) => {
        const result = detectTradeTypeFromFilename(filename)
        expect(result).toBe('trade_practical')
      }),
      { numRuns: 100 }
    )
  })
})
