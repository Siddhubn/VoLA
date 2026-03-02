#!/usr/bin/env tsx
/**
 * Test Neon database connection
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

async function testConnection() {
  console.log('🔍 Testing Neon DB connection...\n');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }
  
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

    // Check database name
    const dbCheck = await client.query('SELECT current_database()');
    console.log(`\n📁 Current database: ${dbCheck.rows[0].current_database}`);

    // Check if pgvector extension exists
    const vectorCheck = await client.query(
      "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
    );
    const hasVector = vectorCheck.rows[0].exists;
    console.log(`${hasVector ? '✅' : '⚠️ '} pgvector extension ${hasVector ? 'installed' : 'not installed'}`);

    // Check existing tables
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`\n📋 Existing tables (${tablesCheck.rows.length}):`);
    if (tablesCheck.rows.length > 0) {
      tablesCheck.rows.forEach((row: any) => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('  (no tables found - database is empty)');
    }

    client.release();
    await pool.end();
    
    console.log('\n🎉 Connection test successful!');
    console.log('\n✅ Neon DB is ready to use with your Next.js application');
  } catch (error: any) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('\nError details:', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall
    });
    console.error('\nPossible issues:');
    console.error('  1. Check if the Neon database URL is correct');
    console.error('  2. Verify the database password');
    console.error('  3. Ensure the Neon project is active (not suspended)');
    console.error('  4. Check your internet connection');
    await pool.end();
    process.exit(1);
  }
}

testConnection();
