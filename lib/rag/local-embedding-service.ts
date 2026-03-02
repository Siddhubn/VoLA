// Ensure this module only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('LocalEmbeddingService can only be used on the server side')
}

import { pipeline, env } from '@xenova/transformers'

// Configure transformers.js to use local cache
env.allowLocalModels = false
env.useBrowserCache = false

export interface LocalEmbeddingConfig {
  model: string              // Default: 'Xenova/all-MiniLM-L6-v2'
  batchSize: number          // Batch size for processing
}

export interface EmbeddingResult {
  embedding: number[]
  tokenCount?: number
}

export interface BatchEmbeddingResult {
  embeddings: number[][]
  totalTokens: number
  failedIndices: number[]
}

/**
 * Local Embedding Service using Transformers.js
 * 
 * Uses the all-MiniLM-L6-v2 model which produces 384-dimensional embeddings.
 * This model is:
 * - Fast and lightweight (~23MB)
 * - Runs locally without API calls
 * - Free and open-source
 * - Works perfectly with any text generation model (including Gemini)
 * - Optimized for semantic search and RAG applications
 */
export class LocalEmbeddingService {
  private config: LocalEmbeddingConfig
  private extractor: any = null
  private initPromise: Promise<void> | null = null

  constructor(config?: Partial<LocalEmbeddingConfig>) {
    this.config = {
      model: config?.model || 'Xenova/all-MiniLM-L6-v2',
      batchSize: config?.batchSize || 32
    }
  }

  /**
   * Initialize the embedding model (lazy loading)
   */
  private async initialize(): Promise<void> {
    if (this.extractor) {
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      console.log(`🔄 Loading embedding model: ${this.config.model}...`)
      this.extractor = await pipeline('feature-extraction', this.config.model)
      console.log(`✅ Embedding model loaded successfully`)
    })()

    return this.initPromise
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty')
    }

    await this.initialize()

    try {
      // Generate embedding
      const output = await this.extractor(text, {
        pooling: 'mean',
        normalize: true
      })

      // Convert to array - handle tensor output properly
      let embedding: number[]
      
      // Try different methods to extract the embedding
      if (output && typeof output.tolist === 'function') {
        // Method 1: Use tolist() if available (preferred)
        const result = output.tolist()
        embedding = Array.isArray(result[0]) ? result[0] : result
      } else if (output && output.data) {
        // Method 2: Extract from data property
        const tensorData = output.data
        if (tensorData instanceof Float32Array) {
          embedding = Array.from(tensorData)
        } else if (typeof tensorData[Symbol.iterator] === 'function') {
          // It's iterable, convert to array
          embedding = Array.from(tensorData)
        } else {
          throw new Error(`Unexpected tensor data type: ${typeof tensorData}`)
        }
      } else if (Array.isArray(output)) {
        // Method 3: Already an array
        embedding = output
      } else {
        throw new Error(`Unexpected output format from embedding model`)
      }

      return {
        embedding,
        tokenCount: this.estimateTokenCount(text)
      }
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty')
    }

    // Filter out empty texts and track their indices
    const validTexts: { text: string; originalIndex: number }[] = []
    const failedIndices: number[] = []

    texts.forEach((text, index) => {
      if (text && text.trim().length > 0) {
        validTexts.push({ text: text.trim(), originalIndex: index })
      } else {
        failedIndices.push(index)
      }
    })

    if (validTexts.length === 0) {
      return {
        embeddings: [],
        totalTokens: 0,
        failedIndices
      }
    }

    await this.initialize()

    const embeddings: number[][] = []
    let totalTokens = 0

    // Process in batches
    for (let i = 0; i < validTexts.length; i += this.config.batchSize) {
      const batch = validTexts.slice(i, i + this.config.batchSize)
      
      console.log(`🔄 Processing embedding batch ${Math.floor(i / this.config.batchSize) + 1}/${Math.ceil(validTexts.length / this.config.batchSize)} (${batch.length} texts)`)

      try {
        // Process batch
        for (const item of batch) {
          try {
            const result = await this.generateEmbedding(item.text)
            embeddings.push(result.embedding)
            totalTokens += result.tokenCount || 0
          } catch (error) {
            console.error(`❌ Failed to generate embedding for text at index ${item.originalIndex}:`, error)
            failedIndices.push(item.originalIndex)
          }
        }
      } catch (error) {
        console.error(`❌ Batch processing failed for batch starting at index ${i}:`, error)
        
        // Mark all items in this batch as failed
        batch.forEach(item => {
          failedIndices.push(item.originalIndex)
        })
      }
    }

    return {
      embeddings,
      totalTokens,
      failedIndices: Array.from(new Set(failedIndices)).sort()
    }
  }

  /**
   * Generate embedding for a search query (alias for generateEmbedding)
   */
  async embedQuery(query: string): Promise<number[]> {
    const result = await this.generateEmbedding(query)
    return result.embedding
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4)
  }

  /**
   * Get model information
   */
  getModelInfo(): {
    model: string
    dimensions: number
    batchSize: number
    description: string
  } {
    return {
      model: this.config.model,
      dimensions: 384, // all-MiniLM-L6-v2 produces 384-dimensional embeddings
      batchSize: this.config.batchSize,
      description: 'Local embedding model using Transformers.js - fast, free, and runs offline'
    }
  }

  /**
   * Check if model is initialized
   */
  isInitialized(): boolean {
    return this.extractor !== null
  }
}

// Export a default instance for convenience
export const localEmbeddingService = new LocalEmbeddingService()
