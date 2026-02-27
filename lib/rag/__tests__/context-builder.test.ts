import { describe, it, expect, beforeAll, vi } from 'vitest'
import { ContextBuilder } from '../context-builder'
import { VectorSearchService, SearchResult } from '../vector-search'

describe('ContextBuilder', () => {
  let contextBuilder: ContextBuilder
  let mockVectorSearch: VectorSearchService

  // Mock search results
  const mockSearchResults: SearchResult[] = [
    {
      chunkId: 1,
      content: 'Safety equipment includes helmets, gloves, and protective eyewear. These items are essential for worker protection.',
      similarity: 0.95,
      source: {
        course: 'fitter',
        module: 'safety',
        section: 'Personal Protective Equipment',
        pageNumber: 5,
        pdfSource: 'fitter-safety.pdf'
      }
    },
    {
      chunkId: 2,
      content: 'Fire extinguishers must be inspected regularly. Different types are used for different fire classes.',
      similarity: 0.88,
      source: {
        course: 'fitter',
        module: 'safety',
        section: 'Fire Safety',
        pageNumber: 12,
        pdfSource: 'fitter-safety.pdf'
      }
    },
    {
      chunkId: 3,
      content: 'Emergency exits must be clearly marked and kept unobstructed at all times.',
      similarity: 0.82,
      source: {
        course: 'fitter',
        module: 'safety',
        section: 'Emergency Procedures',
        pageNumber: 15,
        pdfSource: 'fitter-safety.pdf'
      }
    }
  ]

  beforeAll(() => {
    // Create mock vector search service
    mockVectorSearch = {
      search: vi.fn().mockResolvedValue(mockSearchResults),
      searchByEmbedding: vi.fn(),
      searchByCourse: vi.fn(),
      searchByModule: vi.fn(),
      findSimilarChunks: vi.fn(),
      getConfig: vi.fn()
    } as any

    contextBuilder = new ContextBuilder({
      vectorSearchService: mockVectorSearch
    })
  })

  describe('buildQuizContext', () => {
    it('should build context for quiz generation', async () => {
      const context = await contextBuilder.buildQuizContext('fitter', 'safety')

      expect(context).toBeDefined()
      expect(context.course).toBe('fitter')
      expect(context.module).toBe('safety')
      expect(context.relevantContent).toBeTruthy()
      expect(context.sources).toHaveLength(3)
      expect(context.chunkCount).toBe(3)
    })

    it('should include source metadata', async () => {
      const context = await contextBuilder.buildQuizContext('fitter', 'safety')

      expect(context.sources[0]).toHaveProperty('section')
      expect(context.sources[0]).toHaveProperty('pageNumber')
      expect(context.sources[0]).toHaveProperty('pdfSource')
      expect(context.sources[0].section).toBe('Personal Protective Equipment')
      expect(context.sources[0].pageNumber).toBe(5)
    })

    it('should format content with sections', async () => {
      const context = await contextBuilder.buildQuizContext('fitter', 'safety')

      expect(context.relevantContent).toContain('Personal Protective Equipment')
      expect(context.relevantContent).toContain('Safety equipment')
    })

    it('should call vector search with correct parameters', async () => {
      await contextBuilder.buildQuizContext('fitter', 'safety', {
        topK: 10,
        minSimilarity: 0.8
      })

      expect(mockVectorSearch.search).toHaveBeenCalledWith(
        expect.objectContaining({
          course: 'fitter',
          module: 'safety',
          topK: 10,
          minSimilarity: 0.8
        })
      )
    })
  })

  describe('buildChatContext', () => {
    it('should build context for chatbot', async () => {
      const context = await contextBuilder.buildChatContext('What is safety equipment?', {
        course: 'fitter',
        module: 'safety'
      })

      expect(context).toBeDefined()
      expect(context.query).toBe('What is safety equipment?')
      expect(context.course).toBe('fitter')
      expect(context.module).toBe('safety')
      expect(context.relevantContent).toBeTruthy()
      expect(context.sources).toHaveLength(3)
      expect(context.chunkCount).toBe(3)
    })

    it('should include similarity scores in sources', async () => {
      const context = await contextBuilder.buildChatContext('safety equipment')

      expect(context.sources[0]).toHaveProperty('similarity')
      expect(context.sources[0].similarity).toBe(0.95)
    })

    it('should include conversation history if provided', async () => {
      const history = [
        { role: 'user' as const, content: 'What is PPE?' },
        { role: 'assistant' as const, content: 'PPE stands for Personal Protective Equipment.' }
      ]

      const context = await contextBuilder.buildChatContext('Tell me more', {
        conversationHistory: history
      })

      expect(context.conversationHistory).toEqual(history)
    })

    it('should work without course/module filters', async () => {
      const context = await contextBuilder.buildChatContext('safety procedures')

      expect(context).toBeDefined()
      expect(context.course).toBeUndefined()
      expect(context.module).toBeUndefined()
    })
  })

  describe('buildSyllabusContext', () => {
    it('should build context for specific module', async () => {
      const context = await contextBuilder.buildSyllabusContext('fitter', 'safety')

      expect(context).toBeDefined()
      expect(context.course).toBe('fitter')
      expect(context.module).toBe('safety')
      expect(context.modules).toHaveLength(1)
      expect(context.modules[0].name).toBe('safety')
    })

    it('should extract topics from content', async () => {
      const context = await contextBuilder.buildSyllabusContext('fitter', 'safety')

      expect(context.modules[0].topics).toBeDefined()
      expect(Array.isArray(context.modules[0].topics)).toBe(true)
      expect(context.modules[0].topics.length).toBeGreaterThan(0)
    })

    it('should extract page references', async () => {
      const context = await contextBuilder.buildSyllabusContext('fitter', 'safety')

      expect(context.modules[0].pageReferences).toBeDefined()
      expect(context.modules[0].pageReferences).toContain(5)
      expect(context.modules[0].pageReferences).toContain(12)
      expect(context.modules[0].pageReferences).toContain(15)
    })

    it('should generate module description', async () => {
      const context = await contextBuilder.buildSyllabusContext('fitter', 'safety')

      expect(context.modules[0].description).toBeDefined()
      expect(context.modules[0].description.length).toBeGreaterThan(0)
      expect(context.modules[0].description.length).toBeLessThanOrEqual(250)
    })

    it('should include chunk count', async () => {
      const context = await contextBuilder.buildSyllabusContext('fitter', 'safety')

      expect(context.modules[0].chunkCount).toBe(3)
    })
  })

  describe('formatConversationHistory', () => {
    it('should format conversation history', () => {
      const history = [
        { role: 'user' as const, content: 'What is PPE?' },
        { role: 'assistant' as const, content: 'PPE stands for Personal Protective Equipment.' },
        { role: 'user' as const, content: 'Give examples' },
        { role: 'assistant' as const, content: 'Examples include helmets, gloves, and safety glasses.' }
      ]

      const formatted = contextBuilder.formatConversationHistory(history)

      expect(formatted).toContain('User: What is PPE?')
      expect(formatted).toContain('Assistant: PPE stands for Personal Protective Equipment.')
      expect(formatted).toContain('User: Give examples')
      expect(formatted).toContain('Assistant: Examples include helmets')
    })

    it('should limit to max messages', () => {
      const history = [
        { role: 'user' as const, content: 'Message 1' },
        { role: 'assistant' as const, content: 'Response 1' },
        { role: 'user' as const, content: 'Message 2' },
        { role: 'assistant' as const, content: 'Response 2' },
        { role: 'user' as const, content: 'Message 3' },
        { role: 'assistant' as const, content: 'Response 3' }
      ]

      const formatted = contextBuilder.formatConversationHistory(history, 2)

      expect(formatted).not.toContain('Message 1')
      expect(formatted).not.toContain('Response 1')
      expect(formatted).toContain('Message 3')
      expect(formatted).toContain('Response 3')
    })

    it('should handle empty history', () => {
      const formatted = contextBuilder.formatConversationHistory([])

      expect(formatted).toBe('')
    })
  })

  describe('configuration', () => {
    it('should use default configuration', () => {
      const builder = new ContextBuilder()
      const config = builder.getConfig()

      expect(config.maxContextLength).toBe(4000)
      expect(config.maxChunks).toBe(5)
      expect(config.includeMetadata).toBe(true)
    })

    it('should accept custom configuration', () => {
      const builder = new ContextBuilder({
        maxContextLength: 2000,
        maxChunks: 10,
        includeMetadata: false
      })
      const config = builder.getConfig()

      expect(config.maxContextLength).toBe(2000)
      expect(config.maxChunks).toBe(10)
      expect(config.includeMetadata).toBe(false)
    })
  })

  describe('context length limits', () => {
    it('should respect maxContextLength', async () => {
      const builder = new ContextBuilder({
        maxContextLength: 200,
        vectorSearchService: mockVectorSearch
      })

      const context = await builder.buildQuizContext('fitter', 'safety')

      expect(context.relevantContent.length).toBeLessThanOrEqual(200)
    })

    it('should truncate content when exceeding limit', async () => {
      const builder = new ContextBuilder({
        maxContextLength: 100,
        vectorSearchService: mockVectorSearch
      })

      const context = await builder.buildQuizContext('fitter', 'safety')

      expect(context.relevantContent.length).toBeLessThanOrEqual(100)
      if (context.relevantContent.length === 100) {
        expect(context.relevantContent).toContain('...')
      }
    })
  })

  describe('edge cases', () => {
    it('should handle empty search results', async () => {
      const emptyMockSearch = {
        search: vi.fn().mockResolvedValue([]),
        searchByEmbedding: vi.fn(),
        searchByCourse: vi.fn(),
        searchByModule: vi.fn(),
        findSimilarChunks: vi.fn(),
        getConfig: vi.fn()
      } as any

      const builder = new ContextBuilder({
        vectorSearchService: emptyMockSearch
      })

      const context = await builder.buildQuizContext('fitter', 'safety')

      expect(context.relevantContent).toBe('No relevant content found.')
      expect(context.sources).toHaveLength(0)
      expect(context.chunkCount).toBe(0)
    })

    it('should handle chunks without metadata', async () => {
      const noMetadataResults: SearchResult[] = [{
        chunkId: 1,
        content: 'Test content',
        similarity: 0.9,
        source: {
          course: 'fitter',
          module: null,
          section: null,
          pageNumber: null,
          pdfSource: 'test.pdf'
        }
      }]

      const noMetadataMock = {
        search: vi.fn().mockResolvedValue(noMetadataResults),
        searchByEmbedding: vi.fn(),
        searchByCourse: vi.fn(),
        searchByModule: vi.fn(),
        findSimilarChunks: vi.fn(),
        getConfig: vi.fn()
      } as any

      const builder = new ContextBuilder({
        vectorSearchService: noMetadataMock
      })

      const context = await builder.buildQuizContext('fitter', 'safety')

      expect(context).toBeDefined()
      expect(context.sources[0].section).toBeNull()
      expect(context.sources[0].pageNumber).toBeNull()
    })
  })
})
