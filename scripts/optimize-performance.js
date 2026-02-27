/**
 * Performance Optimization Script
 * 
 * Runs various performance optimizations on the RAG system:
 * - Optimizes vector indexes
 * - Creates additional indexes for common queries
 * - Analyzes tables for better query planning
 * - Displays performance statistics
 */

const { performanceOptimizer } = require('../lib/rag/performance-optimizer.ts')
const { closePool } = require('../lib/postgresql.ts')

async function main() {
  console.log('🚀 Starting RAG System Performance Optimization\n')

  try {
    // Step 1: Get baseline performance stats
    console.log('📊 Baseline Performance Statistics:')
    const baselineStats = await performanceOptimizer.getPerformanceStats()
    console.log(`   Total chunks: ${baselineStats.totalChunks}`)
    console.log(`   Chunks with embeddings: ${baselineStats.chunksWithEmbeddings}`)
    console.log(`   Table size: ${baselineStats.tableSize}`)
    console.log(`   Index size: ${baselineStats.indexSize}`)
    console.log(`   Cache hit ratio: ${baselineStats.cacheHitRatio}%\n`)

    // Step 2: Analyze tables
    await performanceOptimizer.analyzeTables()
    console.log()

    // Step 3: Create optimized indexes
    await performanceOptimizer.createOptimizedIndexes()
    console.log()

    // Step 4: Optimize vector index
    if (baselineStats.chunksWithEmbeddings > 0) {
      await performanceOptimizer.optimizeVectorIndex({
        lists: Math.max(Math.floor(Math.sqrt(baselineStats.chunksWithEmbeddings)), 10),
        probes: Math.max(Math.floor(Math.sqrt(baselineStats.chunksWithEmbeddings) / 10), 1)
      })
      console.log()
    } else {
      console.log('⚠️ No embeddings found, skipping vector index optimization\n')
    }

    // Step 5: Optimize connection pool
    await performanceOptimizer.optimizeConnectionPool()
    console.log()

    // Step 6: Run VACUUM
    await performanceOptimizer.vacuum()
    console.log()

    // Step 7: Get final performance stats
    console.log('📊 Final Performance Statistics:')
    const finalStats = await performanceOptimizer.getPerformanceStats()
    console.log(`   Total chunks: ${finalStats.totalChunks}`)
    console.log(`   Chunks with embeddings: ${finalStats.chunksWithEmbeddings}`)
    console.log(`   Table size: ${finalStats.tableSize}`)
    console.log(`   Index size: ${finalStats.indexSize}`)
    console.log(`   Cache hit ratio: ${finalStats.cacheHitRatio}%\n`)

    console.log('✅ Performance optimization completed successfully!')
    console.log('\n📝 Recommendations:')
    console.log('   - Run this script periodically after adding new PDFs')
    console.log('   - Monitor cache hit ratio (target: >90%)')
    console.log('   - Adjust ivfflat.probes if search accuracy is low')
    console.log('   - Consider increasing shared_buffers if you have more RAM')

  } catch (error) {
    console.error('❌ Error during optimization:', error)
    process.exit(1)
  } finally {
    await closePool()
  }
}

main()
