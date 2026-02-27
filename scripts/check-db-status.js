const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function checkStatus() {
  try {
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('knowledge_chunks', 'pdf_documents', 'module_mapping')
    `);
    
    console.log('=== Tables ===');
    console.log(tablesResult.rows.map(r => r.table_name));
    
    // Check chunk count
    const chunkCount = await pool.query('SELECT COUNT(*) FROM knowledge_chunks');
    console.log('\n=== Chunk Count ===');
    console.log('Total chunks:', chunkCount.rows[0].count);
    
    // Sample chunks
    if (parseInt(chunkCount.rows[0].count) > 0) {
      const sample = await pool.query('SELECT id, course, module, section, page_number, LEFT(content, 100) as preview FROM knowledge_chunks LIMIT 5');
      console.log('\n=== Sample Chunks ===');
      console.log(JSON.stringify(sample.rows, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStatus();
