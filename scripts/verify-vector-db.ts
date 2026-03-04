#!/usr/bin/env tsx
/**
 * Verify Vector Database Quality
 */

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

config({ path: path.join(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🔍 Vector Database Verification\n');
  console.log('═'.repeat(60));
  
  try {
    // Overall statistics
    console.log('\n📊 Overall Statistics:');
    const overall = await query(`
      SELECT 
        COUNT(*) as total_chunks,
        COUNT(DISTINCT trade) as trades,
        COUNT(DISTINCT module_id) as modules,
        AVG(word_count)::int as avg_words,
        AVG(priority)::numeric(3,1) as avg_priority
      FROM knowledge_chunks
    `);
    console.log(overall.rows[0]);
    
    // By trade type
    console.log('\n📚 By Trade Type:');
    const byType = await query(`
      SELECT * FROM module_summaries ORDER BY trade_type, module_number
    `);
    
    console.log('\nTT (Trade Theory):');
    byType.rows.filter(r => r.trade_type === 'TT').forEach(row => {
      console.log(`  Module ${row.module_number}: ${row.module_name}`);
      console.log(`    Chunks: ${row.chunk_count}, Words: ${row.total_words}, Priority: ${parseFloat(row.avg_priority).toFixed(1)}`);
    });
    
    console.log('\nTP (Trade Practical):');
    byType.rows.filter(r => r.trade_type === 'TP').forEach(row => {
      console.log(`  Module ${row.module_number}: ${row.module_name}`);
      console.log(`    Chunks: ${row.chunk_count}, Words: ${row.total_words}, Priority: ${parseFloat(row.avg_priority).toFixed(1)}`);
    });
    
    // Content type distribution
    console.log('\n🏷️  Content Type Distribution:');
    const contentTypes = await query(`
      SELECT * FROM content_type_stats ORDER BY trade_type, content_type
    `);
    
    console.log('\nTT:');
    contentTypes.rows.filter(r => r.trade_type === 'TT').forEach(row => {
      console.log(`  ${row.content_type}: ${row.chunk_count} chunks (avg ${row.avg_words} words)`);
    });
    
    console.log('\nTP:');
    contentTypes.rows.filter(r => r.trade_type === 'TP').forEach(row => {
      console.log(`  ${row.content_type}: ${row.chunk_count} chunks (avg ${row.avg_words} words)`);
    });
    
    // Sample chunks
    console.log('\n📝 Sample Chunks:');
    const samples = await query(`
      SELECT 
        module_id,
        content_type,
        LEFT(content, 150) as preview,
        word_count,
        priority
      FROM knowledge_chunks
      WHERE priority >= 6
      ORDER BY priority DESC, module_number
      LIMIT 5
    `);
    
    samples.rows.forEach((row, i) => {
      console.log(`\n${i + 1}. ${row.module_id} (${row.content_type}, priority: ${row.priority})`);
      console.log(`   "${row.preview}..."`);
      console.log(`   Words: ${row.word_count}`);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Verification Complete!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
