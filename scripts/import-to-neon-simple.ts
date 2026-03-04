#!/usr/bin/env tsx
/**
 * Simple import to Neon DB - imports data in smaller batches
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function importData() {
  console.log('🔍 Importing data to Neon DB...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Load export data
    const exportFile = path.join(process.cwd(), 'supabase-export', 'neon-migration-data.json');
    const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf-8'));
    console.log('📂 Loaded export data\n');

    // Import users
    if (exportData.users?.length > 0) {
      console.log(`📊 Importing ${exportData.users.length} users...`);
      for (const user of exportData.users) {
        await pool.query(`
          INSERT INTO users (id, name, email, password, role, avatar, is_active, created_at, updated_at, last_login, bio, skills, learning_goals, completed_courses, total_study_time)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (email) DO NOTHING
        `, [user.id, user.name, user.email, user.password, user.role, user.avatar, user.is_active, user.created_at, user.updated_at, user.last_login, user.bio, user.skills, user.learning_goals, user.completed_courses, user.total_study_time]);
      }
      await pool.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
      console.log(`  ✅ Imported ${exportData.users.length} users`);
    }

    // Import PDF documents
    if (exportData.pdf_documents?.length > 0) {
      console.log(`📊 Importing ${exportData.pdf_documents.length} PDF documents...`);
      for (const doc of exportData.pdf_documents) {
        await pool.query(`
          INSERT INTO pdf_documents (id, course, filename, file_path, file_size, total_pages, total_chunks, processing_status, processing_started_at, processing_completed_at, error_message, metadata, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (filename) DO NOTHING
        `, [doc.id, doc.course, doc.filename, doc.file_path, doc.file_size, doc.total_pages, doc.total_chunks, doc.processing_status, doc.processing_started_at, doc.processing_completed_at, doc.error_message, doc.metadata, doc.created_at, doc.updated_at]);
      }
      await pool.query(`SELECT setval('pdf_documents_id_seq', (SELECT MAX(id) FROM pdf_documents))`);
      console.log(`  ✅ Imported ${exportData.pdf_documents.length} PDF documents`);
    }

    // Import knowledge chunks
    if (exportData.knowledge_chunks?.length > 0) {
      console.log(`📊 Importing ${exportData.knowledge_chunks.length} knowledge chunks...`);
      let imported = 0;
      let withEmbeddings = 0;
      
      for (const chunk of exportData.knowledge_chunks) {
        let embeddingValue = null;
        if (chunk.embedding) {
          if (typeof chunk.embedding === 'string') {
            embeddingValue = chunk.embedding;
          } else if (Array.isArray(chunk.embedding)) {
            embeddingValue = `[${chunk.embedding.join(',')}]`;
          }
          withEmbeddings++;
        } else if (chunk.embedding_placeholder) {
          const parsed = JSON.parse(chunk.embedding_placeholder);
          if (Array.isArray(parsed)) {
            embeddingValue = `[${parsed.join(',')}]`;
            withEmbeddings++;
          }
        }

        try {
          await pool.query(`
            INSERT INTO knowledge_chunks (id, course, pdf_source, module, section, page_number, chunk_index, content, content_preview, embedding, token_count, metadata, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          `, [chunk.id, chunk.course, chunk.pdf_source, chunk.module, chunk.section, chunk.page_number, chunk.chunk_index, chunk.content, chunk.content_preview, embeddingValue, chunk.token_count, chunk.metadata, chunk.created_at, chunk.updated_at]);
        } catch (err: any) {
          if (err.code !== '23505') {
            console.error(`Error importing chunk ${chunk.id}:`, err.message);
          }
        }
        
        imported++;
        if (imported % 100 === 0) {
          console.log(`   Progress: ${imported}/${exportData.knowledge_chunks.length}`);
        }
      }
      
      await pool.query(`SELECT setval('knowledge_chunks_id_seq', (SELECT MAX(id) FROM knowledge_chunks))`);
      console.log(`  ✅ Imported ${imported} chunks (${withEmbeddings} with embeddings)`);
    }

    // Import chat history
    if (exportData.chat_history?.length > 0) {
      console.log(`📊 Importing ${exportData.chat_history.length} chat messages...`);
      for (const chat of exportData.chat_history) {
        try {
          await pool.query(`
            INSERT INTO chat_history (id, user_id, course, session_id, message_type, message, sources, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [chat.id, chat.user_id, chat.course, chat.session_id, chat.message_type, chat.message, chat.sources, chat.created_at]);
        } catch (err: any) {
          if (err.code !== '23505') throw err;
        }
      }
      await pool.query(`SELECT setval('chat_history_id_seq', (SELECT MAX(id) FROM chat_history))`);
      console.log(`  ✅ Imported ${exportData.chat_history.length} chat messages`);
    }

    // Create vector index
    console.log('\n🔄 Creating vector similarity index...');
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx 
        ON knowledge_chunks 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);
      console.log('  ✅ Vector index created');
    } catch (error: any) {
      console.log('  ⚠️  Vector index:', error.message);
    }

    // Print summary
    console.log('\n📊 Final Summary:');
    const counts = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM pdf_documents'),
      pool.query('SELECT COUNT(*) FROM knowledge_chunks'),
      pool.query('SELECT COUNT(*) FROM chat_history')
    ]);
    
    console.log(`  - Users: ${counts[0].rows[0].count}`);
    console.log(`  - PDF Documents: ${counts[1].rows[0].count}`);
    console.log(`  - Knowledge Chunks: ${counts[2].rows[0].count}`);
    console.log(`  - Chat History: ${counts[3].rows[0].count}`);

    await pool.end();
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

importData();
