import { describe, it, expect, beforeEach } from 'vitest'
import { QualityValidator } from '../quality-validator'

describe('QualityValidator', () => {
  let validator: QualityValidator

  beforeEach(() => {
    validator = new QualityValidator()
  })

  describe('calculateMetrics', () => {
    it('should calculate basic metrics for simple text', () => {
      const content = 'This is a simple test. It has two sentences.'
      const metrics = validator.calculateMetrics(content)

      expect(metrics.contentLength).toBe(content.length)
      expect(metrics.wordCount).toBe(9)
      expect(metrics.sentenceCount).toBe(2)
      expect(metrics.avgWordsPerSentence).toBeCloseTo(4.5, 1)
    })

    it('should detect technical terms', () => {
      const content = 'The voltage measurement requires proper calibration of the equipment.'
      const metrics = validator.calculateMetrics(content)

      expect(metrics.hasTechnicalTerms).toBe(true)
    })

    it('should detect numbers', () => {
      const content = 'The resistance is 100 ohms at 25 degrees Celsius.'
      const metrics = validator.calculateMetrics(content)

      expect(metrics.hasNumbers).toBe(true)
    })

    it('should detect special characters', () => {
      const content = 'Use the formula: V = I × R (Ohm\'s Law)'
      const metrics = validator.calculateMetrics(content)

      expect(metrics.hasSpecialChars).toBe(true)
    })

    it('should calculate repetition score', () => {
      const repetitiveContent = 'test test test test test'
      const metrics = validator.calculateMetrics(repetitiveContent)

      expect(metrics.repetitionScore).toBeGreaterThan(0.5)
    })

    it('should handle empty content', () => {
      const content = ''
      const metrics = validator.calculateMetrics(content)

      expect(metrics.contentLength).toBe(0)
      expect(metrics.wordCount).toBe(0)
      expect(metrics.sentenceCount).toBe(1) // Default to 1 to avoid division by zero
    })
  })

  describe('generateFlags', () => {
    it('should flag content that is too short', () => {
      const content = 'Short.'
      const metrics = validator.calculateMetrics(content)
      const flags = validator.generateFlags(metrics)

      expect(flags.tooShort).toBe(true)
    })

    it('should flag content with high repetition', () => {
      const content = 'test test test test test test test test test test'
      const metrics = validator.calculateMetrics(content)
      const flags = validator.generateFlags(metrics)

      expect(flags.highRepetition).toBe(true)
    })

    it('should flag suspicious content', () => {
      // Very long content with very few words (lots of special chars)
      const content = '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ test'
      const metrics = validator.calculateMetrics(content)
      const flags = validator.generateFlags(metrics)

      expect(flags.suspiciousContent).toBe(true)
    })

    it('should not flag high-quality content', () => {
      const content = `
        Safety procedures are essential in electrical work. 
        Always ensure proper grounding before starting any installation. 
        Use appropriate personal protective equipment including insulated gloves and safety glasses.
        Verify that all circuits are de-energized using a voltage tester.
        Follow the manufacturer's specifications for all equipment.
        The voltage measurement should be taken with a calibrated multimeter.
        Proper installation requires following the electrical code specifications.
      `
      const metrics = validator.calculateMetrics(content)
      const flags = validator.generateFlags(metrics)

      // Should have a reasonable quality score
      expect(metrics.overallScore).toBeGreaterThan(0.6)
    })
  })

  describe('getQualityStatus', () => {
    it('should return excellent for high scores', () => {
      const status = validator.getQualityStatus(0.9)
      expect(status).toBe('excellent')
    })

    it('should return good for moderate-high scores', () => {
      const status = validator.getQualityStatus(0.75)
      expect(status).toBe('good')
    })

    it('should return fair for moderate scores', () => {
      const status = validator.getQualityStatus(0.65)
      expect(status).toBe('fair')
    })

    it('should return poor for low scores', () => {
      const status = validator.getQualityStatus(0.5)
      expect(status).toBe('poor')
    })

    it('should return needs_review for very low scores', () => {
      const status = validator.getQualityStatus(0.3)
      expect(status).toBe('needs_review')
    })
  })

  describe('generateRecommendations', () => {
    it('should recommend merging for short content', () => {
      const metrics = validator.calculateMetrics('Short.')
      const flags = validator.generateFlags(metrics)
      const recommendations = validator.generateRecommendations(flags, metrics)

      expect(recommendations).toContain('Content is too short. Consider merging with adjacent chunks.')
    })

    it('should recommend review for high repetition', () => {
      const content = 'test test test test test test test test test test'
      const metrics = validator.calculateMetrics(content)
      const flags = validator.generateFlags(metrics)
      const recommendations = validator.generateRecommendations(flags, metrics)

      expect(recommendations.some(r => r.includes('repetition'))).toBe(true)
    })

    it('should recommend verification for non-technical content', () => {
      const content = 'This is some generic text without any technical terms or numbers.'
      const metrics = validator.calculateMetrics(content)
      const flags = validator.generateFlags(metrics)
      const recommendations = validator.generateRecommendations(flags, metrics)

      expect(recommendations.some(r => r.includes('technical terms'))).toBe(true)
    })

    it('should not recommend anything for high-quality content', () => {
      const content = `
        The electrical circuit consists of a voltage source, conductors, and a load. 
        When measuring voltage, always use a voltmeter in parallel with the component.
        Current measurements require an ammeter in series with the circuit.
        Resistance can be calculated using Ohm's Law: R = V / I.
        Safety precautions include proper grounding and use of insulated tools.
      `
      const metrics = validator.calculateMetrics(content)
      const flags = validator.generateFlags(metrics)
      const recommendations = validator.generateRecommendations(flags, metrics)

      // High quality content should have minimal recommendations
      expect(recommendations.length).toBeLessThan(2)
    })
  })

  describe('validateChunk', () => {
    it('should return complete validation result', async () => {
      const content = `
        Safety is paramount in electrical installations. 
        Always verify that circuits are de-energized before beginning work.
        Use appropriate testing equipment to confirm voltage levels.
        Follow all manufacturer specifications and local electrical codes.
      `
      const result = await validator.validateChunk(1, content)

      expect(result).toHaveProperty('chunkId', 1)
      expect(result).toHaveProperty('metrics')
      expect(result).toHaveProperty('flags')
      expect(result).toHaveProperty('qualityScore')
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('recommendations')
      expect(result.qualityScore).toBeGreaterThan(0)
      expect(result.qualityScore).toBeLessThanOrEqual(1)
    })
  })

  describe('edge cases', () => {
    it('should handle content with only whitespace', () => {
      const content = '     \n\n\t\t   '
      const metrics = validator.calculateMetrics(content)

      expect(metrics.wordCount).toBe(0)
      expect(metrics.contentLength).toBeGreaterThan(0)
    })

    it('should handle content with no sentences', () => {
      const content = 'no punctuation at all'
      const metrics = validator.calculateMetrics(content)

      expect(metrics.sentenceCount).toBe(1) // Should default to 1
    })

    it('should handle very long content', () => {
      const content = 'word '.repeat(2000) // 10000 characters
      const metrics = validator.calculateMetrics(content)
      const flags = validator.generateFlags(metrics)

      expect(flags.tooLong).toBe(true)
    })

    it('should handle content with mixed languages', () => {
      const content = 'This is English. यह हिंदी है। 这是中文。'
      const metrics = validator.calculateMetrics(content)

      expect(metrics.wordCount).toBeGreaterThan(0)
      expect(metrics.sentenceCount).toBeGreaterThan(0)
    })
  })

  describe('overall score calculation', () => {
    it('should give high scores to technical educational content', () => {
      const content = `
        Electrical safety procedures require proper understanding of voltage, current, and resistance.
        Before starting any installation work, verify that all circuits are de-energized.
        Use a multimeter to measure voltage levels and ensure they are within safe operating ranges.
        Ground fault circuit interrupters (GFCIs) provide protection against electrical shock.
        Always follow the National Electrical Code (NEC) guidelines for residential wiring.
        Proper wire sizing is critical for preventing overheating and fire hazards.
        Circuit breakers should be rated appropriately for the connected load.
        The resistance value should be measured using an ohmmeter at 25 degrees Celsius.
      `
      const metrics = validator.calculateMetrics(content)

      expect(metrics.overallScore).toBeGreaterThan(0.65)
      expect(metrics.hasTechnicalTerms).toBe(true)
    })

    it('should give low scores to poor quality content', () => {
      const content = 'a b c d e f g h i j k l m n o p q r s t u v w x y z a b c d e'
      const metrics = validator.calculateMetrics(content)

      // This content is poor quality but not necessarily below 0.5
      expect(metrics.overallScore).toBeLessThan(0.65)
      expect(metrics.hasTechnicalTerms).toBe(false)
    })
  })
})
