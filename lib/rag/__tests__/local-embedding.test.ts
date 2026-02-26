import { describe, it, expect } from 'vitest'
import { LocalEmbeddingService } from '../local-embedding-service'

describe('LocalEmbeddingService', () => {
  it('should generate embeddings using local model', async () => {
    const service = new LocalEmbeddingService()
    
    const result = await service.generateEmbedding('Safety equipment includes helmets and gloves')
    
    expect(result).toBeDefined()
    expect(result.embedding).toBeDefined()
    expect(Array.isArray(result.embedding)).toBe(true)
    expect(result.embedding.length).toBe(384) // all-MiniLM-L6-v2 produces 384-dimensional embeddings
    expect(result.tokenCount).toBeGreaterThan(0)
    
    console.log(`✅ Generated ${result.embedding.length}-dimensional embedding`)
    console.log(`   First 5 values: [${result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`)
  }, 60000) // 60 second timeout for model loading

  it('should generate batch embeddings', async () => {
    const service = new LocalEmbeddingService()
    
    const texts = [
      'Fire safety procedures',
      'Electrical circuits and wiring',
      'Hand tools and equipment'
    ]
    
    const result = await service.generateBatchEmbeddings(texts)
    
    expect(result.embeddings).toBeDefined()
    expect(result.embeddings.length).toBe(3)
    expect(result.failedIndices.length).toBe(0)
    expect(result.totalTokens).toBeGreaterThan(0)
    
    // Check each embedding
    result.embeddings.forEach(embedding => {
      expect(embedding.length).toBe(384)
    })
    
    console.log(`✅ Generated ${result.embeddings.length} embeddings`)
  }, 60000)

  it('should provide model information', () => {
    const service = new LocalEmbeddingService()
    const info = service.getModelInfo()
    
    expect(info.model).toBe('Xenova/all-MiniLM-L6-v2')
    expect(info.dimensions).toBe(384)
    expect(info.batchSize).toBeGreaterThan(0)
    expect(info.description).toContain('Local')
    
    console.log('📊 Model Info:', info)
  })
})
