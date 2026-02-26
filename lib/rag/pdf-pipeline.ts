import { PDFProcessor, ProcessedChunk, ExtractedContent } from './pdf-processor'
import { EmbeddingService, BatchEmbeddingResult } from './embedding-service'
import { 
  createPDFDocument, 
  updatePDFDocument, 
  createKnowledgeChunk,
  PDFDocument,
  KnowledgeChunk 
} from './rag-db'
import path from 'path'
import fs from 'fs/promises'

export interface PipelineConfig {
  // PDF Processing
  chunkSize?: number
  chunkOverlap?: number
  
  // Embedding
  embeddingBatchSize?: number
  embeddingRetries?: number
  
  // Processing
  maxConcurrentFiles?: number
  progressCallback?: (progress: ProcessingProgress) => void
  
  // Storage
  storeEmbeddings?: boolean
  generatePreview?: boolean
}

export interface ProcessingProgress {
  stage: 'extraction' | 'chunking' | 'embedding' | 'storage' | 'complete' | 'error'
  filename: string
  progress: number // 0-100
  message: string
  chunksProcessed?: number
  totalChunks?: number
  embeddingsGenerated?: number
  timeElapsed?: number
  estimatedTimeRemaining?: number
}

export interface ProcessingResult {
  success: boolean
  filename: string
  course: 'fitter' | 'electrician'
  documentId?: number
  totalChunks: number
  totalEmbeddings: number
  processingTimeMs: number
  error?: string
  summary: ProcessingSummary
}

export interface ProcessingSummary {
  extractedPages: number
  generatedChunks: number
  successfulEmbeddings: number
  failedEmbeddings: number
  storedChunks: number
  moduleDistribution: Record<string, number>
  averageChunkSize: number
  totalTokens: number
}

export class PDFProcessingPipeline {
  private pdfProcessor: PDFProcessor
  private embeddingService: EmbeddingService
  private config: Required<PipelineConfig>

  constructor(config: PipelineConfig = {}) {
    this.config = {
      chunkSize: config.chunkSize || 750,
      chunkOverlap: config.chunkOverlap || 100,
      embeddingBatchSize: config.embeddingBatchSize || 50,
      embeddingRetries: config.embeddingRetries || 3,
      maxConcurrentFiles: config.maxConcurrentFiles || 3,
      progressCallback: config.progressCallback || (() => {}),
      storeEmbeddings: config.storeEmbeddings ?? true,
      generatePreview: config.generatePreview ?? true
    }

    this.pdfProcessor = new PDFProcessor({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
      excludePatterns: []
    })

    this.embeddingService = new EmbeddingService({
      batchSize: this.config.embeddingBatchSize,
      retryAttempts: this.config.embeddingRetries
    })
  }

  /**
   * Process a single PDF file through the complete pipeline
   */
  async processPDF(
    filePath: string, 
    course: 'fitter' | 'electrician'
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    const filename = path.basename(filePath)
    
    console.log(`🚀 Starting pipeline for ${filename} (${course})`)

    try {
      // Initialize document record
      const documentId = await this.initializeDocument(filePath, course)
      
      // Stage 1: Extract content from PDF
      this.reportProgress('extraction', filename, 0, 'Extracting text from PDF...')
      const extractedContent = await this.extractContent(filePath)
      
      // Stage 2: Generate chunks
      this.reportProgress('chunking', filename, 25, 'Generating content chunks...')
      const chunks = await this.generateChunks(extractedContent, course, filename)
      
      // Stage 3: Generate embeddings
      this.reportProgress('embedding', filename, 50, 'Generating embeddings...', chunks.length, 0)
      const embeddings = await this.generateEmbeddings(chunks, filename)
      
      // Stage 4: Store in database
      this.reportProgress('storage', filename, 75, 'Storing chunks in database...')
      const storedChunks = await this.storeChunks(chunks, embeddings, course, filename, documentId)
      
      // Stage 5: Update document status and generate summary
      const summary = this.generateSummary(extractedContent, chunks, embeddings, storedChunks)
      await this.finalizeDocument(documentId, summary, filename)
      
      const processingTimeMs = Date.now() - startTime
      
      this.reportProgress('complete', filename, 100, 'Processing complete!')
      
      console.log(`✅ Pipeline completed for ${filename} in ${processingTimeMs}ms`)
      
      return {
        success: true,
        filename,
        course,
        documentId,
        totalChunks: chunks.length,
        totalEmbeddings: embeddings.embeddings.length,
        processingTimeMs,
        summary
      }

    } catch (error) {
      const processingTimeMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      console.error(`❌ Pipeline failed for ${filename}:`, error)
      this.reportProgress('error', filename, 0, `Error: ${errorMessage}`)
      
      return {
        success: false,
        filename,
        course,
        totalChunks: 0,
        totalEmbeddings: 0,
        processingTimeMs,
        error: errorMessage,
        summary: this.getEmptySummary()
      }
    }
  }

