#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

config({ path: path.join(process.cwd(), '.env.local') });

async function verifyContent() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
    password: 'admin',
  });

  try {
    console.log('\n=== Content Verification ===\n');
    
    // Get sample chunks from different modules
    const result = await pool.query(`
      SELECT 
        course,
        trade_type,
        module,
        module_name,
        LENGTH(content) as content_length,
        page_number,
        chunk_index
      FROM knowledge_chunks 
      WHERE module != 'general-content'
      ORDER BY course, trade_type, module, chunk_index
      LIMIT 10
    `);
    
    console.log('Sample chunks with content:\n');
    result.rows.forEach((row, idx) => {
      console.log(`\n--- Chunk ${idx + 1} ---`);
      console.log(`Course: ${row.course}`);
      console.log(`Trade Type: ${row.trade_type}`);
      console.log(`Module: ${row.module_name}`);
      console.log(`Page: ${row.page_number || 'N/A'}`);
      console.log(`Chunk Index: ${row.chunk_index}`);
      console.log(`Content Length: ${row.content_length} characters`);
    });
    
    // Check if content is meaningful
    const emptyCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM knowledge_chunks 
      WHERE LENGTH(TRIM(content)) < 50
    `);
    
    console.log(`\n\n=== Content Quality Check ===`);
    console.log(`Chunks with very short content (< 50 chars): ${emptyCheck.rows[0].count}`);
    
    // Check average content length
    const avgLength = await pool.query(`
      SELECT 
        AVG(LENGTH(content)) as avg_length,
        MIN(LENGTH(content)) as min_length,
        MAX(LENGTH(content)) as max_length
      FROM knowledge_chunks
    `);
    
    console.log(`Average content length: ${Math.round(avgLength.rows[0].avg_length)} characters`);
    console.log(`Min content length: ${avgLength.rows[0].min_length} characters`);
    console.log(`Max content length: ${avgLength.rows[0].max_length} characters`);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

verifyContent();
