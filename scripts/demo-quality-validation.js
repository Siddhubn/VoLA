#!/usr/bin/env node

/**
 * Demo Script: Quality Validation System
 * 
 * This script demonstrates the quality validation features by:
 * 1. Validating sample content with different quality levels
 * 2. Showing quality scores and recommendations
 * 3. Demonstrating the flagging system
 */

// Sample content with different quality levels
const samples = [
  {
    name: 'High Quality Technical Content',
    content: `
      Electrical safety procedures require proper understanding of voltage, current, and resistance.
      Before starting any installation work, verify that all circuits are de-energized using a voltage tester.
      Use a multimeter to measure voltage levels and ensure they are within safe operating ranges of 110-240V.
      Ground fault circuit interrupters (GFCIs) provide protection against electrical shock by detecting current imbalances.
      Always follow the National Electrical Code (NEC) guidelines for residential wiring installations.
      Proper wire sizing is critical for preventing overheating and fire hazards in electrical systems.
      Circuit breakers should be rated appropriately for the connected load, typically 15A or 20A for residential circuits.
    `
  },
  {
    name: 'Medium Quality Content',
    content: `
      Safety is important in electrical work. Always check circuits before working.
      Use proper tools and equipment. Follow safety guidelines.
      Wear protective gear when necessary.
    `
  },
  {
    name: 'Low Quality Content (Too Short)',
    content: 'Safety first.'
  },
  {
    name: 'Low Quality Content (High Repetition)',
    content: 'test test test test test test test test test test test test test test test test test test test test'
  },
  {
    name: 'Low Quality Content (No Technical Terms)',
    content: `
      This is some generic text that does not contain any technical information.
      It is just a bunch of words without any specific meaning or purpose.
      There are no numbers or special characters here either.
    `
  }
]

// Simple quality validator (mimics the TypeScript implementation)
class SimpleQualityValidator {
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
      'voltage', 'current', 'resistance', 'circuit', 'electrical',
      'safety', 'equipment', 'installation', 'wire', 'breaker'
    ]
    const hasTechnicalTerms = technicalTerms.some(term => 
      content.toLowerCase().includes(term)
    )

    const repetitionScore = this.calculateRepetition(words)
    const overallScore = this.calculateOverallScore({
      contentLength,
      wordCount,
      hasTechnicalTerms,
      hasNumbers,
      hasSpecialChars,
      repetitionScore,
      avgWordsPerSentence
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
      overallScore
    }
  }

  calculateRepetition(words) {
    if (words.length === 0) return 0
    const wordFreq = new Map()
    
    for (const word of words.map(w => w.toLowerCase())) {
      if (word.length <= 2) continue
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }

    let repeatedCount = 0
    for (const count of wordFreq.values()) {
      if (count > 1) repeatedCount += count - 1
    }

    return Math.min(repeatedCount / words.length, 1)
  }

  calculateOverallScore(metrics) {
    let score = 0

    // Length score (0.2)
    if (metrics.contentLength >= 100 && metrics.contentLength <= 5000) {
      score += 0.2
    } else if (metrics.contentLength < 100) {
      score += 0.1 * (metrics.contentLength / 100)
    } else {
      score += 0.1
    }

    // Sentence structure (0.15)
    if (metrics.avgWordsPerSentence >= 5 && metrics.avgWordsPerSentence <= 50) {
      score += 0.15
    } else {
      score += 0.05
    }

    // Technical content (0.25)
    if (metrics.hasTechnicalTerms) score += 0.1
    if (metrics.hasNumbers) score += 0.08
    if (metrics.hasSpecialChars) score += 0.07

    // Repetition (0.2)
    score += 0.2 * (1 - metrics.repetitionScore)

    // Readability (0.2) - simplified
    score += 0.15

    return score
  }

  getQualityStatus(score) {
    if (score >= 0.85) return 'excellent'
    if (score >= 0.7) return 'good'
    if (score >= 0.6) return 'fair'
    if (score >= 0.4) return 'poor'
    return 'needs_review'
  }

  generateFlags(metrics) {
    return {
      tooShort: metrics.contentLength < 100,
      highRepetition: metrics.repetitionScore > 0.3,
      noTechnicalContent: !metrics.hasTechnicalTerms && !metrics.hasNumbers,
      needsReview: metrics.overallScore < 0.6
    }
  }

  generateRecommendations(flags) {
    const recommendations = []
    if (flags.tooShort) recommendations.push('Content is too short. Consider merging with adjacent chunks.')
    if (flags.highRepetition) recommendations.push('High word repetition detected. Verify content is not duplicated.')
    if (flags.noTechnicalContent) recommendations.push('No technical terms or numbers found. Verify this is educational content.')
    if (flags.needsReview) recommendations.push('Quality score is below threshold. Manual review recommended.')
    return recommendations
  }
}

// Demo function
function runDemo() {
  console.log('🔍 Quality Validation System Demo\n')
  console.log('=' .repeat(80))
  console.log()

  const validator = new SimpleQualityValidator()

  samples.forEach((sample, index) => {
    console.log(`\n📄 Sample ${index + 1}: ${sample.name}`)
    console.log('-'.repeat(80))
    
    const metrics = validator.calculateMetrics(sample.content)
    const flags = validator.generateFlags(metrics)
    const status = validator.getQualityStatus(metrics.overallScore)
    const recommendations = validator.generateRecommendations(flags)

    console.log(`\n📊 Metrics:`)
    console.log(`   Content Length:    ${metrics.contentLength} characters`)
    console.log(`   Word Count:        ${metrics.wordCount} words`)
    console.log(`   Sentence Count:    ${metrics.sentenceCount}`)
    console.log(`   Avg Words/Sentence: ${metrics.avgWordsPerSentence.toFixed(1)}`)
    console.log(`   Technical Terms:   ${metrics.hasTechnicalTerms ? '✅' : '❌'}`)
    console.log(`   Has Numbers:       ${metrics.hasNumbers ? '✅' : '❌'}`)
    console.log(`   Special Chars:     ${metrics.hasSpecialChars ? '✅' : '❌'}`)
    console.log(`   Repetition Score:  ${(metrics.repetitionScore * 100).toFixed(1)}%`)

    console.log(`\n⭐ Quality Score: ${(metrics.overallScore * 100).toFixed(1)}%`)
    console.log(`📋 Status: ${status.toUpperCase()}`)

    console.log(`\n🚩 Flags:`)
    console.log(`   Too Short:         ${flags.tooShort ? '⚠️  YES' : '✅ NO'}`)
    console.log(`   High Repetition:   ${flags.highRepetition ? '⚠️  YES' : '✅ NO'}`)
    console.log(`   No Technical:      ${flags.noTechnicalContent ? '⚠️  YES' : '✅ NO'}`)
    console.log(`   Needs Review:      ${flags.needsReview ? '⚠️  YES' : '✅ NO'}`)

    if (recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`)
      recommendations.forEach(rec => {
        console.log(`   • ${rec}`)
      })
    } else {
      console.log(`\n✅ No recommendations - content quality is good!`)
    }

    console.log()
  })

  console.log('=' .repeat(80))
  console.log('\n✅ Demo complete!')
  console.log('\n📚 Next Steps:')
  console.log('   1. Run validation on your chunks: node scripts/validate-quality.js')
  console.log('   2. View the dashboard: http://localhost:3000/quality')
  console.log('   3. Review flagged chunks and approve/reject them')
  console.log()
}

// Run the demo
runDemo()
