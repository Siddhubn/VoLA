const { LocalEmbeddingService } = require('./lib/rag/local-embedding-service.ts')

async function testLocalEmbeddings() {
  console.log('🧪 Testing Local Embedding Service...\n')
  
  try {
    const service = new LocalEmbeddingService()
    
    // Test single embedding
    console.log('📝 Test 1: Generate single embedding')
    const result1 = await service.generateEmbedding('Safety equipment includes helmets and gloves')
    console.log(`✅ Generated embedding with ${result1.embedding.length} dimensions`)
    console.log(`   First 5 values: [${result1.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`)
    console.log(`   Token count: ${result1.tokenCount}\n`)
    
    // Test batch embeddings
    console.log('📝 Test 2: Generate batch embeddings')
    const texts = [
      'Fire safety procedures',
      'Electrical circuits and wiring',
      'Hand tools and equipment'
    ]
    const result2 = await service.generateBatchEmbeddings(texts)
    console.log(`✅ Generated ${result2.embeddings.length} embeddings`)
    console.log(`   Total tokens: ${result2.totalTokens}`)
    console.log(`   Failed: ${result2.failedIndices.length}\n`)
    
    // Test query embedding
    console.log('📝 Test 3: Generate query embedding')
    const queryEmbedding = await service.embedQuery('What are safety procedures?')
    console.log(`✅ Query embedding: ${queryEmbedding.length} dimensions\n`)
    
    // Show model info
    console.log('📊 Model Information:')
    const info = service.getModelInfo()
    console.log(`   Model: ${info.model}`)
    console.log(`   Dimensions: ${info.dimensions}`)
    console.log(`   Batch Size: ${info.batchSize}`)
    console.log(`   Description: ${info.description}\n`)
    
    console.log('✅ All tests passed! Local embeddings are working perfectly.')
    console.log('🎉 Ready to use with Gemini for RAG applications!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

testLocalEmbeddings()
