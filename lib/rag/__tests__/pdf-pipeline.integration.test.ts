import { describe, it, expect, beforeAll, vi } from 'vitest'
import { PDFProcessingPipeline, ProcessingProgress } from '../pdf-pipeline'

// Mock all external dependencies for integration tests
vi.mock('../rag-db', () => ({
  createPDFDocument: vi.fn().mockResolvedValue(1),
  updatePDFDocument: vi.fn().mockResolvedValue(undefined),
  createKnowledgeChunk: vi.fn().mockResolvedValue(1)
}))

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      embedContent: vi.fn().mockImplementation((text: string) => {
        const hash = simpleHash(text)
        const embedding = Array.from({ length: 768 }, (_, i) => 
          Math.sin(hash + i) * 0.5 + 0.5
        )
        return Promise.resolve({
          embedding: { values: embedding }
        })
      })
    })
  }))
}))

// Mock the PDF processor to avoid pdf-parse issues
vi.mock('../pdf-processor', () => ({
  PDFProcessor: vi.fn().mockImplementation(() => ({
    extractText: vi.fn().mockResolvedValue({
      text: 'Sample PDF content for testing. This is module 1 content about fitter operations. Safety procedures are important.',
      numPages: 3,
      metadata: { title: 'Test PDF' },
      pageTexts: ['Page 1 content', 'Page 2 content', 'Page 3 content']
    }),
    filterContent: vi.fn().mockResolvedValue('Filtered content for testing'),
    chunkContent: vi.fn().mockResolvedValue([
      {
        content: 'Sample chunk 1 content',
        module: 'module1',
        section: 'section1',
        pageNumber: 1,
        chunkIndex: 0,
        tokenCount: 100,
        metadata: {}
      },
      {
        content: 'Sample chunk 2 content',
        module: 'module1',
        section: 'section2',
        pageNumber: 2,
        chunkIndex: 1,
        tokenCount: 120,
        metadata: {}
      }
    ]),
    assignModulesToChunks: vi.fn().mockImplementation((chunks) => chunks)
  }))
}))

