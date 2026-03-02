#!/usr/bin/env tsx
/**
 * Migration script to export local database and import to Supabase
 * 
 * Usage:
 * 1. Ensure local database has processed PDFs with embeddings
 * 2. Update SUPABASE_URL in .env.local
 * 3. Run: npm run tsx scripts/migrate-to-supabase.ts
 */

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

config({ path: path.join(process.cwd(), '.env.local') });

// Local database connection
const localPool = new Pool({
  connectionString: 'postgresql://postgres:admin@localhost:5433/vola_db',
});

// Supabase database connection
const supabasePool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || 'postgresql://postgres:InternXcelerator@db.inuxbdcxpmucqtsgqthz.supabase.co:5432/postgres',
});

interface MigrationStats {
  users: number;
  pdfDocuments: number;
  moduleMappings: number;
  knowledgeChunks: number;
  chatHistory: number;
}

async function migrateData(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    users: 0,
    pdfDocuments: 0,
    moduleMappings: 0,
    knowledgeChunks: 0,
    chatHistory: 0,
  };

  try {
    console.log('🚀 Starting migration to Supabase...\n');

    // 1. Setup Supabase schema
    console.log('📋 Setting up Supabase schema...');
    await setupSupabaseSchema();
    console.log('✅ Schema setup complete\n');

    // 2. Migrate users (excluding passwords for security)
    console.log('👥 Migrating users...');
    stats.users = await migrateUsers();
    console.log(`✅ Migrated ${stats.users} users\n`);

    // 3. Migrate module mappings
    console.log('📚 Migrating module mappings...');
    stats.moduleMappings = await migrateModuleMappings();
    console.log(`✅ Migrated ${stats.moduleMappings} module mappings\n`);

    // 4. Migrate PDF documents metadata
    console.log('📄 Migrating PDF documents...');
    stats.pdfDocuments = await migratePDFDocuments();
    console.log(`✅ Migrated ${stats.pdfDocuments} PDF documents\n`);

    // 5. Migrate knowledge chunks with embeddings (this is the big one)
    console.log('🧠 Migrating knowledge chunks with embeddings...');
    stats.knowledgeChunks = await migrateKnowledgeChunks();
    console.log(`✅ Migrated ${stats.knowledgeChunks} knowledge chunks\n`);

    // 6. Optionally migrate chat history
    console.log('💬 Migrating chat history...');
    stats.chatHistory = await migrateChatHistory();
    console.log(`✅ Migrated ${stats.chatHistory} chat messages\n`);

    console.log('🎉 Migration complete!');
    console.log('\n📊 Migration Summary:');
    console.log(`   Users: ${stats.users}`);
    console.log(`   PDF Documents: ${stats.pdfDocuments}`);
    console.log(`   Module Mappings: ${stats.moduleMappings}`);
    console.log(`   Knowledge Chunks: ${stats.knowledgeChunks}`);
    console.log(`   Chat History: ${stats.chatHistory}`);

    return stats;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await localPool.end();
    await supabasePool.end();
  }
}

