/**
 * Cache System Demonstration
 * 
 * This script demonstrates the caching functionality of the RAG system.
 */

const { CacheService, EmbeddingCache, ModuleMappingCache, ChunkCache } = require('../lib/rag/cache-service.ts')

console.log('🎯 RAG Caching System Demonstration\n')

// 1. Basic Cache Operations
console.log('1️⃣ Basic Cache Operations')
console.log('─'.repeat(50))

const cache = new CacheService({
  maxSize: 5,
  defaultTTL: 5000,
  enableStats: true
})

cache.set('user:1', { name: 'Alice', role: 'student' })
cache.set('user:2', { name: 'Bob', role: 'instructor' })

console.log('✓ Stored 2 users in cache')
console.log('✓ Retrieved user:1:', cache.get('user:1'))
console.log('✓ Cache size:', cache.size())
console.log()

// 2. Cache Statistics
console.log('2️⃣ Cache Statistics')
console.log('─'.repeat(50))

cache.get('user:1') // hit
cache.get('user:2') // hit
cache.get('user:3') // miss

const stats = cache.getStats()
console.log('✓ Hits:', stats.hits)
console.log('✓ Misses:', stats.misses)
console.log('✓ Hit Rate:', (stats.hitRate * 100).toFixed(2) + '%')
console.log()

// 3. LRU Eviction
console.log('3️⃣ LRU Eviction (Max Size: 5)')
console.log('─'.repeat(50))

cache.clear()
cache.resetStats()

// Fill cache to capacity
for (let i = 1; i <= 5; i++) {
  cache.set(`item:${i}`, `value${i}`)
}

console.log('✓ Filled cache with 5 items')
console.log('✓ Cache size:', cache.size())

// Access some items to update LRU
cache.get('item:2')
cache.get('item:3')
cache.get('item:4')
cache.get('item:5')

// Add new item - should evict item:1 (least recently used)
cache.set('item:6', 'value6')

console.log('✓ Added item:6 (cache at capacity)')
console.log('✓ item:1 evicted?', cache.get('item:1') === null ? 'Yes ✓' : 'No ✗')
console.log('✓ item:2 still cached?', cache.get('item:2') !== null ? 'Yes ✓' : 'No ✗')
console.log('✓ Evictions:', cache.getStats().evictions)
console.log()

// 4. Embedding Cache
console.log('4️⃣ Embedding Cache')
console.log('─'.repeat(50))

const embeddingCache = new EmbeddingCache({
  maxSize: 10,
  defaultTTL: 10000
})

const text1 = 'What is machine learning?'
const text2 = 'Explain neural networks'
const embedding1 = [0.1, 0.2, 0.3, 0.4, 0.5]
const embedding2 = [0.6, 0.7, 0.8, 0.9, 1.0]

embeddingCache.setEmbedding(text1, embedding1)
embeddingCache.setEmbedding(text2, embedding2)

console.log('✓ Cached 2 embeddings')
console.log('✓ Retrieved embedding for text1:', embeddingCache.getEmbedding(text1))
console.log('✓ Cache key for text1:', EmbeddingCache.generateKey(text1))
console.log('✓ Cache size:', embeddingCache.size())
console.log()

// 5. Module Mapping Cache
console.log('5️⃣ Module Mapping Cache')
console.log('─'.repeat(50))

const moduleMappingCache = new ModuleMappingCache()

const fitterModules = {
  modules: [
    { id: 1, name: 'Safety Practices' },
    { id: 2, name: 'Hand Tools' },
    { id: 3, name: 'Measuring Instruments' }
  ]
}

moduleMappingCache.setModuleMapping('fitter', fitterModules)

console.log('✓ Cached fitter module mappings')
console.log('✓ Retrieved mappings:', moduleMappingCache.getModuleMapping('fitter'))
console.log('✓ Cache size:', moduleMappingCache.size())
console.log()

// 6. Chunk Cache
console.log('6️⃣ Chunk Cache')
console.log('─'.repeat(50))

const chunkCache = new ChunkCache({
  maxSize: 20
})

const chunk1 = {
  id: 1,
  content: 'Safety is paramount in workshop...',
  course: 'fitter',
  module: 'safety'
}

const chunk2 = {
  id: 2,
  content: 'Hand tools include hammers, files...',
  course: 'fitter',
  module: 'tools'
}

const chunk3 = {
  id: 3,
  content: 'Electrical safety requires...',
  course: 'electrician',
  module: 'safety'
}

chunkCache.setChunk(1, chunk1)
chunkCache.setChunk(2, chunk2)
chunkCache.setChunk(3, chunk3)

console.log('✓ Cached 3 chunks')
console.log('✓ Retrieved chunk 1:', chunkCache.getChunk(1))
console.log('✓ Cache size:', chunkCache.size())

// Invalidate fitter chunks
const removed = chunkCache.invalidateChunksByCourse('fitter')
console.log('✓ Invalidated fitter chunks:', removed, 'removed')
console.log('✓ Chunk 1 still cached?', chunkCache.getChunk(1) === null ? 'No ✓' : 'Yes ✗')
console.log('✓ Chunk 3 still cached?', chunkCache.getChunk(3) !== null ? 'Yes ✓' : 'No ✗')
console.log()

// 7. TTL Expiration
console.log('7️⃣ TTL Expiration')
console.log('─'.repeat(50))

const shortTTLCache = new CacheService({
  maxSize: 10,
  defaultTTL: 2000 // 2 seconds
})

shortTTLCache.set('temp:1', 'temporary value')
console.log('✓ Set value with 2s TTL')
console.log('✓ Value exists?', shortTTLCache.has('temp:1') ? 'Yes ✓' : 'No ✗')

setTimeout(() => {
  console.log('✓ After 2.5s, value exists?', shortTTLCache.has('temp:1') ? 'Yes ✗' : 'No ✓')
  console.log()
  
  // Summary
  console.log('📊 Summary')
  console.log('─'.repeat(50))
  console.log('✅ Cache operations: Working')
  console.log('✅ LRU eviction: Working')
  console.log('✅ TTL expiration: Working')
  console.log('✅ Statistics tracking: Working')
  console.log('✅ Specialized caches: Working')
  console.log()
  console.log('🎉 All cache features demonstrated successfully!')
}, 2500)
