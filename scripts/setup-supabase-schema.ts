#!/usr/bin/env tsx
/**
 * Setup Supabase schema with pgvector extension
 * This creates all necessary tables and indexes in Supabase
 */

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

config({ path: path.join(process.cwd(), '.env.local') });

const supabasePool = new Pool({
  connectionString: 'postgresql://postgres:InternXcelerator@db.inuxbdcxpmucqtsgqthz.supabase.co:5432/postgres',
});

async function setupSupabaseSchema(): Promise<void> {
  try {
    console.log('🚀 Setting up Supabase schema...\n');

    // 1. Enable pgvector extension
    console.log('📦 Enabling pgvector extension...');
    await supabasePool.query('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('✅ pgvector extension enabled\n');

    // 2. Create users table
    console.log('👥 Creating users table...');
    await supabasePool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
        course VARCHAR(50) CHECK (course IN ('fitter', 'electrician')),
        avatar TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE,
        bio TEXT DEFAULT '',
        skills TEXT[] DEFAULT '{}',
        learning_goals TEXT[] DEFAULT '{}',
        completed_courses INTEGER DEFAULT 0,
        total_study_time INTEGER DEFAULT 0
      )
    `);
    console.log('✅ Users table created\n');

    // 3. Create pdf_documents table
    console.log('📄 Creating pdf_documents table...');
    await supabasePool.query(`
      CREATE TABLE IF NOT EXISTS pdf_documents (
        id SERIAL PRIMARY KEY,
        course VARCHAR(50) NOT NULL,
        filename VARCHAR(255) NOT NULL UNIQUE,
        file_path TEXT NOT NULL,
        file_size BIGINT,
        total_pages INTEGER,
        total_chunks INTEGER,
        processing_status VARCHAR(20) DEFAULT 'completed',
        processing_started_at TIMESTAMP,
        processing_completed_at TIMESTAMP,
        error_message TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ PDF documents table created\n');

    // 4. Create module_mapping table
    console.log('📚 Creating module_mapping table...');
    await supabasePool.query(`
      CREATE TABLE IF NOT EXISTS module_mapping (
        id SERIAL PRIMARY KEY,
        course VARCHAR(50) NOT NULL,
        module_id VARCHAR(255) NOT NULL,
        module_name VARCHAR(255) NOT NULL,
        keywords TEXT[],
        description TEXT,
        display_order INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(course, module_id)
      )
    `);
    console.log('✅ Module mapping table created\n');

    // 5. Create knowledge_chunks table with vector support
    console.log('🧠 Creating knowledge_chunks table with vector(384)...');
    await supabasePool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id SERIAL PRIMARY KEY,
        course VARCHAR(50) NOT NULL,
        pdf_source VARCHAR(255) NOT NULL,
        module VARCHAR(255),
        module_name VARCHAR(255),
        section TEXT,
        page_number INTEGER,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        content_preview TEXT,
        embedding vector(384),
        token_count INTEGER,
        trade_type VARCHAR(50),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Knowledge chunks table created\n');

    // 6. Create chat_history table
    console.log('💬 Creating chat_history table...');
    await supabasePool.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        course VARCHAR(50),
        session_id UUID NOT NULL,
        message_type VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        sources JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Chat history table created\n');

    // 7. Create quiz_history table
    console.log('📝 Creating quiz_history table...');
    await supabasePool.query(`
      CREATE TABLE IF NOT EXISTS quiz_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        course VARCHAR(50) NOT NULL,
        module VARCHAR(100) NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage DECIMAL(5,2) NOT NULL,
        time_spent INTEGER NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        answers JSONB
      )
    `);
    console.log('✅ Quiz history table created\n');

    // 8. Create indexes
    console.log('🔍 Creating indexes...');
    
    // Users indexes
    await supabasePool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_course ON users(course);
    `);
    
    // Knowledge chunks indexes
    await supabasePool.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_course ON knowledge_chunks(course);
      CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_module ON knowledge_chunks(module);
      CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_pdf_source ON knowledge_chunks(pdf_source);
    `);
    
    // Vector similarity search index (HNSW for fast approximate nearest neighbor search)
    console.log('  🎯 Creating HNSW vector index (this may take a moment)...');
    await supabasePool.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks 
      USING hnsw (embedding vector_cosine_ops) 
      WITH (m = 16, ef_construction = 64);
    `);
    
    console.log('✅ All indexes created\n');

    // 9. Verify setup
    console.log('🔍 Verifying setup...\n');
    
    const tables = ['users', 'pdf_documents', 'module_mapping', 'knowledge_chunks', 'chat_history', 'quiz_history'];
    for (const table of tables) {
      const result = await supabasePool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        )`,
        [table]
      );
      const exists = result.rows[0].exists;
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }

    // Check pgvector
    const vectorCheck = await supabasePool.query(
      "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
    );
    const hasVector = vectorCheck.rows[0].exists;
    console.log(`  ${hasVector ? '✅' : '❌'} pgvector extension`);

    console.log('\n🎉 Supabase schema setup complete!');
    console.log('\n📋 Next step: Run migration script to copy data');
    console.log('   npx tsx scripts/migrate-to-supabase.ts\n');

  } catch (error) {
    console.error('❌ Error setting up schema:', error);
    throw error;
  } finally {
    await supabasePool.end();
  }
}

// Run setup
setupSupabaseSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