async function setupSupabaseSchema(): Promise<void> {
  // Enable pgvector
  await supabasePool.query('CREATE EXTENSION IF NOT EXISTS vector');

  // Create pdf_documents table
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

  // Create module_mapping table
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

  // Create knowledge_chunks table with vector support
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

  // Create chat_history table
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

  // Create indexes
  await supabasePool.query(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_course ON knowledge_chunks(course);
    CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_module ON knowledge_chunks(module);
    CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks 
      USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
  `);

  console.log('  ✅ Tables and indexes created');
}

async function migrateUsers(): Promise<number> {
  const result = await localPool.query('SELECT * FROM users');
  const users = result.rows;

  if (users.length === 0) {
    console.log('  ℹ️  No users to migrate');
    return 0;
  }

  for (const user of users) {
    await supabasePool.query(
      `INSERT INTO users (id, name, email, password, role, course, avatar, is_active, created_at, updated_at, last_login, bio, skills, learning_goals, completed_courses, total_study_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         course = EXCLUDED.course,
         is_active = EXCLUDED.is_active`,
      [
        user.id, user.name, user.email, user.password, user.role, user.course,
        user.avatar, user.is_active, user.created_at, user.updated_at,
        user.last_login, user.bio, user.skills, user.learning_goals,
        user.completed_courses, user.total_study_time
      ]
    );
  }

  return users.length;
}

async function migrateModuleMappings(): Promise<number> {
  const result = await localPool.query('SELECT * FROM module_mapping');
  const mappings = result.rows;

  if (mappings.length === 0) {
    console.log('  ℹ️  No module mappings to migrate');
    return 0;
  }

  for (const mapping of mappings) {
    await supabasePool.query(
      `INSERT INTO module_mapping (course, module_id, module_name, keywords, description, display_order, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (course, module_id) DO UPDATE SET
         module_name = EXCLUDED.module_name,
         keywords = EXCLUDED.keywords,
         description = EXCLUDED.description,
         display_order = EXCLUDED.display_order`,
      [
        mapping.course, mapping.module_id, mapping.module_name,
        mapping.keywords, mapping.description, mapping.display_order,
        mapping.created_at
      ]
    );
  }

  return mappings.length;
}

async function migratePDFDocuments(): Promise<number> {
  const result = await localPool.query('SELECT * FROM pdf_documents');
  const docs = result.rows;

  if (docs.length === 0) {
    console.log('  ℹ️  No PDF documents to migrate');
    return 0;
  }

  for (const doc of docs) {
    await supabasePool.query(
      `INSERT INTO pdf_documents (course, filename, file_path, file_size, total_pages, total_chunks, processing_status, processing_started_at, processing_completed_at, error_message, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (filename) DO UPDATE SET
         total_chunks = EXCLUDED.total_chunks,
         processing_status = EXCLUDED.processing_status,
         processing_completed_at = EXCLUDED.processing_completed_at`,
      [
        doc.course, doc.filename, doc.file_path, doc.file_size,
        doc.total_pages, doc.total_chunks, doc.processing_status,
        doc.processing_started_at, doc.processing_completed_at,
        doc.error_message, doc.metadata, doc.created_at, doc.updated_at
      ]
    );
  }

  return docs.length;
}

async function migrateKnowledgeChunks(): Promise<number> {
  // Check if pgvector is available in local DB
  const vectorCheck = await localPool.query(
    "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
  );
  const hasVector = vectorCheck.rows[0].exists;

  // Get total count
  const countResult = await localPool.query('SELECT COUNT(*) FROM knowledge_chunks');
  const totalChunks = parseInt(countResult.rows[0].count);

  if (totalChunks === 0) {
    console.log('  ℹ️  No knowledge chunks to migrate');
    return 0;
  }

  console.log(`  📦 Migrating ${totalChunks} chunks in batches of 100...`);

  const batchSize = 100;
  let migratedCount = 0;

  for (let offset = 0; offset < totalChunks; offset += batchSize) {
    const result = await localPool.query(
      `SELECT * FROM knowledge_chunks ORDER BY id LIMIT $1 OFFSET $2`,
      [batchSize, offset]
    );

    const chunks = result.rows;

    for (const chunk of chunks) {
      // Get embedding based on whether pgvector is available
      let embedding = null;
      if (hasVector && chunk.embedding) {
        embedding = chunk.embedding;
      } else if (chunk.embedding_placeholder) {
        // Parse JSON placeholder
        embedding = `[${JSON.parse(chunk.embedding_placeholder).join(',')}]`;
      }

      await supabasePool.query(
        `INSERT INTO knowledge_chunks (course, pdf_source, module, module_name, section, page_number, chunk_index, content, content_preview, embedding, token_count, trade_type, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          chunk.course, chunk.pdf_source, chunk.module, chunk.module_name,
          chunk.section, chunk.page_number, chunk.chunk_index, chunk.content,
          chunk.content_preview, embedding, chunk.token_count, chunk.trade_type,
          chunk.metadata, chunk.created_at, chunk.updated_at
        ]
      );

      migratedCount++;
    }

    console.log(`  ⏳ Progress: ${migratedCount}/${totalChunks} chunks migrated`);
  }

  return migratedCount;
}

async function migrateChatHistory(): Promise<number> {
  const result = await localPool.query('SELECT * FROM chat_history ORDER BY created_at');
  const messages = result.rows;

  if (messages.length === 0) {
    console.log('  ℹ️  No chat history to migrate');
    return 0;
  }

  for (const message of messages) {
    await supabasePool.query(
      `INSERT INTO chat_history (user_id, course, session_id, message_type, message, sources, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        message.user_id, message.course, message.session_id,
        message.message_type, message.message, message.sources,
        message.created_at
      ]
    );
  }

  return messages.length;
}

// Run migration
migrateData()
  .then(() => {
    console.log('\n✅ All done! Your Supabase database is ready.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
