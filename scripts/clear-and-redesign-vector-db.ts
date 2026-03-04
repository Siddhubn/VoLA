#!/usr/bin/env tsx
/**
 * Clear and Redesign Vector Database
 * 
 * This script:
 * 1. Backs up existing data
 * 2. Drops old knowledge_chunks table
 * 3. Creates new improved schema with better organization
 * 4. Sets up proper indexes for performance
 */

import { config } from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { Pool } from 'pg';

// Load environment variables first
config({ path: path.join(process.cwd(), '.env.local') });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  console.error('   Please check .env.local file');
  process.exit(1);
}

// Create database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : {
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

interface BackupData {
  timestamp: string;
  totalChunks: number;
  chunks: any[];
}

/**
 * Backup existing data before clearing
 */
async function backupExistingData(): Promise<void> {
  console.log('\n📦 Backing up existing data...');
  
  try {
    // Check if table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'knowledge_chunks'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('   ℹ️  No existing knowledge_chunks table found');
      return;
    }
    
    // Get all existing chunks
    const result = await query('SELECT * FROM knowledge_chunks');
    
    if (result.rows.length === 0) {
      console.log('   ℹ️  No data to backup');
      return;
    }
    
    const backup: BackupData = {
      timestamp: new Date().toISOString(),
      totalChunks: result.rows.length,
      chunks: result.rows
    };
    
    // Save backup to file
    const backupDir = 'backups';
    await fs.mkdir(backupDir, { recursive: true });
    
    const backupFile = path.join(
      backupDir,
      `knowledge_chunks_backup_${Date.now()}.json`
    );
    
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`   ✅ Backed up ${result.rows.length} chunks to: ${backupFile}`);
    
  } catch (error: any) {
    console.error('   ❌ Backup failed:', error.message);
    throw error;
  }
}

/**
 * Drop existing tables
 */
async function dropExistingTables(): Promise<void> {
  console.log('\n🗑️  Dropping existing tables...');
  
  try {
    // Drop knowledge_chunks table
    await query('DROP TABLE IF EXISTS knowledge_chunks CASCADE');
    console.log('   ✅ Dropped knowledge_chunks table');
    
    // Drop any related indexes
    await query('DROP INDEX IF EXISTS idx_knowledge_chunks_module CASCADE');
    await query('DROP INDEX IF EXISTS idx_knowledge_chunks_trade_type CASCADE');
    await query('DROP INDEX IF EXISTS idx_knowledge_chunks_content_type CASCADE');
    console.log('   ✅ Dropped related indexes');
    
  } catch (error: any) {
    console.error('   ❌ Drop failed:', error.message);
    throw error;
  }
}

/**
 * Create new improved schema
 */
