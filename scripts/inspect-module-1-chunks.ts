#!/usr/bin/env tsx
/**
 * Inspect Module 1 chunks to see what content is actually stored
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

async function inspectChunks() {
  console.log('🔍 Inspecting Module 1 chunks...\n');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon DB\n');

    // Get Module 1 chunks
    const result = await client.query(`
      SELECT 
        id,
        module,
        module_name,
        section,
        page_number,
        chunk_index,
        LEFT(content, 500) as content_preview,
        LENGTH(content) as content_length,
        token_count,
        trade_type
      FROM knowledge_chunks
      WHERE course = 'electrician' AND module = 'module-1'
      ORDER BY chunk_index
      LIMIT 10
    `);

    console.log(`📊 Found ${result.rows.length} chunks for Module 1\n`);
    console.log('─'.repeat(80));

    result.rows.forEach((row: any, idx: number) => {
      console.log(`\nChunk ${idx + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Module: ${row.module_name}`);
      console.log(`  Section: ${row.section || 'N/A'}`);
      console.log(`  Page: ${row.page_number || 'N/A'}`);
      console.log(`  Trade Type: ${row.trade_type}`);
      console.log(`  Length: ${row.content_length} chars, ${row.token_count} tokens`);
      console.log(`  Content Preview:`);
      console.log(`  "${row.content_preview}..."`);
      console.log('─'.repeat(80));
    });

    // Test a search query
    console.log('\n\n🔍 Testing vector search for "Module 1 topics"...\n');
    
    const searchQuery = "What topics are covered in Module 1";
    
    // Generate embedding (you'll need to implement this or use the service)
    console.log(`Query: "${searchQuery}"`);
    console.log('\nNote: To test actual vector search, run the chatbot and check the API logs\n');

    client.release();
    await pool.end();
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

inspectChunks();
