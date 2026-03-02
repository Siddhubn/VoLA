import { query } from '../postgresql'

export interface QualityMetrics {
  contentLength: number
  wordCount: number
  sentenceCount: number
  avgWordsPerSentence: number
  hasSpecialChars: boolean
  hasNumbers: boolean
  hasTechnicalTerms: boolean
  repetitionScore: number
  readabilityScore: number
  overallScore: number
}

export interface QualityFlags {
  tooShort: boolean
  tooLong: boolean
  highRepetition: boolean
  lowReadability: boolean
  suspiciousContent: boolean
  needsReview: boolean
}

export interface ChunkQualityResult {
  chunkId: number
  metrics: QualityMetrics
  flags: QualityFlags
  qualityScore: number
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_review'
  recommendations: string[]
}

export interface QualityValidatorConfig {
  minContentLength?: number
  maxContentLength?: number
  minWordsPerSentence?: number
  maxWordsPerSentence?: number
  repetitionThreshold?: number
  minQualityScore?: number
}

export class QualityValidator {
  private config: Required<QualityValidatorConfig>

  constructor(config?: QualityValidatorConfig) {
    this.config = {
      minContentLength: config?.minContentLength || 100,
      maxContentLength: config?.maxContentLength || 5000,
      minWordsPerSentence: config?.minWordsPerSentence || 5,
      maxWordsPerSentence: config?.maxWordsPerSentence || 50,
      repetitionThreshold: config?.repetitionThreshold || 0.3,
      minQualityScore: config?.minQualityScore || 0.6
    }
  }

  /**
   * Calculate quality metrics for a text chunk
   */
  calculateMetrics(content: string): QualityMetrics {
    const contentLength = content.length
    const words = content.trim().split(/\s+/).filter(w => w.length > 0)
    const wordCount = words.length

    // Count sentences (simple heuristic)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const sentenceCount = sentences.length || 1
    const avgWordsPerSentence = wordCount / sentenceCount

    // Check for special characters (technical content often has these)
    const hasSpecialChars = /[()[\]{}<>@#$%^&*+=|\\\/]/.test(content)
    
    // Check for numbers (technical content often has measurements, dates, etc.)
    const hasNumbers = /\d/.test(content)

    // Check for technical terms (common in ITI content)
    const technicalTerms = [
      'measurement', 'tool', 'safety', 'equipment', 'procedure', 'specification',
      'tolerance', 'calibration', 'maintenance', 'installation', 'operation',
      'voltage', 'current', 'resistance', 'circuit', 'wire', 'cable',
      'fitting', 'welding', 'cutting', 'drilling', 'machining', 'assembly'
    ]
    const hasTechnicalTerms = technicalTerms.some(term => 
      content.toLowerCase().includes(term)
    )

    // Calculate repetition score (0 = no repetition, 1 = high repetition)
    const repetitionScore = this.calculateRepetition(words)

    // Calculate readability score (simplified Flesch reading ease)
    const readabilityScore = this.calculateReadability(wordCount, sentenceCount, content)

    // Calculate overall quality score (0-1)
    const overallScore = this.calculateOverallScore({
      contentLength,
      wordCount,
      sentenceCount,
      avgWordsPerSentence,
      hasSpecialChars,
      hasNumbers,
      hasTechnicalTerms,
      repetitionScore,
      readabilityScore,
      overallScore: 0 // Will be set below
    })

    return {
      contentLength,
      wordCount,
      sentenceCount,
      avgWordsPerSentence,
      hasSpecialChars,
      hasNumbers,
      hasTechnicalTerms,
      repetitionScore,
      readabilityScore,
      overallScore
    }
  }

  /**
   * Calculate repetition score based on word frequency
   */
  private calculateRepetition(words: string[]): number {
    if (words.length === 0) return 0

    const wordFreq = new Map<string, number>()
    const normalizedWords = words.map(w => w.toLowerCase())

    for (const word of normalizedWords) {
      // Skip very short words and common words
      if (word.length <= 2) continue
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }

    // Calculate repetition as ratio of repeated words
    let repeatedCount = 0
    for (const count of Array.from(wordFreq.values())) {
      if (count > 1) {
        repeatedCount += count - 1
      }
    }

    return Math.min(repeatedCount / words.length, 1)
  }

  /**
   * Calculate readability score (simplified)
   */
  private calculateReadability(wordCount: number, sentenceCount: number, content: string): number {
    if (wordCount === 0 || sentenceCount === 0) return 0

    const avgWordsPerSentence = wordCount / sentenceCount
    
    // Count syllables (rough approximation)
    const syllableCount = this.estimateSyllables(content)
    const avgSyllablesPerWord = syllableCount / wordCount

    // Simplified Flesch Reading Ease formula
    // Score ranges from 0 (very difficult) to 100 (very easy)
    const flesch = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord
    
    // Normalize to 0-1 range (assuming 0-100 input range)
    return Math.max(0, Math.min(1, flesch / 100))
  }

  /**
   * Estimate syllable count (rough approximation)
   */
  private estimateSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/)
    let syllables = 0

