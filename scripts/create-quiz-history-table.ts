#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

config({ path: path.join(process.cwd(), '.env.local') });

async function createQuizHistoryTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
    password: 'admin',
  });

  try {
    console.log('🗄️  Creating quiz_history table...\n');

    // Create the table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quiz_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        course VARCHAR(50) NOT NULL,
        module VARCHAR(255) NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage INTEGER NOT NULL,
        time_spent INTEGER DEFAULT 0,
        completed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quiz_history_user_id 
      ON quiz_history(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quiz_history_completed_at 
      ON quiz_history(completed_at DESC);
    `);

    console.log('✅ quiz_history table created successfully');
    console.log('✅ Indexes created');

    // Check if table exists and show structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'quiz_history'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Table structure:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error creating table:', (error as Error).message);
    process.exit(1);
  }
}

createQuizHistoryTable();
