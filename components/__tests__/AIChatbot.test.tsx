import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AIChatbot } from '../AIChatbot'

// Mock fetch
global.fetch = vi.fn()

describe('AIChatbot Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render chatbot interface with course selection', () => {
    render(<AIChatbot course="fitter" />)
    
    // Check header
    expect(screen.getByText('AI Course Assistant')).toBeInTheDocument()
    expect(screen.getByText(/Ask questions about Fitter course content/i)).toBeInTheDocument()
    
    // Check course selection buttons
    expect(screen.getByRole('button', { name: 'Fitter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Electrician' })).toBeInTheDocument()
    
    // Check input field
    expect(screen.getByPlaceholderText(/Ask a question about the course/i)).toBeInTheDocument()
    
    // Check send button
    expect(screen.getByRole('button', { name: /Send/i })).toBeInTheDocument()
  })

  it('should display empty state message when no messages', () => {
    render(<AIChatbot course="electrician" />)
    
    expect(screen.getByText('Start a Conversation')).toBeInTheDocument()
    expect(screen.getByText(/Ask me anything about the Electrician course/i)).toBeInTheDocument()
  })

  it('should display user message when sent', async () => {
    const mockResponse = {
      success: true,
      response: 'This is a test response',
      sources: {
        chunks: [],
        citations: ['Test Citation, Page 1']
      },
      sessionId: 'test-session-123'
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    render(<AIChatbot course="fitter" />)
    
    const input = screen.getByPlaceholderText(/Ask a question about the course/i)
    const sendButton = screen.getByRole('button', { name: /Send/i })
    
    // Type message
    fireEvent.change(input, { target: { value: 'What is safety?' } })
    expect(input).toHaveValue('What is safety?')
    
    // Send message
    fireEvent.click(sendButton)
    
    // Check user message appears
    await waitFor(() => {
      expect(screen.getByText('What is safety?')).toBeInTheDocument()
    })
    
    // Check assistant response appears
    await waitFor(() => {
      expect(screen.getByText('This is a test response')).toBeInTheDocument()
    })
    
    // Check citation appears
    await waitFor(() => {
      expect(screen.getByText(/Test Citation, Page 1/i)).toBeInTheDocument()
    })
  })

  it('should show loading state while waiting for response', async () => {
    ;(global.fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, response: 'Response', sources: { chunks: [], citations: [] }, sessionId: 'test' })
      }), 100))
    )

    render(<AIChatbot course="fitter" />)
    
    const input = screen.getByPlaceholderText(/Ask a question about the course/i)
    const sendButton = screen.getByRole('button', { name: /Send/i })
    
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.click(sendButton)
    
    // Check loading indicator
    await waitFor(() => {
      expect(screen.getByText('Thinking...')).toBeInTheDocument()
    })
  })

  it('should display error message when API call fails', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'API Error' })
    })

    render(<AIChatbot course="fitter" />)
    
    const input = screen.getByPlaceholderText(/Ask a question about the course/i)
    const sendButton = screen.getByRole('button', { name: /Send/i })
    
    fireEvent.change(input, { target: { value: 'Test question' } })
    fireEvent.click(sendButton)
    
    // Check error message appears
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument()
    })
  })

  it('should clear chat when clear button is clicked', async () => {
    const mockResponse = {
      success: true,
      response: 'Test response',
      sources: { chunks: [], citations: [] },
      sessionId: 'test-session'
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    render(<AIChatbot course="fitter" />)
    
    const input = screen.getByPlaceholderText(/Ask a question about the course/i)
    const sendButton = screen.getByRole('button', { name: /Send/i })
    
    // Send a message
    fireEvent.change(input, { target: { value: 'Test message' } })
    fireEvent.click(sendButton)
    
    // Wait for message to appear
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument()
    })
    
    // Click clear button
    const clearButton = screen.getByRole('button', { name: /Clear/i })
    fireEvent.click(clearButton)
    
    // Check messages are cleared
    await waitFor(() => {
      expect(screen.queryByText('Test message')).not.toBeInTheDocument()
      expect(screen.getByText('Start a Conversation')).toBeInTheDocument()
    })
  })

  it('should switch course and clear chat', async () => {
    const mockOnCourseChange = vi.fn()
    
    render(<AIChatbot course="fitter" onCourseChange={mockOnCourseChange} />)
    
    // Initially shows Fitter
    expect(screen.getByText(/Ask questions about Fitter course content/i)).toBeInTheDocument()
    
    // Click Electrician button
    const electricianButton = screen.getByRole('button', { name: 'Electrician' })
    fireEvent.click(electricianButton)
    
    // Check course changed
    await waitFor(() => {
      expect(mockOnCourseChange).toHaveBeenCalledWith('electrician')
      expect(screen.getByText(/Ask questions about Electrician course content/i)).toBeInTheDocument()
    })
  })

  it('should disable send button when input is empty', () => {
    render(<AIChatbot course="fitter" />)
    
    const sendButton = screen.getByRole('button', { name: /Send/i })
    expect(sendButton).toBeDisabled()
  })

  it('should enable send button when input has text', () => {
    render(<AIChatbot course="fitter" />)
    
    const input = screen.getByPlaceholderText(/Ask a question about the course/i)
    const sendButton = screen.getByRole('button', { name: /Send/i })
    
    fireEvent.change(input, { target: { value: 'Test' } })
    expect(sendButton).not.toBeDisabled()
  })

  it('should display character count', () => {
    render(<AIChatbot course="fitter" />)
    
    expect(screen.getByText('0/1000 characters')).toBeInTheDocument()
    
    const input = screen.getByPlaceholderText(/Ask a question about the course/i)
    fireEvent.change(input, { target: { value: 'Hello' } })
    
    expect(screen.getByText('5/1000 characters')).toBeInTheDocument()
  })

  it('should display source citations when provided', async () => {
    const mockResponse = {
      success: true,
      response: 'Answer with sources',
      sources: {
        chunks: [],
        citations: ['Safety Module, Page 5', 'Tools Section, Page 12']
      },
      sessionId: 'test-session'
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    render(<AIChatbot course="fitter" />)
    
    const input = screen.getByPlaceholderText(/Ask a question about the course/i)
    const sendButton = screen.getByRole('button', { name: /Send/i })
    
    fireEvent.change(input, { target: { value: 'What are safety rules?' } })
    fireEvent.click(sendButton)
    
    // Wait for response with citations
    await waitFor(() => {
      expect(screen.getByText('Answer with sources')).toBeInTheDocument()
      expect(screen.getByText(/Safety Module, Page 5/i)).toBeInTheDocument()
      expect(screen.getByText(/Tools Section, Page 12/i)).toBeInTheDocument()
    })
  })
})
