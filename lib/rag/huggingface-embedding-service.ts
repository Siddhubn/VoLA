/**
 * HuggingFace Embedding Service
 * 
 * Uses HuggingFace's FREE Inference API for embeddings.
 * Model: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
 * 
 * Get your FREE API key at: https://huggingface.co/settings/tokens
 * No credit card required!
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

export class HuggingFaceEmbeddingService {
  private apiKey: string
  private model: string
  private apiUrl: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || ''
    this.model = model || 'sentence-transformers/all-MiniLM-L6-v2'
    this.apiUrl = `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`

    if (!this.apiKey) {
      throw new Error('HUGGINGFACE_API_KEY environment variable is required. Get your FREE key at: https://huggingface.co/settings/tokens')
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty')
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text,
          options: {
            wait_for_model: true
          }
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`HuggingFace API error: ${response.status} - ${error}`)
      }

      const embedding = await response.json()

      return {
        embedding: Array.isArray(embedding[0]) ? embedding[0] : embedding,
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

    // Filter out empty texts
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

    const embeddings: number[][] = []
    let totalTokens = 0

    // Process in batches of 10 to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < validTexts.length; i += batchSize) {
      const batch = validTexts.slice(i, i + batchSize)
      
      console.log(`🔄 Processing embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validTexts.length / batchSize)} (${batch.length} texts)`)

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

      // Small delay between batches to respect rate limits
      if (i + batchSize < validTexts.length) {
        await this.delay(100)
      }
    }

    return {
      embeddings,
      totalTokens,
      failedIndices: Array.from(new Set(failedIndices)).sort()
    }
  }

  /**
   * Generate embedding for a search query
   */
  async embedQuery(query: string): Promise<number[]> {
    const result = await this.generateEmbedding(query)
    return result.embedding
  }

  /**
   * Get model information
   */
  getModelInfo(): {
    provider: string
    model: string
    dimensions: number
    description: string
  } {
    return {
      provider: 'HuggingFace',
      model: this.model,
      dimensions: 384,
      description: 'FREE HuggingFace Inference API - Perfect for RAG with Gemini'
    }
  }

  /**
   * Estimate token count
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export a default instance
export const huggingFaceEmbeddingService = new HuggingFaceEmbeddingService()
