#!/usr/bin/env tsx
/**
 * Check current topics (sections) in knowledge chunks
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

async function checkTopics() {
  console.log('🔍 Checking topics/sections in knowledge chunks...\n');
  
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

    // Get topics by module
    console.log('📚 Topics by Module:\n');
    const topics = await client.query(`
      SELECT 
        module,
        module_name,
        section,
        COUNT(*) as chunk_count
      FROM knowledge_chunks
      WHERE course = 'electrician'
      GROUP BY module, module_name, section
      ORDER BY module, section
    `);
    
    let currentModule = '';
    topics.rows.forEach((row: any) => {
      if (row.module !== currentModule) {
        currentModule = row.module;
        console.log(`\n${row.module}: ${row.module_name}`);
        console.log('─'.repeat(60));
      }
      console.log(`  ${row.section || '(no section)'} - ${row.chunk_count} chunks`);
    });

    // Check if there's a module_syllabus table
    console.log('\n\n🔍 Checking for module_syllabus table...\n');
    try {
      const syllabusCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'module_syllabus'
        )
      `);
      
      if (syllabusCheck.rows[0].exists) {
        console.log('✅ module_syllabus table exists\n');
        
        const syllabusData = await client.query(`
          SELECT 
            module_id,
            module_name,
            module_number,
            topics,
            trade_type
          FROM module_syllabus
          WHERE course = 'electrician'
          ORDER BY module_number
        `);
        
        console.log('📋 Syllabus Data:\n');
        syllabusData.rows.forEach((row: any) => {
          console.log(`${row.module_id}: ${row.module_name}`);
          console.log(`  Trade Type: ${row.trade_type}`);
          console.log(`  Topics (${row.topics?.length || 0}):`);
          if (row.topics && row.topics.length > 0) {
            row.topics.forEach((topic: string, idx: number) => {
              console.log(`    ${idx + 1}. ${topic}`);
            });
          }
          console.log('');
        });
      } else {
        console.log('⚠️  module_syllabus table does not exist');
        console.log('   Topics are being derived from knowledge_chunks sections\n');
      }
    } catch (error: any) {
      console.log(`⚠️  Error checking module_syllabus: ${error.message}\n`);
    }

    // Sample some chunks to see their content
    console.log('\n📄 Sample Chunks (first 3 from module-1):\n');
    const samples = await client.query(`
      SELECT 
        id,
        module,
        module_name,
        section,
        content_preview,
        page_number
      FROM knowledge_chunks
      WHERE course = 'electrician' AND module = 'module-1'
      ORDER BY chunk_index
      LIMIT 3
    `);
    
    samples.rows.forEach((row: any, idx: number) => {
      console.log(`${idx + 1}. Chunk ID: ${row.id}`);
      console.log(`   Module: ${row.module_name}`);
      console.log(`   Section: ${row.section || 'N/A'}`);
      console.log(`   Page: ${row.page_number || 'N/A'}`);
      console.log(`   Preview: ${row.content_preview?.substring(0, 100) || 'N/A'}...`);
      console.log('');
    });

    client.release();
    await pool.end();
    
  } catch (error: any) {
    console.error('\n❌ Check failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkTopics();
