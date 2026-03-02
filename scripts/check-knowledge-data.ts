import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
  password: 'admin',
})

async function checkKnowledgeData() {
  try {
    console.log('🔍 Checking knowledge base data...\n')

    // Check total chunks
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM knowledge_chunks')
    console.log(`📊 Total chunks: ${totalResult.rows[0].count}`)

    // Check by course
    const courseResult = await pool.query(`
      SELECT course, COUNT(*) as count 
      FROM knowledge_chunks 
      GROUP BY course
    `)
    console.log('\n📚 Chunks by course:')
    courseResult.rows.forEach(row => {
      console.log(`  - ${row.course}: ${row.count} chunks`)
    })

    // Check embeddings
    const embeddingResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM knowledge_chunks 
      WHERE embedding IS NOT NULL
    `)
    console.log(`\n🔢 Chunks with embeddings: ${embeddingResult.rows[0].count}`)

    // Check sample data
    const sampleResult = await pool.query(`
      SELECT course, module, section, page_number, 
             LEFT(content, 100) as content_preview
      FROM knowledge_chunks 
      LIMIT 5
    `)
    console.log('\n📝 Sample chunks:')
    sampleResult.rows.forEach((row, index) => {
      console.log(`\n  ${index + 1}. Course: ${row.course}`)
      console.log(`     Module: ${row.module || 'N/A'}`)
      console.log(`     Section: ${row.section || 'N/A'}`)
      console.log(`     Page: ${row.page_number || 'N/A'}`)
      console.log(`     Content: ${row.content_preview}...`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
  }
}

checkKnowledgeData()
