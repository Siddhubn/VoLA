import { describe, it, expect } from 'vitest'
import { HuggingFaceEmbeddingService } from '../huggingface-embedding-service'

describe('HuggingFaceEmbeddingService', () => {
  it('should generate embeddings using HuggingFace API', async () => {
    // Skip if no API key
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.warn('⚠️ Skipping test: HUGGINGFACE_API_KEY not set')
      console.warn('   Get your FREE key at: https://huggingface.co/settings/tokens')
      return
    }

    const service = new HuggingFaceEmbeddingService()
    
    const result = await service.generateEmbedding('Safety equipment includes helmets and gloves')
    
    expect(result).toBeDefined()
    expect(result.embedding).toBeDefined()
    expect(Array.isArray(result.embedding)).toBe(true)
    expect(result.embedding.length).toBe(384) // sentence-transformers/all-MiniLM-L6-v2 produces 384-dimensional embeddings
    expect(result.tokenCount).toBeGreaterThan(0)
    
    console.log(`✅ Generated ${result.embedding.length}-dimensional embedding`)
    console.log(`   First 5 values: [${result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`)
  }, 30000)

  it('should generate batch embeddings', async () => {
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.warn('⚠️ Skipping test: HUGGINGFACE_API_KEY not set')
      return
    }

    const service = new HuggingFaceEmbeddingService()
    
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
  }, 30000)

  it('should provide model information', () => {
    if (!process.env.HUGGINGFACE_API_KEY) {
      console.warn('⚠️ Skipping test: HUGGINGFACE_API_KEY not set')
      return
    }

    const service = new HuggingFaceEmbeddingService()
    const info = service.getModelInfo()
    
    expect(info.provider).toBe('HuggingFace')
    expect(info.model).toBe('sentence-transformers/all-MiniLM-L6-v2')
    expect(info.dimensions).toBe(384)
    expect(info.description).toContain('FREE')
    
    console.log('📊 Model Info:', info)
  })

  it('should throw error if API key is missing', () => {
    // Temporarily remove API key
    const originalKey = process.env.HUGGINGFACE_API_KEY
    delete process.env.HUGGINGFACE_API_KEY
    
    expect(() => new HuggingFaceEmbeddingService()).toThrow('HUGGINGFACE_API_KEY')
    
    // Restore API key
    if (originalKey) {
      process.env.HUGGINGFACE_API_KEY = originalKey
    }
  })
})
