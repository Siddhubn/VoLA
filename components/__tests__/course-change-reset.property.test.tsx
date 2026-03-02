/**
 * Feature: syllabus-restructure, Property 2: Course change resets trade type
 * Validates: Requirements 1.5
 * 
 * For any course selection change, the trade type should reset to "trade_theory"
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor, cleanup } from '@testing-library/react'
import { SyllabusExplorer } from '../SyllabusExplorer'
import * as fc from 'fast-check'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Property 2: Course change resets trade type', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('should reset to trade_theory when course prop changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('fitter' as const, 'electrician' as const),
        async (initialCourse) => {
          mockFetch.mockClear()
          
          mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, modules: [] })
          })

          const { rerender, unmount } = render(<SyllabusExplorer course={initialCourse} />)
          
          // Wait for initial load with trade_theory
          await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
              expect.stringContaining(`/api/rag/syllabus/${initialCourse}?tradeType=trade_theory`)
            )
          }, { timeout: 1000 })

          // Change course
          const newCourse = initialCourse === 'fitter' ? 'electrician' : 'fitter'
          mockFetch.mockClear()
          
          rerender(<SyllabusExplorer course={newCourse} />)

          // Verify it resets to trade_theory
          await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
              expect.stringContaining(`/api/rag/syllabus/${newCourse}?tradeType=trade_theory`)
            )
          }, { timeout: 1000 })

          unmount()
        }
      ),
      { numRuns: 20 }
    )
  })

  it('should always default to trade_theory on initial render', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('fitter' as const, 'electrician' as const),
        async (course) => {
          mockFetch.mockClear()
          
          mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, modules: [] })
          })

          const { unmount } = render(<SyllabusExplorer course={course} />)
          
          await waitFor(() => {
            const firstCall = mockFetch.mock.calls[0]
            expect(firstCall[0]).toContain('tradeType=trade_theory')
          }, { timeout: 1000 })

          unmount()
        }
      ),
      { numRuns: 20 }
    )
  })
})
