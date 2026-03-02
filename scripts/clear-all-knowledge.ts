#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

config({ path: path.join(process.cwd(), '.env.local') });

async function clearAllKnowledge() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
    password: 'admin',
  });

  try {
    console.log('🗑️  Clearing all knowledge base data...\n');

    // Clear knowledge chunks
    const chunksResult = await pool.query('DELETE FROM knowledge_chunks');
    console.log(`✅ Deleted ${chunksResult.rowCount} knowledge chunks`);

    // Clear module syllabus if exists
    try {
      const syllabusResult = await pool.query('DELETE FROM module_syllabus');
      console.log(`✅ Deleted ${syllabusResult.rowCount} syllabus entries`);
    } catch (error) {
      console.log('ℹ️  module_syllabus table does not exist yet');
    }

    // Clear module topics if exists
    try {
      const topicsResult = await pool.query('DELETE FROM module_topics');
      console.log(`✅ Deleted ${topicsResult.rowCount} module topics`);
    } catch (error) {
      console.log('ℹ️  module_topics table does not exist yet');
    }

    console.log('\n✅ Knowledge base cleared successfully!');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

clearAllKnowledge();
