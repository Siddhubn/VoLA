import { LocalEmbeddingService } from './local-embedding-service'

/**
 * Unified Embedding Service
 * 
 * This service provides a consistent interface for generating embeddings
 * using the local Transformers.js model (all-MiniLM-L6-v2).
 * 
 * Benefits:
 * - No API calls or costs
 * - Works offline
 * - Fast and consistent
 * - Perfect for RAG with any text generation model (including Gemini)
 */

export interface EmbeddingResult {
  embedding: number[]
  tokenCount?: number
}

export interface BatchEmbeddingResult {
  embeddings: number[][]
  totalTokens: number
  failedIndices: number[]
}

export class UnifiedEmbeddingService {
  private localService: LocalEmbeddingService

  constructor() {
    this.localService = new LocalEmbeddingService()
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    return this.localService.generateEmbedding(text)
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
    return this.localService.generateBatchEmbeddings(texts)
  }

  /**
   * Generate embedding for a search query
   */
  async embedQuery(query: string): Promise<number[]> {
    return this.localService.embedQuery(query)
  }

  /**
   * Get service information
   */
  getInfo(): {
    provider: string
    model: string
    dimensions: number
    description: string
  } {
    const modelInfo = this.localService.getModelInfo()
    return {
      provider: 'Local (Transformers.js)',
      model: modelInfo.model,
      dimensions: modelInfo.dimensions,
      description: modelInfo.description
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.localService.isInitialized()
  }
}

// Export a default instance
export const embeddingService = new UnifiedEmbeddingService()
