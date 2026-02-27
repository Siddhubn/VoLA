import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import RAGAdminDashboard from '../RAGAdminDashboard'

// Mock fetch
global.fetch = vi.fn()

describe('RAGAdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state initially', () => {
    // Mock fetch to never resolve
    ;(global.fetch as any).mockImplementation(() => new Promise(() => {}))
    
    render(<RAGAdminDashboard />)
    
    // Should show loading spinner
    const loader = document.querySelector('.animate-spin')
    expect(loader).toBeTruthy()
  })

  it('should render dashboard with stats after loading', async () => {
    const mockSystemStats = {
      success: true,
      stats: {
        total_pdfs: 10,
        total_chunks: 500,
        total_embeddings: 500,
        pdfs_by_status: { completed: 8, pending: 2 },
        pdfs_by_course: { fitter: 5, electrician: 5 },
        chunks_by_course: { fitter: 250, electrician: 250 },
        chunks_by_module: []
      }
    }

    const mockProcessingStats = {
      success: true,
      stats: []
    }

    const mockDatabaseStats = {
      success: true,
      stats: {
        database_size: '100 MB',
        largest_tables: []
      }
    }

    const mockModuleStats = {
      success: true,
      stats: []
    }

    const mockChatStats = {
      success: true,
      stats: {
        total_messages: 100,
        unique_sessions: 20,
        avg_messages_per_session: 5,
        messages_by_course: { fitter: 50, electrician: 50 }
      }
    }

    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('type=system')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockSystemStats)
        })
      }
      if (url.includes('type=processing')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockProcessingStats)
        })
      }
      if (url.includes('type=database')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockDatabaseStats)
        })
      }
      if (url.includes('type=modules')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockModuleStats)
        })
      }
      if (url.includes('type=chat')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockChatStats)
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    render(<RAGAdminDashboard />)

    // Wait for stats to load
    await waitFor(() => {
      expect(screen.getByText('RAG System Dashboard')).toBeTruthy()
    })

    // Check if stats are displayed
    await waitFor(() => {
      expect(screen.getByText('10')).toBeTruthy() // total_pdfs
      expect(screen.getAllByText('500').length).toBeGreaterThan(0) // total_chunks and embeddings
    })
  })

  it('should display error message on fetch failure', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

    render(<RAGAdminDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeTruthy()
    })
  })
})
