const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function checkModules() {
  try {
    // Check distinct modules
    const modulesResult = await pool.query(`
      SELECT DISTINCT course, module 
      FROM knowledge_chunks 
      WHERE module IS NOT NULL 
      ORDER BY course, module
    `);
    
    console.log('=== Available Modules ===');
    console.log(JSON.stringify(modulesResult.rows, null, 2));
    
    // Check module counts
    const countsResult = await pool.query(`
      SELECT course, module, COUNT(*) as chunk_count,
             MIN(page_number) as min_page, MAX(page_number) as max_page
      FROM knowledge_chunks 
      WHERE module IS NOT NULL 
      GROUP BY course, module
      ORDER BY course, module
    `);
    
    console.log('\n=== Module Statistics ===');
    console.log(JSON.stringify(countsResult.rows, null, 2));
    
    // Check sections
    const sectionsResult = await pool.query(`
      SELECT course, module, section, COUNT(*) as count
      FROM knowledge_chunks 
      WHERE module IS NOT NULL AND section IS NOT NULL
      GROUP BY course, module, section
      ORDER BY course, module, section
      LIMIT 20
    `);
    
    console.log('\n=== Sample Sections ===');
    console.log(JSON.stringify(sectionsResult.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkModules();
