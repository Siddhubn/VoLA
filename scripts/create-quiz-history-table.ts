#!/usr/bin/env tsx
/**
 * Create quiz_history table
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
  console.log('🚀 Creating quiz_history table\n');
  console.log('═'.repeat(60));
  
  try {
    // Create quiz_history table
    await query(`
      CREATE TABLE IF NOT EXISTS quiz_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course VARCHAR(100) NOT NULL,
        module VARCHAR(200) NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage NUMERIC(5,2) NOT NULL,
        time_spent INTEGER NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created quiz_history table');
    
    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_quiz_history_user_id ON quiz_history(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_quiz_history_course ON quiz_history(course)');
    await query('CREATE INDEX IF NOT EXISTS idx_quiz_history_completed_at ON quiz_history(completed_at DESC)');
    console.log('✅ Created indexes');
    
    // Verify table
    const result = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'quiz_history'
      ORDER BY ordinal_position
    `);
    
    console.log(`\n✅ Table verified with ${result.rows.length} columns:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Quiz history table created successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
