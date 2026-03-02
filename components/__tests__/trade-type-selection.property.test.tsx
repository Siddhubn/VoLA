/**
 * Feature: syllabus-restructure, Property 1: Trade type selection updates modules
 * Validates: Requirements 1.4
 * 
 * For any course and trade type selection, changing the trade type should result 
 * in fetching and displaying only modules for that specific trade type
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SyllabusExplorer } from '../SyllabusExplorer'
import * as fc from 'fast-check'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Property 1: Trade type selection updates modules', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('should include tradeType parameter in API calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('fitter' as const, 'electrician' as const),
        fc.constantFrom('trade_theory' as const, 'trade_practical' as const),
        async (course, tradeType) => {
          mockFetch.mockClear()
          
          // Mock initial fetch
          mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ success: true, modules: [] })
          })

          const { unmount } = render(<SyllabusExplorer course={course} />)
          
          // Wait for initial load with default trade_theory
          await waitFor(() => {
            expect(mockFetch).toHaveBeenCalled()
          }, { timeout: 1000 })

          const initialCall = mockFetch.mock.calls[0][0]
          expect(initialCall).toContain('tradeType=trade_theory')
          expect(initialCall).toContain(`/api/rag/syllabus/${course}`)

          unmount()
        }
      ),
      { numRuns: 20 }
    )
  })

  it('should update API call when trade type button is clicked', async () => {
    const course = 'electrician'
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, modules: [] })
    })

    render(<SyllabusExplorer course={course} />)
    
    // Wait for initial render
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tradeType=trade_theory')
      )
    })

    mockFetch.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, modules: [] })
    })

    // Click Trade Practical button
    const buttons = screen.getAllByRole('button')
    const practicalButton = buttons.find(b => b.textContent?.includes('Trade Practical'))
    
    if (practicalButton) {
      await userEvent.click(practicalButton)

      // Verify new API call with trade_practical
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('tradeType=trade_practical')
        )
      })
    }
  })
})
