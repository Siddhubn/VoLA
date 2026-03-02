#!/usr/bin/env tsx
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  
  const result = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'knowledge_chunks'
    ORDER BY ordinal_position
  `);
  
  console.log('knowledge_chunks columns:');
  result.rows.forEach((row: any) => {
    console.log(`  - ${row.column_name}: ${row.data_type}`);
  });
  
  client.release();
  await pool.end();
}

checkSchema();
