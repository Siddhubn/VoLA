import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'
import * as simpleAuth from '@/lib/simple-auth'
import * as gemini from '@/lib/gemini'
import { ContextBuilder } from '@/lib/rag/context-builder'

// Mock dependencies
vi.mock('@/lib/simple-auth')
vi.mock('@/lib/gemini')
vi.mock('@/lib/rag/context-builder')

describe('POST /api/quiz/generate - RAG-Enhanced Quiz Generation', () => {
  const mockToken = 'valid-token'
  const mockTokenPayload = {
    userId: '1',
    email: 'test@example.com',
    role: 'student'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper to create mock request
  const createMockRequest = (body: any, token?: string) => {
    return {
      json: async () => body,
      cookies: {
        get: (name: string) => (token ? { value: token } : undefined)
      }
    } as unknown as NextRequest
  }

  describe('Authentication', () => {
    it('should reject requests without authentication token', async () => {
      const request = createMockRequest({
        course: 'fitter',
        module: 'safety-signs',
        difficulty: 'medium'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('should reject requests with invalid token', async () => {
      vi.mocked(simpleAuth.verifyToken).mockReturnValue(null)

      const request = createMockRequest(
        {
          course: 'fitter',
          module: 'safety-signs',
          difficulty: 'medium'
        },
        'invalid-token'
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(simpleAuth.verifyToken).mockReturnValue(mockTokenPayload)
    })

    it('should reject requests without course', async () => {
      const request = createMockRequest(
        {
          module: 'safety-signs',
          difficulty: 'medium'
        },
        mockToken
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Course and module are required')
    })

    it('should reject requests without module', async () => {
      const request = createMockRequest(
        {
          course: 'fitter',
          difficulty: 'medium'
        },
        mockToken
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Course and module are required')
    })

    it('should reject requests with invalid course', async () => {
      const request = createMockRequest(
        {
          course: 'invalid-course',
          module: 'safety-signs',
          difficulty: 'medium'
        },
        mockToken
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid course')
    })
  })

  describe('RAG-Enhanced Quiz Generation', () => {
    const mockQuizContext = {
      course: 'fitter' as const,
      module: 'safety-signs',
      relevantContent: 'Safety signs are used to communicate hazards...',
      sources: [
        {
          section: 'Safety Signs Overview',
          pageNumber: 10,
          pdfSource: 'fitter-module-1.pdf'
        }
      ],
      chunkCount: 3
    }

    const mockQuestions = [
      {
        question: 'What color is used for mandatory signs?',
        options: ['Red', 'Blue', 'Yellow', 'Green'],
        correctAnswer: 1,
        explanation: 'Blue is used for mandatory signs',
        sourceReference: 'Page 10'
      }
    ]

    beforeEach(() => {
      vi.mocked(simpleAuth.verifyToken).mockReturnValue(mockTokenPayload)
      
      // Mock ContextBuilder
      const mockBuildQuizContext = vi.fn().mockResolvedValue(mockQuizContext)
      vi.mocked(ContextBuilder).mockImplementation(() => ({
        buildQuizContext: mockBuildQuizContext,
        buildChatContext: vi.fn(),
        buildSyllabusContext: vi.fn(),
        formatConversationHistory: vi.fn(),
        getConfig: vi.fn()
      }) as any)
    })

    it('should generate quiz with RAG context successfully', async () => {
      vi.mocked(gemini.generateQuizWithRAG).mockResolvedValue({
        questions: mockQuestions,
        sources: mockQuizContext.sources,
        usedFallback: false
      })

      const request = createMockRequest(
        {
          course: 'fitter',
          module: 'safety-signs',
          difficulty: 'medium'
        },
        mockToken
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.questions).toEqual(mockQuestions)
      expect(data.sources).toEqual(mockQuizContext.sources)
      expect(data.metadata).toMatchObject({
        course: 'fitter',
        module: 'safety-signs',
        totalQuestions: 1,
        difficulty: 'medium',
        retrievedChunks: 3,
        usedFallback: false
      })
    })

    it('should include source references in response', async () => {
      vi.mocked(gemini.generateQuizWithRAG).mockResolvedValue({
        questions: mockQuestions,
        sources: mockQuizContext.sources,
        usedFallback: false
      })

      const request = createMockRequest(
        {
          course: 'fitter',
          module: 'safety-signs',
          difficulty: 'medium'
        },
        mockToken
      )

      const response = await POST(request)
      const data = await response.json()

      expect(data.sources).toBeDefined()
      expect(data.sources).toHaveLength(1)
      expect(data.sources[0]).toMatchObject({
        section: 'Safety Signs Overview',
        pageNumber: 10,
        pdfSource: 'fitter-module-1.pdf'
      })
    })

    it('should handle fallback when content is insufficient', async () => {
      const emptyContext = {
        ...mockQuizContext,
        relevantContent: '',
        chunkCount: 0,
        sources: []
      }

      const mockBuildQuizContext = vi.fn().mockResolvedValue(emptyContext)
      vi.mocked(ContextBuilder).mockImplementation(() => ({
        buildQuizContext: mockBuildQuizContext,
        buildChatContext: vi.fn(),
        buildSyllabusContext: vi.fn(),
        formatConversationHistory: vi.fn(),
        getConfig: vi.fn()
      }) as any)

      vi.mocked(gemini.generateQuizWithRAG).mockResolvedValue({
        questions: mockQuestions,
        sources: [],
        usedFallback: true
      })

      const request = createMockRequest(
        {
          course: 'fitter',
          module: 'safety-signs',
          difficulty: 'medium'
        },
        mockToken
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.metadata.usedFallback).toBe(true)
      expect(data.metadata.retrievedChunks).toBe(0)
    })

    it('should use default difficulty when not provided', async () => {
      vi.mocked(gemini.generateQuizWithRAG).mockResolvedValue({
        questions: mockQuestions,
        sources: mockQuizContext.sources,
        usedFallback: false
      })

      const request = createMockRequest(
        {
          course: 'fitter',
          module: 'safety-signs'
        },
        mockToken
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metadata.difficulty).toBe('medium')
    })

    it('should work with electrician course', async () => {
      const electricianContext = {
        course: 'electrician' as const,
        module: 'ohms-law',
        relevantContent: 'Ohms law states that V = I * R...',
        sources: [
          {
            section: 'Ohms Law',
            pageNumber: 5,
            pdfSource: 'electrician-module-1.pdf'
          }
        ],
        chunkCount: 2
      }

      const mockBuildQuizContext = vi.fn().mockResolvedValue(electricianContext)
      vi.mocked(ContextBuilder).mockImplementation(() => ({
        buildQuizContext: mockBuildQuizContext,
        buildChatContext: vi.fn(),
        buildSyllabusContext: vi.fn(),
        formatConversationHistory: vi.fn(),
        getConfig: vi.fn()
      }) as any)

      vi.mocked(gemini.generateQuizWithRAG).mockResolvedValue({
        questions: mockQuestions,
        sources: electricianContext.sources,
        usedFallback: false
      })

      const request = createMockRequest(
        {
          course: 'electrician',
          module: 'ohms-law',
          difficulty: 'hard'
        },
        mockToken
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.metadata.course).toBe('electrician')
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(simpleAuth.verifyToken).mockReturnValue(mockTokenPayload)
    })

    it('should handle context builder errors', async () => {
      const mockBuildQuizContext = vi.fn().mockRejectedValue(new Error('Database connection failed'))
      vi.mocked(ContextBuilder).mockImplementation(() => ({
        buildQuizContext: mockBuildQuizContext,
        buildChatContext: vi.fn(),
        buildSyllabusContext: vi.fn(),
        formatConversationHistory: vi.fn(),
        getConfig: vi.fn()
      }) as any)

      const request = createMockRequest(
        {
          course: 'fitter',
          module: 'safety-signs',
          difficulty: 'medium'
        },
        mockToken
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database connection failed')
    })

    it('should handle quiz generation errors', async () => {
      const mockQuizContext = {
        course: 'fitter' as const,
        module: 'safety-signs',
        relevantContent: 'Content...',
        sources: [],
        chunkCount: 1
      }

      const mockBuildQuizContext = vi.fn().mockResolvedValue(mockQuizContext)
      vi.mocked(ContextBuilder).mockImplementation(() => ({
        buildQuizContext: mockBuildQuizContext,
        buildChatContext: vi.fn(),
        buildSyllabusContext: vi.fn(),
        formatConversationHistory: vi.fn(),
        getConfig: vi.fn()
      }) as any)

      vi.mocked(gemini.generateQuizWithRAG).mockRejectedValue(new Error('AI service unavailable'))

      const request = createMockRequest(
        {
          course: 'fitter',
          module: 'safety-signs',
          difficulty: 'medium'
        },
        mockToken
      )

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('AI service unavailable')
    })
  })
})
