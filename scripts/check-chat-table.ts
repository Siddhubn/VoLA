#!/usr/bin/env tsx
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

async function main() {
  try {
    const client = await pool.connect();
    
    // Check if table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'chat_history'
      )
    `);
    
    console.log('Table exists:', tableExists.rows[0].exists);
    
    if (tableExists.rows[0].exists) {
      // Get columns
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'chat_history'
        ORDER BY ordinal_position
      `);
      
      console.log('\nColumns:');
      columns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }
    
    client.release();
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();