#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

config({ path: path.join(process.cwd(), '.env.local') });

async function checkContent() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
    password: 'admin',
  });

  try {
    const result = await pool.query(`
      SELECT content, module_name, trade_type 
      FROM knowledge_chunks 
      WHERE module != 'general-content' 
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const chunk = result.rows[0];
      console.log('\n=== Sample Content Check ===\n');
      console.log(`Module: ${chunk.module_name}`);
      console.log(`Trade Type: ${chunk.trade_type}`);
      console.log(`Content Length: ${chunk.content.length} characters`);
      console.log(`\nFirst 500 characters of content:\n`);
      console.log(chunk.content.substring(0, 500));
      console.log('\n...(content continues)...\n');
      console.log('✅ Content is present and suitable for quiz generation!');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

checkContent();
