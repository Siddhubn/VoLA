#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

config({ path: path.join(process.cwd(), '.env.local') });

async function verifyModules() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
    password: 'admin',
  });

  try {
    console.log('\n=== Module Structure Verification ===\n');
    
    // Check module distribution
    const result = await pool.query(`
      SELECT 
        course, 
        trade_type, 
        module, 
        module_name, 
        COUNT(*) as chunk_count 
      FROM knowledge_chunks 
      GROUP BY course, trade_type, module, module_name 
      ORDER BY course, trade_type, module
    `);
    
    console.log('Modules extracted:\n');
    result.rows.forEach(row => {
      console.log(`${row.course.padEnd(12)} | ${row.trade_type.padEnd(16)} | ${row.module.padEnd(30)} | ${row.chunk_count} chunks`);
    });
    
    console.log(`\n✅ Total modules: ${result.rows.length}`);
    
    // Check total chunks
    const totalChunks = await pool.query('SELECT COUNT(*) as count FROM knowledge_chunks');
    console.log(`✅ Total chunks: ${totalChunks.rows[0].count}`);
    
    // Check schema
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_chunks' 
      AND column_name IN ('trade_type', 'module', 'module_name')
    `);
    
    console.log('\n=== Schema Verification ===\n');
    schemaCheck.rows.forEach(row => {
      console.log(`✅ ${row.column_name}: ${row.data_type}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

verifyModules();
