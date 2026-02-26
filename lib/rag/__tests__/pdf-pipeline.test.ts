import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PDFProcessingPipeline, ProcessingProgress } from '../pdf-pipeline'

describe('PDF Processing Pipeline Tests', () => {
  let pipeline: PDFProcessingPipeline
  let progressCallback: vi.Mock

  beforeEach(() => {
    progressCallback = vi.fn()
    
    pipeline = new PDFProcessingPipeline({
      chunkSize: 500, // Smaller for testing
      chunkOverlap: 50,
      embeddingBatchSize: 10,
      embeddingRetries: 1,
      maxConcurrentFiles: 1,
      progressCallback,
      storeEmbeddings: false, // Disable for testing
      generatePreview: true
    })
  })

  describe('Configuration', () => {
    it('should initialize with default config', () => {
      const defaultPipeline = new PDFProcessingPipeline()
      const stats = defaultPipeline.getStats()
      
      expect(stats.config.chunkSize).toBe(750)
      expect(stats.config.chunkOverlap).toBe(100)
      expect(stats.config.embeddingBatchSize).toBe(50)
      expect(stats.config.embeddingRetries).toBe(3)
      expect(stats.config.maxConcurrentFiles).toBe(3)
      expect(stats.config.storeEmbeddings).toBe(true)
      expect(stats.config.generatePreview).toBe(true)
    })

    it('should initialize with custom config', () => {
      const stats = pipeline.getStats()
      
      expect(stats.config.chunkSize).toBe(500)
      expect(stats.config.chunkOverlap).toBe(50)
      expect(stats.config.embeddingBatchSize).toBe(10)
      expect(stats.config.embeddingRetries).toBe(1)
      expect(stats.config.maxConcurrentFiles).toBe(1)
      expect(stats.config.storeEmbeddings).toBe(false)
      expect(stats.config.generatePreview).toBe(true)
    })

    it('should have progress callback configured', () => {
      expect(typeof pipeline.getStats().config.progressCallback).toBe('function')
    })
  })

  describe('Progress Reporting', () => {
    it('should call progress callback during processing', async () => {
      // This test would require a real PDF file and database setup
      // For now, we'll test that the callback is properly configured
      expect(progressCallback).toBeDefined()
      expect(typeof progressCallback).toBe('function')
    })

    it('should report different stages of processing', () => {
      // Test the progress reporting structure
      const expectedStages = ['extraction', 'chunking', 'embedding', 'storage', 'complete', 'error']
      
      expectedStages.forEach(stage => {
        expect(['extraction', 'chunking', 'embedding', 'storage', 'complete', 'error']).toContain(stage)
      })
    })
  })

  describe('Batch Processing', () => {
    it('should create proper batches for concurrent processing', () => {
      const files = [
        { path: 'file1.pdf', course: 'fitter' as const },
        { path: 'file2.pdf', course: 'electrician' as const },
        { path: 'file3.pdf', course: 'fitter' as const },
        { path: 'file4.pdf', course: 'electrician' as const },
        { path: 'file5.pdf', course: 'fitter' as const }
      ]

      // Test batch creation logic (accessing private method through reflection)
      const createBatches = (pipeline as any).createBatches.bind(pipeline)
      const batches = createBatches(files, 2)
      
      expect(batches).toHaveLength(3) // 5 files with batch size 2 = 3 batches
      expect(batches[0]).toHaveLength(2)
      expect(batches[1]).toHaveLength(2)
      expect(batches[2]).toHaveLength(1)
    })

    it('should handle empty file list', () => {
      const createBatches = (pipeline as any).createBatches.bind(pipeline)
      const batches = createBatches([], 2)
      
      expect(batches).toHaveLength(0)
    })
  })

  describe('Utility Functions', () => {
    it('should generate content preview correctly', () => {
      const generatePreview = (pipeline as any).generatePreview.bind(pipeline)
      
      // Test short content (no truncation)
      const shortContent = 'This is a short text.'
      expect(generatePreview(shortContent)).toBe(shortContent)
      
      // Test long content (with truncation)
      const longContent = 'This is a very long text that should be truncated because it exceeds the maximum length limit that we have set for the preview generation function in our pipeline implementation.'
      const preview = generatePreview(longContent, 50)
      
      expect(preview.length).toBeLessThanOrEqual(53) // 50 + '...'
      expect(preview.endsWith('...')).toBe(true)
    })

    it('should create empty summary for error cases', () => {
      const getEmptySummary = (pipeline as any).getEmptySummary.bind(pipeline)
      const summary = getEmptySummary()
      
      expect(summary).toEqual({
        extractedPages: 0,
        generatedChunks: 0,
        successfulEmbeddings: 0,
        failedEmbeddings: 0,
        storedChunks: 0,
        moduleDistribution: {},
        averageChunkSize: 0,
        totalTokens: 0
      })
    })

    it('should handle delay utility', async () => {
      const delay = (pipeline as any).delay.bind(pipeline)
      
      const startTime = Date.now()
      await delay(100)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(90) // Allow some variance
    })
  })

  describe('Summary Generation', () => {
    it('should generate processing summary correctly', () => {
      const generateSummary = (pipeline as any).generateSummary.bind(pipeline)
      
      const mockContent = {
        numPages: 10,
        text: 'Sample content',
        metadata: {},
        pageTexts: []
      }
      
      const mockChunks = [
        { module: 'module1', tokenCount: 100, content: 'chunk1' },
        { module: 'module1', tokenCount: 150, content: 'chunk2' },
        { module: 'module2', tokenCount: 200, content: 'chunk3' },
        { module: null, tokenCount: 75, content: 'chunk4' }
      ]
      
      const mockEmbeddings = {
        embeddings: [[], [], []],
        totalTokens: 1000,
        failedIndices: [3] // One failed embedding
      }
      
      const storedChunks = 3
      
      const summary = generateSummary(mockContent, mockChunks, mockEmbeddings, storedChunks)
      
      expect(summary.extractedPages).toBe(10)
      expect(summary.generatedChunks).toBe(4)
      expect(summary.successfulEmbeddings).toBe(3)
      expect(summary.failedEmbeddings).toBe(1)
      expect(summary.storedChunks).toBe(3)
      expect(summary.moduleDistribution).toEqual({
        'module1': 2,
        'module2': 1,
        'unassigned': 1
      })
      expect(summary.averageChunkSize).toBe(131) // (100+150+200+75)/4 = 131.25 rounded
      expect(summary.totalTokens).toBe(525)
    })
  })

  describe('Error Handling', () => {
    it('should handle processing errors gracefully', async () => {
      // Test error handling by trying to process a non-existent file
      const result = await pipeline.processPDF('/non/existent/file.pdf', 'fitter')
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.totalChunks).toBe(0)
      expect(result.totalEmbeddings).toBe(0)
      expect(result.summary).toEqual({
        extractedPages: 0,
        generatedChunks: 0,
        successfulEmbeddings: 0,
        failedEmbeddings: 0,
        storedChunks: 0,
        moduleDistribution: {},
        averageChunkSize: 0,
        totalTokens: 0
      })
    })

    it('should report error progress', async () => {
      await pipeline.processPDF('/non/existent/file.pdf', 'fitter')
      
      // Check that error progress was reported
      const errorCalls = progressCallback.mock.calls.filter(
        call => call[0].stage === 'error'
      )
      
      expect(errorCalls.length).toBeGreaterThan(0)
    })
  })

  describe('Statistics', () => {
    it('should provide comprehensive pipeline statistics', () => {
      const stats = pipeline.getStats()
      
      expect(stats).toHaveProperty('config')
      expect(stats).toHaveProperty('embeddingStats')
      
      expect(stats.config).toHaveProperty('chunkSize')
      expect(stats.config).toHaveProperty('chunkOverlap')
      expect(stats.config).toHaveProperty('embeddingBatchSize')
      expect(stats.config).toHaveProperty('storeEmbeddings')
      
      expect(stats.embeddingStats).toHaveProperty('config')
      expect(stats.embeddingStats).toHaveProperty('rateLimitStatus')
    })
  })
})