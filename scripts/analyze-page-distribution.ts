import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
  password: 'admin',
})

async function analyzePageDistribution() {
  try {
    console.log('📊 Analyzing page distribution for module detection...\n')

    // Get page distribution
    const result = await pool.query(`
      SELECT 
        page_number,
        COUNT(*) as chunk_count,
        LEFT(content, 100) as sample_content
      FROM knowledge_chunks
      WHERE course = 'electrician'
      GROUP BY page_number, content
      ORDER BY page_number
      LIMIT 100
    `)

    console.log('📄 Page Distribution (first 100 pages):')
    console.log('─'.repeat(80))

    let currentPage = 0
    result.rows.forEach(row => {
      if (row.page_number !== currentPage) {
        currentPage = row.page_number
        console.log(`\nPage ${row.page_number}: ${row.chunk_count} chunks`)
        console.log(`  Sample: ${row.sample_content.replace(/\n/g, ' ')}...`)
      }
    })

    // Get page range
    const rangeResult = await pool.query(`
      SELECT 
        MIN(page_number) as min_page,
        MAX(page_number) as max_page,
        COUNT(DISTINCT page_number) as total_pages
      FROM knowledge_chunks
      WHERE course = 'electrician'
    `)

    console.log('\n' + '─'.repeat(80))
    console.log('\n📈 Summary:')
    console.log(`  Min Page: ${rangeResult.rows[0].min_page}`)
    console.log(`  Max Page: ${rangeResult.rows[0].max_page}`)
    console.log(`  Total Pages: ${rangeResult.rows[0].total_pages}`)

    // Suggest module breakdown
    const maxPage = rangeResult.rows[0].max_page
    const pagesPerModule = Math.ceil(maxPage / 10) // Assume ~10 modules

    console.log('\n💡 Suggested Module Breakdown (based on page ranges):')
    console.log('─'.repeat(80))
    
    for (let i = 1; i <= 10; i++) {
      const startPage = (i - 1) * pagesPerModule + 1
      const endPage = Math.min(i * pagesPerModule, maxPage)
      
      // Count chunks in this range
      const countResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM knowledge_chunks
        WHERE course = 'electrician'
          AND page_number >= $1
          AND page_number <= $2
      `, [startPage, endPage])

      if (countResult.rows[0].count > 0) {
        console.log(`  Module ${i}: Pages ${startPage}-${endPage} (${countResult.rows[0].count} chunks)`)
      }
    }

    console.log('\n✅ Analysis complete!')
    console.log('\n⚠️  IMPORTANT: Review the page distribution above before proceeding.')
    console.log('   This will help determine accurate module boundaries.')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
  }
}

analyzePageDistribution()
