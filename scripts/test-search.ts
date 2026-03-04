#!/usr/bin/env tsx
import { config } from 'dotenv'
import path from 'path'

config({ path: path.join(process.cwd(), '.env.local') })

async function testSearch() {
  console.log('🧪 Testing Vector Search\n')

  try {
    // Test 1: Generate embedding
    console.log('1️⃣ Testing embedding generation...')
    const { LocalEmbeddingService } = await import('../lib/rag/local-embedding-service')
    const embeddingService = new LocalEmbeddingService()
    
    const testQuery = 'electrical safety'
    console.log(`   Query: "${testQuery}"`)
    
    const embedding = await embeddingService.embedQuery(testQuery)
    console.log(`✅ Embedding generated: ${embedding.length} dimensions\n`)

    // Test 2: Direct vector search with different thresholds
    console.log('2️⃣ Testing vector search with different thresholds...')
    const { VectorSearchService } = await import('../lib/rag/vector-search')
    const searchService = new VectorSearchService()
    
    // Test with 0.3 threshold
    console.log('\n   Testing with 0.3 similarity threshold:')
    let results = await searchService.search({
      query: testQuery,
      course: 'electrician',
      topK: 5,
      minSimilarity: 0.3
    })
    console.log(`   Found: ${results.length} results`)
    if (results.length > 0) {
      results.forEach((r, i) => {
        console.log(`   ${i + 1}. Similarity: ${(r.similarity * 100).toFixed(1)}% - ${r.source.module} - ${r.source.moduleName}`)
      })
    }
    
    // Test with 0.1 threshold
    console.log('\n   Testing with 0.1 similarity threshold:')
    results = await searchService.search({
      query: testQuery,
      course: 'electrician',
      topK: 5,
      minSimilarity: 0.1
    })
    console.log(`   Found: ${results.length} results`)
    if (results.length > 0) {
      results.forEach((r, i) => {
        console.log(`   ${i + 1}. Similarity: ${(r.similarity * 100).toFixed(1)}% - ${r.source.module}`)
      })
    }
    
    // Test with no filters
    console.log('\n   Testing with NO filters (0.1 threshold):')
    results = await searchService.search({
      query: testQuery,
      topK: 5,
      minSimilarity: 0.1
    })
    console.log(`   Found: ${results.length} results`)
    if (results.length > 0) {
      results.forEach((r, i) => {
        console.log(`   ${i + 1}. Similarity: ${(r.similarity * 100).toFixed(1)}% - ${r.source.course} - ${r.source.module}`)
      })
    }

    // Test 3: Different queries
    console.log('\n3️⃣ Testing different queries...')
    const queries = [
      'safety',
      'tools',
      'hand tools',
      'electrical',
      'module 1'
    ]
    
    for (const q of queries) {
      const res = await searchService.search({
        query: q,
        course: 'electrician',
        topK: 3,
        minSimilarity: 0.1
      })
      console.log(`   "${q}": ${res.length} results`)
    }

    console.log('\n✅ Search test complete!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('   Error:', error.message)
    }
  }
  
  process.exit(0)
}

testSearch()
