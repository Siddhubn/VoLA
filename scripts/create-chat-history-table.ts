#!/usr/bin/env tsx
/**
 * Create chat_history table
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
  console.log('🚀 Creating chat_history table\n');
  console.log('═'.repeat(60));
  
  try {
    // Create chat_history table
    await query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        trade VARCHAR(50) NOT NULL DEFAULT 'electrician',
        session_id UUID NOT NULL,
        message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant')),
        message TEXT NOT NULL,
        sources JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created chat_history table');
    
    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_chat_history_trade ON chat_history(trade)');
    await query('CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC)');
    await query('CREATE INDEX IF NOT EXISTS idx_chat_history_user_trade ON chat_history(user_id, trade)');
    console.log('✅ Created indexes');
    
    // Verify table
    const result = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'chat_history'
      ORDER BY ordinal_position
    `);
    
    console.log(`\n✅ Table verified with ${result.rows.length} columns:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Chat history table created successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();