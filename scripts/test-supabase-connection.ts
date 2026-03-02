#!/usr/bin/env tsx
/**
 * Test Supabase database connection
 */

import { Pool } from 'pg';

const connectionString = 'postgresql://postgres:InternXcelerator@db.inuxbdcxpmucqtsgqthz.supabase.co:5432/postgres';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@'));
  
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('\n⏳ Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Connected successfully!\n');

    // Test query
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:');
    console.log(result.rows[0].version);

    // Check pgvector
    const vectorCheck = await client.query(
      "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
    );
    const hasVector = vectorCheck.rows[0].exists;
    console.log(`\n${hasVector ? '✅' : '❌'} pgvector extension ${hasVector ? 'installed' : 'not installed'}`);

    client.release();
    await pool.end();
    
    console.log('\n🎉 Connection test successful!');
  } catch (error: any) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\nPossible issues:');
    console.error('  1. Check if the Supabase project URL is correct');
    console.error('  2. Verify the database password');
    console.error('  3. Check if your IP is allowed in Supabase (Settings → Database → Connection pooling)');
    console.error('  4. Ensure the Supabase project is not paused');
    await pool.end();
    process.exit(1);
  }
}

testConnection();
