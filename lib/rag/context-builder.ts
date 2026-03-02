import { VectorSearchService, SearchResult } from './vector-search'

export interface QuizContext {
  course: 'fitter' | 'electrician'
  module: string
  relevantContent: string
  sources: Array<{
    section: string | null
    pageNumber: number | null
    pdfSource: string
  }>
  chunkCount: number
}

export interface ChatContext {
  course?: 'fitter' | 'electrician'
  module?: string
  query: string
  relevantContent: string
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  sources: Array<{
    section: string | null
    pageNumber: number | null
    pdfSource: string
    similarity: number
    tradeType?: string
  }>
  chunkCount: number
}

export interface SyllabusContext {
  course: 'fitter' | 'electrician'
  module?: string
  modules: Array<{
    name: string
    description: string
    topics: string[]
    chunkCount: number
    pageReferences: number[]
  }>
}

export interface ContextBuilderConfig {
  maxContextLength?: number      // Maximum characters in context (default: 4000)
  maxChunks?: number             // Maximum chunks to include (default: 5)
  includeMetadata?: boolean      // Include source metadata (default: true)
  vectorSearchService?: VectorSearchService
}

export class ContextBuilder {
  private config: Required<ContextBuilderConfig>
  private vectorSearchService: VectorSearchService

  constructor(config?: ContextBuilderConfig) {
    this.config = {
      maxContextLength: config?.maxContextLength || 4000,
      maxChunks: config?.maxChunks || 5,
      includeMetadata: config?.includeMetadata !== false,
      vectorSearchService: config?.vectorSearchService || new VectorSearchService()
    }
    
    this.vectorSearchService = this.config.vectorSearchService
  }

  /**
   * Build context for quiz generation
   * Retrieves relevant content for a specific course and module
   */
  async buildQuizContext(
    course: 'fitter' | 'electrician',
    module: string,
    options?: {
      topK?: number
      minSimilarity?: number
    }
  ): Promise<QuizContext> {
    // Search for content related to the module
    const searchQuery = `${module} ${course} training content`
    
    const searchResults = await this.vectorSearchService.search({
      query: searchQuery,
      course,
      module,
      topK: options?.topK || this.config.maxChunks,
      minSimilarity: options?.minSimilarity || 0.6
    })

    // Format the content
    const relevantContent = this.formatChunksForContext(searchResults)

    // Extract sources
    const sources = searchResults.map(result => ({
      section: result.source.section,
      pageNumber: result.source.pageNumber,
      pdfSource: result.source.pdfSource
    }))

    return {
      course,
      module,
      relevantContent,
      sources,
      chunkCount: searchResults.length
    }
  }

  /**
   * Build context for chatbot responses
   * Retrieves relevant content based on user query
   */
  async buildChatContext(
    query: string,
    options?: {
      course?: 'fitter' | 'electrician'
      module?: string
      tradeType?: 'trade_theory' | 'trade_practical'
      conversationHistory?: Array<{
        role: 'user' | 'assistant'
        content: string
      }>
      topK?: number
      minSimilarity?: number
    }
  ): Promise<ChatContext> {
    // Search for relevant content
    const searchResults = await this.vectorSearchService.search({
      query,
      course: options?.course,
      module: options?.module,
      tradeType: options?.tradeType,
      topK: options?.topK || this.config.maxChunks,
      minSimilarity: options?.minSimilarity || 0.7
    })

    // Format the content
    const relevantContent = this.formatChunksForContext(searchResults)

    // Extract sources with similarity scores
    const sources = searchResults.map(result => ({
      section: result.source.section,
      pageNumber: result.source.pageNumber,
      pdfSource: result.source.pdfSource,
      similarity: result.similarity,
      tradeType: result.source.tradeType
    }))

    return {
      course: options?.course,
      module: options?.module,
      query,
      relevantContent,
      conversationHistory: options?.conversationHistory,
      sources,
      chunkCount: searchResults.length
    }
  }

