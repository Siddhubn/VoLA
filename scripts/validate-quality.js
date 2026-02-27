#!/usr/bin/env node

/**
 * Quality Validation Script
 * 
 * This script validates the quality of all chunks in the knowledge base
 * and stores the results in the database.
 * 
 * Usage:
 *   node scripts/validate-quality.js
 *   node scripts/validate-quality.js --course fitter
 *   node scripts/validate-quality.js --course electrician
 */

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables')
  process.exit(1)
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Quality validation logic (simplified version of the TypeScript implementation)
class QualityValidator {
  constructor(config = {}) {
    this.config = {
      minContentLength: config.minContentLength || 100,
      maxContentLength: config.maxContentLength || 5000,
      minWordsPerSentence: config.minWordsPerSentence || 5,
      maxWordsPerSentence: config.maxWordsPerSentence || 50,
      repetitionThreshold: config.repetitionThreshold || 0.3,
      minQualityScore: config.minQualityScore || 0.6
    }
  }

  calculateMetrics(content) {
    const contentLength = content.length
    const words = content.trim().split(/\s+/).filter(w => w.length > 0)
    const wordCount = words.length

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const sentenceCount = sentences.length || 1
    const avgWordsPerSentence = wordCount / sentenceCount

    const hasSpecialChars = /[()[\]{}<>@#$%^&*+=|\\\/]/.test(content)
    const hasNumbers = /\d/.test(content)

    const technicalTerms = [
      'measurement', 'tool', 'safety', 'equipment', 'procedure', 'specification',
      'tolerance', 'calibration', 'maintenance', 'installation', 'operation',
      'voltage', 'current', 'resistance', 'circuit', 'wire', 'cable',
      'fitting', 'welding', 'cutting', 'drilling', 'machining', 'assembly'
    ]
    const hasTechnicalTerms = technicalTerms.some(term => 
      content.toLowerCase().includes(term)
    )

    const repetitionScore = this.calculateRepetition(words)
    const readabilityScore = this.calculateReadability(wordCount, sentenceCount, content)
    const overallScore = this.calculateOverallScore({
      contentLength,
      wordCount,
      sentenceCount,
      avgWordsPerSentence,
      hasSpecialChars,
      hasNumbers,
      hasTechnicalTerms,
      repetitionScore,
      readabilityScore
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

  calculateRepetition(words) {
    if (words.length === 0) return 0

    const wordFreq = new Map()
    const normalizedWords = words.map(w => w.toLowerCase())

    for (const word of normalizedWords) {
      if (word.length <= 2) continue
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }

    let repeatedCount = 0
    for (const count of wordFreq.values()) {
      if (count > 1) {
        repeatedCount += count - 1
      }
    }

    return Math.min(repeatedCount / words.length, 1)
  }

  calculateReadability(wordCount, sentenceCount, content) {
    if (wordCount === 0 || sentenceCount === 0) return 0

    const avgWordsPerSentence = wordCount / sentenceCount
    const syllableCount = this.estimateSyllables(content)
    const avgSyllablesPerWord = syllableCount / wordCount

    const flesch = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord
    return Math.max(0, Math.min(1, flesch / 100))
  }

  estimateSyllables(text) {
    const words = text.toLowerCase().split(/\s+/)
    let syllables = 0

    for (const word of words) {
      const vowelGroups = word.match(/[aeiouy]+/g)
      syllables += vowelGroups ? vowelGroups.length : 1
    }

    return syllables
  }

  calculateOverallScore(metrics) {
    let score = 0

    // Length score (0.2 weight)
    if (metrics.contentLength >= this.config.minContentLength && 
        metrics.contentLength <= this.config.maxContentLength) {
      score += 0.2
    } else if (metrics.contentLength < this.config.minContentLength) {
      score += 0.1 * (metrics.contentLength / this.config.minContentLength)
    } else {
      score += 0.1
    }

    // Sentence structure score (0.15 weight)
    if (metrics.avgWordsPerSentence >= this.config.minWordsPerSentence &&
        metrics.avgWordsPerSentence <= this.config.maxWordsPerSentence) {
      score += 0.15
    } else {
      score += 0.05
    }

    // Technical content score (0.25 weight)
    let technicalScore = 0
    if (metrics.hasTechnicalTerms) technicalScore += 0.1
    if (metrics.hasNumbers) technicalScore += 0.08
    if (metrics.hasSpecialChars) technicalScore += 0.07
    score += technicalScore

    // Repetition score (0.2 weight)
    score += 0.2 * (1 - metrics.repetitionScore)

    // Readability score (0.2 weight)
    score += 0.2 * metrics.readabilityScore

    return score
  }

  generateFlags(metrics) {
    const flags = {
      tooShort: metrics.contentLength < this.config.minContentLength,
      tooLong: metrics.contentLength > this.config.maxContentLength,
      highRepetition: metrics.repetitionScore > this.config.repetitionThreshold,
      lowReadability: metrics.readabilityScore < 0.3,
      suspiciousContent: false,
      needsReview: false
    }

    flags.suspiciousContent = this.detectSuspiciousContent(metrics)
    flags.needsReview = 
      flags.tooShort || 
      flags.tooLong || 
      flags.highRepetition || 
      flags.lowReadability || 
      flags.suspiciousContent ||
      metrics.overallScore < this.config.minQualityScore

    return flags
  }

  detectSuspiciousContent(metrics) {
    if (metrics.contentLength > 200 && metrics.wordCount < 20) return true
    if (metrics.repetitionScore > 0.7) return true
    if (metrics.avgWordsPerSentence < 3) return true
    return false
  }

  getQualityStatus(score) {
    if (score >= 0.85) return 'excellent'
    if (score >= 0.7) return 'good'
    if (score >= 0.6) return 'fair'
    if (score >= 0.4) return 'poor'
    return 'needs_review'
  }

  generateRecommendations(flags, metrics) {
    const recommendations = []

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
}

async function validateAllChunks(course = null) {
  console.log('🔍 Starting quality validation...\n')

  const validator = new QualityValidator()

  try {
    // Fetch chunks
    let query = 'SELECT id, content, course, module FROM knowledge_chunks'
    const params = []
    
    if (course) {
      query += ' WHERE course = $1'
      params.push(course)
    }

    const result = await pool.query(query, params)
    const chunks = result.rows

    console.log(`📊 Found ${chunks.length} chunks to validate\n`)

    const stats = {
      total: chunks.length,
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      needsReview: 0
    }

    let processed = 0

    for (const chunk of chunks) {
      const metrics = validator.calculateMetrics(chunk.content)
      const flags = validator.generateFlags(metrics)
      const status = validator.getQualityStatus(metrics.overallScore)
      const recommendations = validator.generateRecommendations(flags, metrics)

      // Store quality data
      const qualityData = {
        quality: {
          score: metrics.overallScore,
          status,
          metrics,
          flags,
          recommendations,
          validated_at: new Date().toISOString()
        }
      }

      await pool.query(
        `UPDATE knowledge_chunks 
         SET metadata = metadata || $1::jsonb
         WHERE id = $2`,
        [JSON.stringify(qualityData), chunk.id]
      )

      // Update stats
      switch (status) {
        case 'excellent': stats.excellent++; break
        case 'good': stats.good++; break
        case 'fair': stats.fair++; break
        case 'poor': stats.poor++; break
        case 'needs_review': stats.needsReview++; break
      }

      processed++
      if (processed % 10 === 0) {
        process.stdout.write(`\r✅ Processed ${processed}/${chunks.length} chunks`)
      }
    }

    console.log(`\n\n✅ Quality validation complete!\n`)
    console.log('📊 Results:')
    console.log(`   Total:        ${stats.total}`)
    console.log(`   Excellent:    ${stats.excellent} (${((stats.excellent/stats.total)*100).toFixed(1)}%)`)
    console.log(`   Good:         ${stats.good} (${((stats.good/stats.total)*100).toFixed(1)}%)`)
    console.log(`   Fair:         ${stats.fair} (${((stats.fair/stats.total)*100).toFixed(1)}%)`)
    console.log(`   Poor:         ${stats.poor} (${((stats.poor/stats.total)*100).toFixed(1)}%)`)
    console.log(`   Needs Review: ${stats.needsReview} (${((stats.needsReview/stats.total)*100).toFixed(1)}%)`)

  } catch (error) {
    console.error('❌ Error during validation:', error.message)
    throw error
  }
}

async function main() {
  const args = process.argv.slice(2)
  let course = null

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--course' && args[i + 1]) {
      course = args[i + 1]
      if (!['fitter', 'electrician'].includes(course)) {
        console.error('❌ Invalid course. Must be "fitter" or "electrician"')
        process.exit(1)
      }
    }
  }

  try {
    await validateAllChunks(course)
  } catch (error) {
    console.error('❌ Validation failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
