import { GoogleGenerativeAI } from '@google/generative-ai'

export interface EmbeddingConfig {
  model: string              // 'text-embedding-004'
  batchSize: number          // Batch size for API calls
  retryAttempts: number      // Number of retry attempts
  initialDelay: number       // Initial delay for exponential backoff (ms)
  maxDelay: number           // Maximum delay for exponential backoff (ms)
  rateLimit: {
    requestsPerMinute: number
    requestsPerDay: number
  }
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

interface RateLimitState {
  requestsThisMinute: number
  requestsToday: number
  minuteResetTime: number
  dayResetTime: number
}

export class EmbeddingService {
  private genAI: GoogleGenerativeAI
  private config: EmbeddingConfig
  private rateLimitState: RateLimitState

  constructor(config?: Partial<EmbeddingConfig>) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required')
    }

    this.genAI = new GoogleGenerativeAI(apiKey)
    
    this.config = {
      model: config?.model || 'text-embedding-004',
      batchSize: config?.batchSize || 100,
      retryAttempts: config?.retryAttempts || 3,
      initialDelay: config?.initialDelay || 1000,
      maxDelay: config?.maxDelay || 10000,
      rateLimit: {
        requestsPerMinute: config?.rateLimit?.requestsPerMinute || 60,
        requestsPerDay: config?.rateLimit?.requestsPerDay || 1000,
        ...config?.rateLimit
      }
    }

    // Initialize rate limit state
    const now = Date.now()
    this.rateLimitState = {
      requestsThisMinute: 0,
      requestsToday: 0,
      minuteResetTime: now + 60000, // 1 minute from now
      dayResetTime: now + 86400000  // 24 hours from now
    }
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty')
    }

    return this.withRetry(async () => {
      await this.checkRateLimit()
      
      const model = this.genAI.getGenerativeModel({ model: this.config.model })
      const result = await model.embedContent(text)
      
      this.updateRateLimitState()
      
      return {
        embedding: result.embedding.values,
        tokenCount: this.estimateTokenCount(text)
      }
    })
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

    const embeddings: number[][] = []
    let totalTokens = 0

    // Process in batches
    for (let i = 0; i < validTexts.length; i += this.config.batchSize) {
      const batch = validTexts.slice(i, i + this.config.batchSize)
      
      console.log(`🔄 Processing embedding batch ${Math.floor(i / this.config.batchSize) + 1}/${Math.ceil(validTexts.length / this.config.batchSize)} (${batch.length} texts)`)

      try {
        const batchResults = await this.processBatch(batch.map(item => item.text))
        
        // Add successful embeddings to results
        batchResults.embeddings.forEach((embedding, batchIndex) => {
          if (embedding && embedding.length > 0) {
            embeddings.push(embedding)
          } else {
            failedIndices.push(batch[batchIndex].originalIndex)
          }
        })

        totalTokens += batchResults.totalTokens

        // Add any failed indices from this batch
        batchResults.failedIndices.forEach(batchIndex => {
          failedIndices.push(batch[batchIndex].originalIndex)
        })

      } catch (error) {
        console.error(`❌ Batch processing failed for batch starting at index ${i}:`, error)
        
        // Mark all items in this batch as failed
        batch.forEach(item => {
          failedIndices.push(item.originalIndex)
        })
      }

      // Add delay between batches to respect rate limits
      if (i + this.config.batchSize < validTexts.length) {
        await this.delay(1000) // 1 second delay between batches
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
   * Process a single batch of texts
   */
  private async processBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const embeddings: number[][] = []
    let totalTokens = 0
    const failedIndices: number[] = []

    for (let i = 0; i < texts.length; i++) {
      try {
        const result = await this.generateEmbedding(texts[i])
        embeddings.push(result.embedding)
        totalTokens += result.tokenCount || 0
      } catch (error) {
        console.error(`❌ Failed to generate embedding for text ${i}:`, error)
        failedIndices.push(i)
        // Don't push empty array, just skip this embedding
      }
    }

    return {
      embeddings,
      totalTokens,
      failedIndices
    }
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined
    let delay = this.config.initialDelay

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === this.config.retryAttempts) {
          break
        }

        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          console.warn(`⚠️ Rate limit hit, waiting ${delay}ms before retry ${attempt}/${this.config.retryAttempts}`)
        } else {
          console.warn(`⚠️ API error, retrying in ${delay}ms (attempt ${attempt}/${this.config.retryAttempts}):`, error)
        }

        await this.delay(delay)
        
        // Exponential backoff with jitter
        delay = Math.min(delay * 2 + Math.random() * 1000, this.config.maxDelay)
      }
    }

    throw new Error(`Failed after ${this.config.retryAttempts} attempts: ${lastError?.message || 'Unknown error'}`)
  }

  /**
   * Check and enforce rate limits
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now()

    // Reset counters if time windows have passed
    if (now >= this.rateLimitState.minuteResetTime) {
      this.rateLimitState.requestsThisMinute = 0
      this.rateLimitState.minuteResetTime = now + 60000
    }

    if (now >= this.rateLimitState.dayResetTime) {
      this.rateLimitState.requestsToday = 0
      this.rateLimitState.dayResetTime = now + 86400000
    }

    // Check if we've hit rate limits
    if (this.rateLimitState.requestsThisMinute >= this.config.rateLimit.requestsPerMinute) {
      const waitTime = this.rateLimitState.minuteResetTime - now
      console.warn(`⚠️ Rate limit reached (${this.config.rateLimit.requestsPerMinute}/min). Waiting ${waitTime}ms`)
      await this.delay(waitTime)
      
      // Reset after waiting
      this.rateLimitState.requestsThisMinute = 0
      this.rateLimitState.minuteResetTime = Date.now() + 60000
    }

    if (this.rateLimitState.requestsToday >= this.config.rateLimit.requestsPerDay) {
      const waitTime = this.rateLimitState.dayResetTime - now
      throw new Error(`Daily rate limit reached (${this.config.rateLimit.requestsPerDay}/day). Try again in ${Math.ceil(waitTime / 3600000)} hours`)
    }
  }

  /**
   * Update rate limit state after successful request
   */
  private updateRateLimitState(): void {
    this.rateLimitState.requestsThisMinute++
    this.rateLimitState.requestsToday++
  }

  /**
   * Check if error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || ''
    return errorMessage.includes('rate limit') || 
           errorMessage.includes('quota') || 
           errorMessage.includes('too many requests') ||
           error?.status === 429
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4)
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): {
    requestsThisMinute: number
    requestsToday: number
    minuteLimit: number
    dayLimit: number
    minuteResetIn: number
    dayResetIn: number
  } {
    const now = Date.now()
    return {
      requestsThisMinute: this.rateLimitState.requestsThisMinute,
      requestsToday: this.rateLimitState.requestsToday,
      minuteLimit: this.config.rateLimit.requestsPerMinute,
      dayLimit: this.config.rateLimit.requestsPerDay,
      minuteResetIn: Math.max(0, this.rateLimitState.minuteResetTime - now),
      dayResetIn: Math.max(0, this.rateLimitState.dayResetTime - now)
    }
  }

  /**
   * Get embedding statistics
   */
  getStats(): {
    config: EmbeddingConfig
    rateLimitStatus: ReturnType<EmbeddingService['getRateLimitStatus']>
  } {
    return {
      config: this.config,
      rateLimitStatus: this.getRateLimitStatus()
    }
  }
}

// Note: Default instance removed to avoid initialization issues in tests