#!/usr/bin/env tsx
/**
 * Check current module names in Neon DB
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

async function checkModules() {
  console.log('🔍 Checking current module names in Neon DB...\n');
  
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

    // Check module_mapping table
    console.log('📋 Module Mapping Table:\n');
    const mappings = await client.query(`
      SELECT id, course, module_id, module_name, description, display_order
      FROM module_mapping
      ORDER BY course, display_order
    `);
    
    console.log(`Found ${mappings.rows.length} module mappings:\n`);
    mappings.rows.forEach((row: any) => {
      console.log(`  [${row.course}] ${row.module_id}`);
      console.log(`    Name: ${row.module_name}`);
      console.log(`    Description: ${row.description || 'N/A'}`);
      console.log(`    Display Order: ${row.display_order}`);
      console.log('');
    });

    // Check actual modules in knowledge_chunks
    console.log('\n📊 Modules in Knowledge Chunks:\n');
    const chunks = await client.query(`
      SELECT 
        course,
        module,
        module_name,
        COUNT(*) as chunk_count,
        array_agg(DISTINCT trade_type) as trade_types
      FROM knowledge_chunks
      GROUP BY course, module, module_name
      ORDER BY course, module
    `);
    
    console.log(`Found ${chunks.rows.length} unique modules in chunks:\n`);
    chunks.rows.forEach((row: any) => {
      console.log(`  [${row.course}] ${row.module}`);
      console.log(`    Module Name: ${row.module_name}`);
      console.log(`    Chunks: ${row.chunk_count}`);
      console.log(`    Trade Types: ${row.trade_types?.join(', ') || 'N/A'}`);
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

checkModules();
