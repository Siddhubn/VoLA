#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

config({ path: path.join(process.cwd(), '.env.local') });

async function setupDatabaseSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
    password: 'admin',
  });

  try {
    console.log('🗄️  Setting up database schema...\n');

    // Enable pgvector extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('✅ pgvector extension enabled');

    // Update knowledge_chunks table for BGE embeddings (384 dimensions)
    await pool.query(`
      ALTER TABLE knowledge_chunks 
      ALTER COLUMN embedding TYPE vector(384)
    `);
    console.log('✅ Updated knowledge_chunks for BGE embeddings (384 dimensions)');

    // Create module_syllabus table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS module_syllabus (
        id SERIAL PRIMARY KEY,
        course VARCHAR(50) NOT NULL,
        trade_type VARCHAR(20) NOT NULL,
        module_id VARCHAR(255) NOT NULL,
        module_name VARCHAR(255) NOT NULL,
        module_number INTEGER,
        topics JSONB NOT NULL,
        extracted_from VARCHAR(10) DEFAULT 'index',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(course, trade_type, module_id)
      );
    `);
    console.log('✅ Created module_syllabus table');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_module_syllabus_course_trade 
      ON module_syllabus(course, trade_type);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_module_syllabus_module 
      ON module_syllabus(course, trade_type, module_id);
    `);
    console.log('✅ Created indexes on module_syllabus');

    // Show table structures
    console.log('\n📋 Database Schema:');
    
    const syllabusColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'module_syllabus' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nmodule_syllabus:');
    syllabusColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    const chunksColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_chunks' 
      ORDER BY ordinal_position
    `);
    
    console.log('\nknowledge_chunks:');
    chunksColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ Database schema setup complete!');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

setupDatabaseSchema();
