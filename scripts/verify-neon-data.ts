#!/usr/bin/env tsx
/**
 * Verify Neon DB data completeness
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

async function verifyData() {
  console.log('🔍 Verifying Neon DB data...\n');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
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

    // Check all tables
    console.log('📊 Table Row Counts:\n');
    
    const tables = [
      'users',
      'pdf_documents', 
      'module_mapping',
      'knowledge_chunks',
      'chat_history'
    ];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        console.log(`   ${count > 0 ? '✅' : '⚠️ '} ${table}: ${count} rows`);
      } catch (error: any) {
        console.log(`   ❌ ${table}: Error - ${error.message}`);
      }
    }

    // Check knowledge chunks with embeddings
    console.log('\n📊 Knowledge Chunks Details:\n');
    try {
      const embeddingCheck = await client.query(
        'SELECT COUNT(*) as count FROM knowledge_chunks WHERE embedding IS NOT NULL'
      );
      const embeddingCount = parseInt(embeddingCheck.rows[0].count);
      console.log(`   ✅ Chunks with embeddings: ${embeddingCount}`);

      // Check by course
      const byCourse = await client.query(`
        SELECT course, COUNT(*) as count 
        FROM knowledge_chunks 
        GROUP BY course
      `);
      console.log('\n   By Course:');
      byCourse.rows.forEach((row: any) => {
        console.log(`      - ${row.course}: ${row.count} chunks`);
      });

      // Check by module
      const byModule = await client.query(`
        SELECT course, module, COUNT(*) as count 
        FROM knowledge_chunks 
        GROUP BY course, module
        ORDER BY course, module
      `);
      console.log('\n   By Module:');
      byModule.rows.forEach((row: any) => {
        console.log(`      - ${row.course} / ${row.module}: ${row.count} chunks`);
      });

      // Sample a few chunks
      const sample = await client.query(`
        SELECT id, course, module, module_name, content_preview, trade_type
        FROM knowledge_chunks 
        LIMIT 5
      `);
      console.log('\n   Sample Chunks:');
      sample.rows.forEach((row: any, idx: number) => {
        console.log(`      ${idx + 1}. [${row.course}] ${row.module_name || row.module}`);
        console.log(`         Preview: ${row.content_preview?.substring(0, 80)}...`);
        console.log(`         Trade Type: ${row.trade_type || 'N/A'}`);
      });

    } catch (error: any) {
      console.log(`   ❌ Error checking knowledge chunks: ${error.message}`);
    }

    // Check module mappings
    console.log('\n📊 Module Mappings:\n');
    try {
      const modules = await client.query(`
        SELECT course, module_id, module_name 
        FROM module_mapping 
        ORDER BY course, display_order
      `);
      console.log(`   Total: ${modules.rows.length} modules\n`);
      modules.rows.forEach((row: any) => {
        console.log(`      - [${row.course}] ${row.module_id}: ${row.module_name}`);
      });
    } catch (error: any) {
      console.log(`   ❌ Error checking modules: ${error.message}`);
    }

    // Check PDF documents
    console.log('\n📊 PDF Documents:\n');
    try {
      const pdfs = await client.query(`
        SELECT filename, course, total_pages, total_chunks, processing_status 
        FROM pdf_documents 
        ORDER BY course
      `);
      pdfs.rows.forEach((row: any) => {
        console.log(`      - [${row.course}] ${row.filename}`);
        console.log(`        Pages: ${row.total_pages}, Chunks: ${row.total_chunks}, Status: ${row.processing_status}`);
      });
    } catch (error: any) {
      console.log(`   ❌ Error checking PDFs: ${error.message}`);
    }

    console.log('\n' + '━'.repeat(60));
    
    // Summary
    const totalChunks = await client.query('SELECT COUNT(*) as count FROM knowledge_chunks');
    const totalUsers = await client.query('SELECT COUNT(*) as count FROM users');
    
    console.log('\n📋 Summary:');
    console.log(`   Users: ${totalUsers.rows[0].count}`);
    console.log(`   Knowledge Chunks: ${totalChunks.rows[0].count}`);
    
    if (parseInt(totalChunks.rows[0].count) === 0) {
      console.log('\n⚠️  WARNING: No knowledge chunks found!');
      console.log('   This means the import may have failed.');
      console.log('   Run: npx tsx scripts/import-supabase-to-neon.ts');
    } else if (parseInt(totalChunks.rows[0].count) < 500) {
      console.log('\n⚠️  WARNING: Low number of knowledge chunks!');
      console.log(`   Expected: ~551, Found: ${totalChunks.rows[0].count}`);
      console.log('   Some data may be missing.');
    } else {
      console.log('\n✅ Data looks complete!');
    }

    client.release();
    await pool.end();
    
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyData();