    for (const word of words) {
      // Count vowel groups
      const vowelGroups = word.match(/[aeiouy]+/g)
      syllables += vowelGroups ? vowelGroups.length : 1
    }

    return syllables
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(metrics: QualityMetrics): number {
    let score = 0
    let weights = 0

    // Length score (0.2 weight)
    if (metrics.contentLength >= this.config.minContentLength && 
        metrics.contentLength <= this.config.maxContentLength) {
      score += 0.2
    } else if (metrics.contentLength < this.config.minContentLength) {
      score += 0.1 * (metrics.contentLength / this.config.minContentLength)
    } else {
      score += 0.1
    }
    weights += 0.2

    // Sentence structure score (0.15 weight)
    if (metrics.avgWordsPerSentence >= this.config.minWordsPerSentence &&
        metrics.avgWordsPerSentence <= this.config.maxWordsPerSentence) {
      score += 0.15
    } else {
      score += 0.05
    }
    weights += 0.15

    // Technical content score (0.25 weight)
    let technicalScore = 0
    if (metrics.hasTechnicalTerms) technicalScore += 0.1
    if (metrics.hasNumbers) technicalScore += 0.08
    if (metrics.hasSpecialChars) technicalScore += 0.07
    score += technicalScore
    weights += 0.25

    // Repetition score (0.2 weight) - lower is better
    score += 0.2 * (1 - metrics.repetitionScore)
    weights += 0.2

    // Readability score (0.2 weight)
    score += 0.2 * metrics.readabilityScore
    weights += 0.2

    return score / weights
  }

  /**
   * Generate quality flags based on metrics
   */
  generateFlags(metrics: QualityMetrics): QualityFlags {
    const flags: QualityFlags = {
      tooShort: metrics.contentLength < this.config.minContentLength,
      tooLong: metrics.contentLength > this.config.maxContentLength,
      highRepetition: metrics.repetitionScore > this.config.repetitionThreshold,
      lowReadability: metrics.readabilityScore < 0.3,
      suspiciousContent: false,
      needsReview: false
    }

    // Check for suspicious patterns
    flags.suspiciousContent = this.detectSuspiciousContent(metrics)

    // Determine if needs review
    flags.needsReview = 
      flags.tooShort || 
      flags.tooLong || 
      flags.highRepetition || 
      flags.lowReadability || 
      flags.suspiciousContent ||
      metrics.overallScore < this.config.minQualityScore

    return flags
  }

  /**
   * Detect suspicious content patterns
   */
  private detectSuspiciousContent(metrics: QualityMetrics): boolean {
    // Very low word count relative to content length (lots of special chars)
    if (metrics.contentLength > 200 && metrics.wordCount < 20) {
      return true
    }

    // Extremely high repetition
    if (metrics.repetitionScore > 0.7) {
      return true
    }

    // Very short sentences (might be a list or table)
    if (metrics.avgWordsPerSentence < 3) {
      return true
    }

    return false
  }

