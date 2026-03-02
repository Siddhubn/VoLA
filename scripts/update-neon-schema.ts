#!/usr/bin/env tsx
/**
 * Update Neon DB schema to match Supabase export
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

async function updateSchema() {
  console.log('🔄 Updating Neon DB schema to match Supabase export...\n');
  
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

    // Add missing columns to users table
    console.log('📝 Adding missing columns to users table...');
    try {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS course VARCHAR(50) DEFAULT 'electrician'
      `);
      console.log('   ✅ Added course column to users\n');
    } catch (error: any) {
      console.log(`   ℹ️  Column might already exist: ${error.message}\n`);
    }

    // Add missing columns to knowledge_chunks table
    console.log('📝 Adding missing columns to knowledge_chunks table...');
    try {
      await client.query(`
        ALTER TABLE knowledge_chunks 
        ADD COLUMN IF NOT EXISTS trade_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS module_name VARCHAR(255)
      `);
      console.log('   ✅ Added trade_type and module_name columns to knowledge_chunks\n');
    } catch (error: any) {
      console.log(`   ℹ️  Columns might already exist: ${error.message}\n`);
    }

    // Verify the schema
    console.log('🔍 Verifying schema updates...\n');
    
    const usersColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Users table columns:');
    usersColumns.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    const chunksColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_chunks' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Knowledge_chunks table columns:');
    chunksColumns.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });

    console.log('\n🎉 Schema update completed successfully!');
    console.log('\n📋 Next step: Run the import script again');
    console.log('   npx tsx scripts/import-supabase-to-neon.ts\n');

    client.release();
    await pool.end();
    
  } catch (error: any) {
    console.error('\n❌ Schema update failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

updateSchema();