describe('PDF Pipeline Integration Tests', () => {
  let pipeline: PDFProcessingPipeline
  let progressEvents: ProcessingProgress[]

  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-api-key'
    
    progressEvents = []
    
    pipeline = new PDFProcessingPipeline({
      chunkSize: 300,
      chunkOverlap: 50,
      embeddingBatchSize: 5,
      embeddingRetries: 1,
      maxConcurrentFiles: 1,
      progressCallback: (progress) => {
        progressEvents.push(progress)
      },
      storeEmbeddings: true,
      generatePreview: true
    })
  })

  describe('Pipeline Orchestration', () => {
    it('should orchestrate the complete pipeline successfully', async () => {
      progressEvents = []
      
      const result = await pipeline.processPDF('/mock/test.pdf', 'fitter')
      
      expect(result.success).toBe(true)
      expect(result.filename).toBe('test.pdf')
      expect(result.course).toBe('fitter')
      expect(result.documentId).toBe(1)
      expect(result.totalChunks).toBe(2)
      expect(result.totalEmbeddings).toBe(2)
      expect(result.processingTimeMs).toBeGreaterThan(0)
      
      // Verify summary
      expect(result.summary.extractedPages).toBe(3)
      expect(result.summary.generatedChunks).toBe(2)
      expect(result.summary.successfulEmbeddings).toBe(2)
      expect(result.summary.storedChunks).toBe(2)
      expect(result.summary.totalTokens).toBe(220) // 100 + 120
      expect(result.summary.averageChunkSize).toBe(110)
    })

    it('should track progress through all pipeline stages', async () => {
      progressEvents = []
      
      await pipeline.processPDF('/mock/test.pdf', 'electrician')
      
      const stages = progressEvents.map(event => event.stage)
      expect(stages).toContain('extraction')
      expect(stages).toContain('chunking')
      expect(stages).toContain('embedding')
      expect(stages).toContain('storage')
      expect(stages).toContain('complete')
      
      const finalEvent = progressEvents[progressEvents.length - 1]
      expect(finalEvent.stage).toBe('complete')
      expect(finalEvent.progress).toBe(100)
    })

    it('should handle module assignment in pipeline', async () => {
      const result = await pipeline.processPDF('/mock/test.pdf', 'fitter')
      
      expect(result.success).toBe(true)
      expect(result.summary.moduleDistribution).toEqual({
        'module1': 2
      })
    })
  })

  describe('Batch Processing Integration', () => {
    it('should process multiple files in sequence', async () => {
      const files = [
        { path: '/mock/test1.pdf', course: 'fitter' as const },
        { path: '/mock/test2.pdf', course: 'electrician' as const }
      ]
      
      const results = await pipeline.processBatch(files)
      
      expect(results).toHaveLength(2)
      results.forEach(result => {
        expect(result.success).toBe(true)
        expect(result.totalChunks).toBe(2)
        expect(result.totalEmbeddings).toBe(2)
      })
      
      expect(results[0].course).toBe('fitter')
      expect(results[1].course).toBe('electrician')
    })

    it('should handle mixed success and failure in batch', async () => {
      // Mock one file to fail
      const mockPdfProcessor = pipeline['pdfProcessor']
      const originalExtractText = mockPdfProcessor.extractText
      
      mockPdfProcessor.extractText = vi.fn()
        .mockResolvedValueOnce({
          text: 'Success content',
          numPages: 1,
          metadata: {},
          pageTexts: ['Page 1']
        })
        .mockRejectedValueOnce(new Error('File not found'))
      
      const files = [
        { path: '/mock/success.pdf', course: 'fitter' as const },
        { path: '/mock/failure.pdf', course: 'electrician' as const }
      ]
      
      const results = await pipeline.processBatch(files)
      
      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBeDefined()
      
      // Restore original method
      mockPdfProcessor.extractText = originalExtractText
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle extraction errors gracefully', async () => {
      const mockPdfProcessor = pipeline['pdfProcessor']
      const originalExtractText = mockPdfProcessor.extractText
      
      mockPdfProcessor.extractText = vi.fn()
        .mockRejectedValue(new Error('PDF extraction failed'))
      
      const result = await pipeline.processPDF('/mock/bad.pdf', 'fitter')
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('PDF extraction failed')
      expect(result.totalChunks).toBe(0)
      expect(result.totalEmbeddings).toBe(0)
      
      // Restore original method
      mockPdfProcessor.extractText = originalExtractText
    })

    it('should handle embedding failures gracefully', async () => {
      const mockEmbeddingService = pipeline['embeddingService']
      const originalGenerateBatch = mockEmbeddingService.generateBatchEmbeddings
      
      mockEmbeddingService.generateBatchEmbeddings = vi.fn()
        .mockResolvedValue({
          embeddings: [], // No successful embeddings
          totalTokens: 0,
          failedIndices: [0, 1] // All failed
        })
      
      const result = await pipeline.processPDF('/mock/test.pdf', 'fitter')
      
      expect(result.success).toBe(true) // Pipeline should still succeed
      expect(result.summary.successfulEmbeddings).toBe(0)
      expect(result.summary.failedEmbeddings).toBe(2)
      
      // Restore original method
      mockEmbeddingService.generateBatchEmbeddings = originalGenerateBatch
    })

    it('should handle storage errors gracefully', async () => {
      const { createKnowledgeChunk } = await import('../rag-db')
      
      // Mock storage to fail
      vi.mocked(createKnowledgeChunk).mockRejectedValue(new Error('Database error'))
      
      const result = await pipeline.processPDF('/mock/test.pdf', 'fitter')
      
      expect(result.success).toBe(true) // Pipeline completes even with storage errors
      expect(result.summary.storedChunks).toBe(0) // No chunks stored due to errors
      
      // Restore original mock
      vi.mocked(createKnowledgeChunk).mockResolvedValue(1)
    })
  })

  describe('Performance Integration', () => {
    it('should complete processing within reasonable time', async () => {
      const startTime = Date.now()
      
      const result = await pipeline.processPDF('/mock/test.pdf', 'fitter')
      
      const totalTime = Date.now() - startTime
      
      expect(result.success).toBe(true)
      expect(totalTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(result.processingTimeMs).toBeLessThan(totalTime + 100)
    })

    it('should handle concurrent processing efficiently', async () => {
      const files = Array.from({ length: 5 }, (_, i) => ({
        path: `/mock/test${i}.pdf`,
        course: 'fitter' as const
      }))
      
      const startTime = Date.now()
      const results = await pipeline.processBatch(files)
      const totalTime = Date.now() - startTime
      
      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result.success).toBe(true)
      })
      
      // Should complete all files within reasonable time
      expect(totalTime).toBeLessThan(10000) // 10 seconds for 5 files
    })
  })

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency across pipeline stages', async () => {
      const result = await pipeline.processPDF('/mock/test.pdf', 'fitter')
      
      expect(result.success).toBe(true)
      
      // Verify counts are consistent
      expect(result.totalChunks).toBe(result.summary.generatedChunks)
      expect(result.totalEmbeddings).toBe(result.summary.successfulEmbeddings)
      expect(result.summary.storedChunks).toBeLessThanOrEqual(result.summary.generatedChunks)
      
      // Verify token calculations
      expect(result.summary.totalTokens).toBeGreaterThan(0)
      expect(result.summary.averageChunkSize).toBe(
        Math.round(result.summary.totalTokens / result.summary.generatedChunks)
      )
      
      // Verify module distribution
      const totalModuleAssignments = Object.values(result.summary.moduleDistribution)
        .reduce((sum, count) => sum + count, 0)
      expect(totalModuleAssignments).toBe(result.summary.generatedChunks)
    })

    it('should preserve content integrity through transformations', async () => {
      const result = await pipeline.processPDF('/mock/test.pdf', 'fitter')
      
      expect(result.success).toBe(true)
      
      // Verify reasonable chunk sizes
      expect(result.summary.averageChunkSize).toBeGreaterThan(50)
      expect(result.summary.averageChunkSize).toBeLessThan(500)
      
      // Verify all chunks have meaningful content
      expect(result.summary.generatedChunks).toBeGreaterThan(0)
      expect(result.summary.totalTokens).toBeGreaterThan(0)
      
      // Verify module assignments are reasonable
      expect(Object.keys(result.summary.moduleDistribution).length).toBeGreaterThan(0)
    })
  })
})

/**
 * Simple hash function for creating deterministic mock embeddings
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}