async function createNewSchema(): Promise<void> {
  console.log('\n🏗️  Creating new improved schema...');
  
  try {
    // Enable pgvector extension
    await query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('   ✅ Enabled pgvector extension');
    
    // Create new knowledge_chunks table with improved structure
    await query(`
      CREATE TABLE knowledge_chunks (
        id SERIAL PRIMARY KEY,
        
        -- Content
        content TEXT NOT NULL,
        content_hash VARCHAR(64) UNIQUE NOT NULL,
        
        -- Organization
        trade VARCHAR(50) NOT NULL,           -- 'electrician', 'fitter', etc.
        trade_type VARCHAR(10) NOT NULL,      -- 'TT' or 'TP'
        module_id VARCHAR(20) NOT NULL,       -- 'module-1', 'module-2', etc.
        module_name VARCHAR(200) NOT NULL,    -- 'Safety practice and hand tools'
        module_number INTEGER NOT NULL,       -- 1, 2, 3, etc.
        
        -- Content Classification
        content_type VARCHAR(50) NOT NULL,    -- 'module_overview', 'theory', 'practical', 'safety', 'tools', 'example'
        section_title VARCHAR(300),           -- Topic/section heading
        topic_keywords TEXT[],                -- Array of relevant keywords
        
        -- Source Information
        source_file VARCHAR(300) NOT NULL,    -- Original PDF filename
        page_start INTEGER,                   -- Starting page number
        page_end INTEGER,                     -- Ending page number
        
        -- Vector Embedding
        embedding vector(384),                -- 384-dimensional embedding
        
        -- Metadata
        chunk_index INTEGER NOT NULL,         -- Order within module
        total_chunks INTEGER,                 -- Total chunks in this module
        is_synthetic BOOLEAN DEFAULT false,   -- True for generated overview chunks
        priority INTEGER DEFAULT 5,           -- 1-10, higher = more important
        
        -- Quality Metrics
        char_count INTEGER NOT NULL,
        word_count INTEGER NOT NULL,
        sentence_count INTEGER,
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraints
        CONSTRAINT valid_trade_type CHECK (trade_type IN ('TT', 'TP')),
        CONSTRAINT valid_content_type CHECK (
          content_type IN (
            'module_overview', 'theory', 'practical', 'safety', 
            'tools', 'example', 'definition', 'procedure', 'curriculum'
          )
        ),
        CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 10),
        CONSTRAINT valid_module_number CHECK (module_number > 0)
      )
    `);
    console.log('   ✅ Created knowledge_chunks table');
    
    // Create indexes for performance
    console.log('\n📊 Creating indexes...');
    
    const indexes = [
      // Primary search indexes
      'CREATE INDEX idx_kc_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)',
      
      // Organization indexes
      'CREATE INDEX idx_kc_trade ON knowledge_chunks(trade)',
      'CREATE INDEX idx_kc_trade_type ON knowledge_chunks(trade_type)',
      'CREATE INDEX idx_kc_module_id ON knowledge_chunks(module_id)',
      'CREATE INDEX idx_kc_module_number ON knowledge_chunks(module_number)',
      
      // Content classification indexes
      'CREATE INDEX idx_kc_content_type ON knowledge_chunks(content_type)',
      'CREATE INDEX idx_kc_priority ON knowledge_chunks(priority DESC)',
      'CREATE INDEX idx_kc_is_synthetic ON knowledge_chunks(is_synthetic)',
      
      // Composite indexes for common queries
      'CREATE INDEX idx_kc_trade_module ON knowledge_chunks(trade, module_id)',
      'CREATE INDEX idx_kc_trade_type_module ON knowledge_chunks(trade, trade_type, module_id)',
      'CREATE INDEX idx_kc_content_priority ON knowledge_chunks(content_type, priority DESC)',
      
      // Full-text search index
      'CREATE INDEX idx_kc_content_fts ON knowledge_chunks USING gin(to_tsvector(\'english\', content))',
      
      // Timestamp indexes
      'CREATE INDEX idx_kc_created_at ON knowledge_chunks(created_at DESC)'
    ];
    
    for (const indexQuery of indexes) {
      await query(indexQuery);
      console.log(`   ✅ Created index`);
    }
    
    // Create updated_at trigger
    await query(`
      CREATE OR REPLACE FUNCTION update_knowledge_chunks_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await query(`
      CREATE TRIGGER update_knowledge_chunks_updated_at
        BEFORE UPDATE ON knowledge_chunks
        FOR EACH ROW
        EXECUTE FUNCTION update_knowledge_chunks_updated_at();
    `);
    console.log('   ✅ Created update trigger');
    
  } catch (error: any) {
    console.error('   ❌ Schema creation failed:', error.message);
    throw error;
  }
}

/**
 * Create helper views for easy querying
 */
async function createHelperViews(): Promise<void> {
  console.log('\n👁️  Creating helper views...');
  
  try {
    // View for module summaries
    await query(`
      CREATE OR REPLACE VIEW module_summaries AS
      SELECT 
        trade,
        trade_type,
        module_id,
        module_name,
        module_number,
        COUNT(*) as chunk_count,
        SUM(word_count) as total_words,
        AVG(priority) as avg_priority,
        MIN(created_at) as first_chunk_created,
        MAX(updated_at) as last_updated
      FROM knowledge_chunks
      GROUP BY trade, trade_type, module_id, module_name, module_number
      ORDER BY trade, trade_type, module_number;
    `);
    console.log('   ✅ Created module_summaries view');
    
    // View for content type distribution
    await query(`
      CREATE OR REPLACE VIEW content_type_stats AS
      SELECT 
        trade,
        trade_type,
        content_type,
        COUNT(*) as chunk_count,
        AVG(word_count) as avg_words,
        AVG(priority) as avg_priority
      FROM knowledge_chunks
      GROUP BY trade, trade_type, content_type
      ORDER BY trade, trade_type, content_type;
    `);
    console.log('   ✅ Created content_type_stats view');
    
  } catch (error: any) {
    console.error('   ❌ View creation failed:', error.message);
    throw error;
  }
}

/**
 * Verify new schema
 */
async function verifySchema(): Promise<void> {
  console.log('\n✅ Verifying new schema...');
  
  try {
    // Check table structure
    const columns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'knowledge_chunks'
      ORDER BY ordinal_position;
    `);
    
    console.log(`   ✅ Table has ${columns.rows.length} columns`);
    
    // Check indexes
    const indexes = await query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'knowledge_chunks';
    `);
    
    console.log(`   ✅ Created ${indexes.rows.length} indexes`);
    
    // Check views
    const views = await query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_name IN ('module_summaries', 'content_type_stats');
    `);
    
    console.log(`   ✅ Created ${views.rows.length} helper views`);
    
  } catch (error: any) {
    console.error('   ❌ Verification failed:', error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Vector Database Redesign\n');
  console.log('═'.repeat(60));
  
  try {
    // Step 1: Backup existing data
    await backupExistingData();
    
    // Step 2: Drop existing tables
    await dropExistingTables();
    
    // Step 3: Create new schema
    await createNewSchema();
    
    // Step 4: Create helper views
    await createHelperViews();
    
    // Step 5: Verify
    await verifySchema();
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Database redesign complete!\n');
    console.log('📋 New Schema Features:');
    console.log('   • Improved organization (trade, module, content type)');
    console.log('   • Better content classification');
    console.log('   • Priority-based ranking');
    console.log('   • Full-text search support');
    console.log('   • Optimized indexes for fast queries');
    console.log('   • Helper views for analytics');
    console.log('\n💡 Next Steps:');
    console.log('   1. Run the new PDF processing script');
    console.log('   2. Process curriculum documents first');
    console.log('   3. Then process module PDFs');
    console.log('   4. Verify data quality');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { backupExistingData, dropExistingTables, createNewSchema, verifySchema };