  /**
   * Process multiple PDF files in batches
   */
  async processBatch(
    filePaths: Array<{ path: string; course: 'fitter' | 'electrician' }>
  ): Promise<ProcessingResult[]> {
    console.log(`🔄 Processing batch of ${filePaths.length} files`)
    
    const results: ProcessingResult[] = []
    const batches = this.createBatches(filePaths, this.config.maxConcurrentFiles)
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} files)`)
      
      const batchPromises = batch.map(({ path, course }) => 
        this.processPDF(path, course)
      )
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error('Batch processing error:', result.reason)
          results.push({
            success: false,
            filename: 'unknown',
            course: 'fitter',
            totalChunks: 0,
            totalEmbeddings: 0,
            processingTimeMs: 0,
            error: result.reason?.message || 'Unknown batch error',
            summary: this.getEmptySummary()
          })
        }
      }
      
      // Add delay between batches to respect rate limits
      if (i < batches.length - 1) {
        console.log('⏳ Waiting between batches...')
        await this.delay(2000)
      }
    }
    
    return results
  }

  /**
   * Initialize document record in database
   */
  private async initializeDocument(filePath: string, course: 'fitter' | 'electrician'): Promise<number> {
    const filename = path.basename(filePath)
    const stats = await fs.stat(filePath)
    
    const document: PDFDocument = {
      course,
      filename,
      file_path: filePath,
      file_size: stats.size,
      processing_status: 'processing',
      processing_started_at: new Date(),
      metadata: {}
    }
    
    return await createPDFDocument(document)
  }

  /**
   * Extract content from PDF
   */
  private async extractContent(filePath: string): Promise<ExtractedContent> {
    return await this.pdfProcessor.extractText(filePath)
  }

  /**
   * Generate chunks from extracted content
   */
  private async generateChunks(
    content: ExtractedContent, 
    course: 'fitter' | 'electrician',
    filename: string
  ): Promise<ProcessedChunk[]> {
    // Filter the content first
    const filteredText = await this.pdfProcessor.filterContent(content.text)
    
    // Chunk the filtered content
    const chunks = await this.pdfProcessor.chunkContent(filteredText)
    
    // Assign modules to chunks
    const chunksWithModules = await this.pdfProcessor.assignModulesToChunks(chunks, course)
    
    return chunksWithModules
  }

  /**
   * Generate embeddings for chunks
   */
  private async generateEmbeddings(
    chunks: ProcessedChunk[], 
    filename: string
  ): Promise<BatchEmbeddingResult> {
    const texts = chunks.map(chunk => chunk.content)
    
    console.log(`🔮 Generating embeddings for ${texts.length} chunks from ${filename}`)
    
    // Track progress during embedding generation
    let processedCount = 0
    const batchSize = this.config.embeddingBatchSize
    const totalBatches = Math.ceil(texts.length / batchSize)
    
    const allEmbeddings: number[][] = []
    let totalTokens = 0
    const failedIndices: number[] = []
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      
      try {
        const batchResult = await this.embeddingService.generateBatchEmbeddings(batch)
        
        allEmbeddings.push(...batchResult.embeddings)
        totalTokens += batchResult.totalTokens
        
        // Adjust failed indices to global indices
        batchResult.failedIndices.forEach(localIndex => {
          failedIndices.push(i + localIndex)
        })
        
        processedCount += batch.length
        const progress = 50 + Math.round((processedCount / texts.length) * 25) // 50-75% range
        
        this.reportProgress(
          'embedding', 
          filename, 
          progress, 
          `Generating embeddings... (batch ${batchNumber}/${totalBatches})`,
          texts.length,
          processedCount
        )
        
      } catch (error) {
        console.error(`❌ Failed to generate embeddings for batch ${batchNumber}:`, error)
        
        // Mark all items in this batch as failed
        for (let j = 0; j < batch.length; j++) {
          failedIndices.push(i + j)
        }
      }
    }
    
    return {
      embeddings: allEmbeddings,
      totalTokens,
      failedIndices
    }
  }

  /**
   * Store chunks and embeddings in database
   */
  private async storeChunks(
    chunks: ProcessedChunk[],
    embeddings: BatchEmbeddingResult,
    course: 'fitter' | 'electrician',
    filename: string,
    documentId: number
  ): Promise<number> {
    let storedCount = 0
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      
      // Skip if embedding generation failed for this chunk
      if (embeddings.failedIndices.includes(i)) {
        console.warn(`⚠️ Skipping chunk ${i} due to embedding failure`)
        continue
      }
      
      const embedding = embeddings.embeddings[i - embeddings.failedIndices.filter(idx => idx < i).length]
      
      const knowledgeChunk: KnowledgeChunk = {
        course,
        pdf_source: filename,
        module: chunk.module || undefined,
        section: chunk.section || undefined,
        page_number: chunk.pageNumber,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        content_preview: this.config.generatePreview ? this.generatePreview(chunk.content) : undefined,
        embedding: this.config.storeEmbeddings ? embedding : undefined,
        token_count: chunk.tokenCount,
        metadata: chunk.metadata
      }
      
      try {
        await createKnowledgeChunk(knowledgeChunk)
        storedCount++
      } catch (error) {
        console.error(`❌ Failed to store chunk ${i}:`, error)
      }
    }
    
    return storedCount
  }

  /**
   * Generate processing summary
   */
  private generateSummary(
    content: ExtractedContent,
    chunks: ProcessedChunk[],
    embeddings: BatchEmbeddingResult,
    storedChunks: number
  ): ProcessingSummary {
    const moduleDistribution: Record<string, number> = {}
    let totalTokens = 0
    
    chunks.forEach(chunk => {
      const module = chunk.module || 'unassigned'
      moduleDistribution[module] = (moduleDistribution[module] || 0) + 1
      totalTokens += chunk.tokenCount
    })
    
    return {
      extractedPages: content.numPages,
      generatedChunks: chunks.length,
      successfulEmbeddings: embeddings.embeddings.length,
      failedEmbeddings: embeddings.failedIndices.length,
      storedChunks,
      moduleDistribution,
      averageChunkSize: chunks.length > 0 ? Math.round(totalTokens / chunks.length) : 0,
      totalTokens
    }
  }

  /**
   * Finalize document processing
   */
  private async finalizeDocument(documentId: number, summary: ProcessingSummary, filename: string): Promise<void> {
    await updatePDFDocument(filename, {
      total_pages: summary.extractedPages,
      total_chunks: summary.storedChunks,
      processing_status: 'completed',
      processing_completed_at: new Date(),
      metadata: {
        summary,
        processing_completed: true
      }
    })
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    stage: ProcessingProgress['stage'],
    filename: string,
    progress: number,
    message: string,
    totalChunks?: number,
    chunksProcessed?: number
  ): void {
    this.config.progressCallback({
      stage,
      filename,
      progress,
      message,
      totalChunks,
      chunksProcessed
    })
  }

  /**
   * Generate content preview
   */
  private generatePreview(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) return content
    
    const truncated = content.substring(0, maxLength)
    const lastSpace = truncated.lastIndexOf(' ')
    
    return lastSpace > maxLength * 0.8 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...'
  }

  /**
   * Create batches for concurrent processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Get empty summary for error cases
   */
  private getEmptySummary(): ProcessingSummary {
    return {
      extractedPages: 0,
      generatedChunks: 0,
      successfulEmbeddings: 0,
      failedEmbeddings: 0,
      storedChunks: 0,
      moduleDistribution: {},
      averageChunkSize: 0,
      totalTokens: 0
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get pipeline statistics
   */
  getStats() {
    return {
      config: this.config,
      embeddingStats: this.embeddingService.getStats()
    }
  }
}

// Export default instance with standard configuration
export const pdfPipeline = new PDFProcessingPipeline()