  /**
   * Generate quality status
   */
  getQualityStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'needs_review' {
    if (score >= 0.85) return 'excellent'
    if (score >= 0.7) return 'good'
    if (score >= 0.6) return 'fair'
    if (score >= 0.4) return 'poor'
    return 'needs_review'
  }

  /**
   * Generate recommendations based on flags
   */
  generateRecommendations(flags: QualityFlags, metrics: QualityMetrics): string[] {
    const recommendations: string[] = []

    if (flags.tooShort) {
      recommendations.push('Content is too short. Consider merging with adjacent chunks.')
    }

    if (flags.tooLong) {
      recommendations.push('Content is too long. Consider splitting into smaller chunks.')
    }

    if (flags.highRepetition) {
      recommendations.push('High word repetition detected. Verify content is not duplicated.')
    }

    if (flags.lowReadability) {
      recommendations.push('Low readability score. Content may be overly complex or poorly formatted.')
    }

    if (flags.suspiciousContent) {
      recommendations.push('Suspicious content pattern detected. Manual review recommended.')
    }

    if (!metrics.hasTechnicalTerms && !metrics.hasNumbers) {
      recommendations.push('No technical terms or numbers found. Verify this is educational content.')
    }

    if (metrics.sentenceCount < 2) {
      recommendations.push('Very few sentences. Content may be a heading or list item.')
    }

    return recommendations
  }

  /**
   * Validate a single chunk
   */
  async validateChunk(chunkId: number, content: string): Promise<ChunkQualityResult> {
    const metrics = this.calculateMetrics(content)
    const flags = this.generateFlags(metrics)
    const status = this.getQualityStatus(metrics.overallScore)
    const recommendations = this.generateRecommendations(flags, metrics)

    return {
      chunkId,
      metrics,
      flags,
      qualityScore: metrics.overallScore,
      status,
      recommendations
    }
  }

  /**
   * Validate all chunks in the database
   */
  async validateAllChunks(): Promise<ChunkQualityResult[]> {
    const result = await query('SELECT id, content FROM knowledge_chunks')
    const chunks = result.rows

    const validationResults: ChunkQualityResult[] = []

    for (const chunk of chunks) {
      const validation = await this.validateChunk(chunk.id, chunk.content)
      validationResults.push(validation)
    }

    return validationResults
  }

  /**
   * Get chunks that need review
   */
  async getChunksNeedingReview(): Promise<ChunkQualityResult[]> {
    const allResults = await this.validateAllChunks()
    return allResults.filter(result => result.flags.needsReview)
  }

  /**
   * Store quality metrics in database
   */
  async storeQualityMetrics(chunkId: number, result: ChunkQualityResult): Promise<void> {
    await query(
      `UPDATE knowledge_chunks 
       SET metadata = metadata || $1::jsonb
       WHERE id = $2`,
      [
        JSON.stringify({
          quality: {
            score: result.qualityScore,
            status: result.status,
            metrics: result.metrics,
            flags: result.flags,
            recommendations: result.recommendations,
            validated_at: new Date().toISOString()
          }
        }),
        chunkId
      ]
    )
  }

  /**
   * Batch validate and store quality metrics
   */
  async batchValidateAndStore(): Promise<{
    total: number
    excellent: number
    good: number
    fair: number
    poor: number
    needsReview: number
  }> {
    const results = await this.validateAllChunks()

    const stats = {
      total: results.length,
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      needsReview: 0
    }

    for (const result of results) {
      await this.storeQualityMetrics(result.chunkId, result)

      switch (result.status) {
        case 'excellent': stats.excellent++; break
        case 'good': stats.good++; break
        case 'fair': stats.fair++; break
        case 'poor': stats.poor++; break
        case 'needs_review': stats.needsReview++; break
      }
    }

    return stats
  }
}

// Export a default instance
export const qualityValidator = new QualityValidator()