  /**
   * Build context for syllabus explorer
   * Retrieves module structure and content overview
   */
  async buildSyllabusContext(
    course: 'fitter' | 'electrician',
    module?: string
  ): Promise<SyllabusContext> {
    // If specific module requested, get its content
    if (module) {
      const searchResults = await this.vectorSearchService.search({
        query: `${module} overview topics`,
        course,
        module,
        topK: 10,
        minSimilarity: 0.5
      })

      // Extract topics from content
      const topics = this.extractTopics(searchResults)
      const pageReferences = this.extractPageNumbers(searchResults)

      return {
        course,
        module,
        modules: [{
          name: module,
          description: this.generateModuleDescription(searchResults),
          topics,
          chunkCount: searchResults.length,
          pageReferences
        }]
      }
    }

    // Otherwise, get overview of all modules for the course
    const searchResults = await this.vectorSearchService.search({
      query: `${course} course modules overview`,
      course,
      topK: 20,
      minSimilarity: 0.5
    })

    // Group by module
    const moduleMap = new Map<string, SearchResult[]>()
    searchResults.forEach(result => {
      const moduleName = result.source.module || 'general'
      if (!moduleMap.has(moduleName)) {
        moduleMap.set(moduleName, [])
      }
      moduleMap.get(moduleName)!.push(result)
    })

    // Build module summaries
    const modules = Array.from(moduleMap.entries()).map(([moduleName, chunks]) => ({
      name: moduleName,
      description: this.generateModuleDescription(chunks),
      topics: this.extractTopics(chunks),
      chunkCount: chunks.length,
      pageReferences: this.extractPageNumbers(chunks)
    }))

    return {
      course,
      modules
    }
  }

  /**
   * Format search results into a coherent context string
   */
  private formatChunksForContext(chunks: SearchResult[]): string {
    if (chunks.length === 0) {
      return 'No relevant content found.'
    }

    let context = ''
    let currentLength = 0

    for (const chunk of chunks) {
      // Add chunk content
      let chunkText = chunk.content

      // Add metadata if enabled
      if (this.config.includeMetadata && chunk.source.section) {
        chunkText = `[${chunk.source.section}]\n${chunkText}`
      }

      // Check if adding this chunk would exceed max length
      if (currentLength + chunkText.length > this.config.maxContextLength) {
        // Truncate if needed
        const remainingSpace = this.config.maxContextLength - currentLength
        if (remainingSpace > 100) {
          chunkText = chunkText.substring(0, remainingSpace) + '...'
          context += chunkText + '\n\n'
        }
        break
      }

      context += chunkText + '\n\n'
      currentLength += chunkText.length + 2
    }

    return context.trim()
  }

  /**
   * Extract topics from search results
   */
  private extractTopics(chunks: SearchResult[]): string[] {
    const topics = new Set<string>()

    chunks.forEach(chunk => {
      // Extract section names as topics
      if (chunk.source.section) {
        topics.add(chunk.source.section)
      }

      // Extract potential topics from content (simple heuristic)
      // Look for capitalized phrases that might be topics
      const matches = chunk.content.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g)
      if (matches) {
        matches.forEach(match => {
          if (match.length > 3 && match.length < 50) {
            topics.add(match)
          }
        })
      }
    })

    return Array.from(topics).slice(0, 10) // Limit to 10 topics
  }

  /**
   * Extract unique page numbers from search results
   */
  private extractPageNumbers(chunks: SearchResult[]): number[] {
    const pages = new Set<number>()

    chunks.forEach(chunk => {
      if (chunk.source.pageNumber) {
        pages.add(chunk.source.pageNumber)
      }
    })

    return Array.from(pages).sort((a, b) => a - b)
  }

  /**
   * Generate a module description from chunks
   */
  private generateModuleDescription(chunks: SearchResult[]): string {
    if (chunks.length === 0) {
      return 'No description available.'
    }

    // Use the first chunk's content as a base description
    const firstChunk = chunks[0].content

    // Take first 200 characters as description
    let description = firstChunk.substring(0, 200)

    // Try to end at a sentence boundary
    const lastPeriod = description.lastIndexOf('.')
    if (lastPeriod > 100) {
      description = description.substring(0, lastPeriod + 1)
    } else {
      description += '...'
    }

    return description
  }

  /**
   * Format conversation history for context
   */
  formatConversationHistory(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    maxMessages: number = 5
  ): string {
    if (!history || history.length === 0) {
      return ''
    }

    // Take last N messages
    const recentHistory = history.slice(-maxMessages)

    return recentHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n')
  }

  /**
   * Get configuration
   */
  getConfig(): Required<ContextBuilderConfig> {
    return { ...this.config }
  }
}

// Export a default instance for convenience
export const contextBuilder = new ContextBuilder()
