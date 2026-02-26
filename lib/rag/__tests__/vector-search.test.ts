import { describe, it, expect } from 'vitest'
import { VectorSearchService } from '../vector-search'

describe('VectorSearchService', () => {
  describe('configuration', () => {
    it('should use default configuration values', () => {
      const service = new VectorSearchService()
      const config = service.getConfig()

      expect(config.defaultTopK).toBe(5)
      expect(config.defaultMinSimilarity).toBe(0.7)
    })

    it('should accept custom configuration', () => {
      const service = new VectorSearchService({
        defaultTopK: 10,
        defaultMinSimilarity: 0.8
      })
      const config = service.getConfig()

      expect(config.defaultTopK).toBe(10)
      expect(config.defaultMinSimilarity).toBe(0.8)
    })
  })
})
