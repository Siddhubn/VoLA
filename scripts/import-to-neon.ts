#!/usr/bin/env tsx
/**
 * Import data from local export to Neon DB
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const neonConnectionString = process.env.DATABASE_URL;

async function importData() {
  console.log('🔍 Importing data to Neon DB...\n');
  
  if (!neonConnectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: neonConnectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon DB\n');

    // Load export data
    const exportFile = path.join(process.cwd(), 'supabase-export', 'neon-migration-data.json');
    if (!fs.existsSync(exportFile)) {
      console.error('❌ Export file not found:', exportFile);
      console.error('   Please run: npx tsx scripts/export-local-data.ts first');
      process.exit(1);
    }

    const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf-8'));
    console.log('📂 Loaded export data\n');

    await client.query('BEGIN');

    // Import users
    if (exportData.users && exportData.users.length > 0) {
      console.log(`📊 Importing ${exportData.users.length} users...`);
      for (const user of exportData.users) {
        await client.query(`
          INSERT INTO users (
            id, name, email, password, role, avatar, is_active, 
            created_at, updated_at, last_login, bio, skills, learning_goals,
            completed_courses, total_study_time
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            password = EXCLUDED.password,
            role = EXCLUDED.role,
            avatar = EXCLUDED.avatar,
            is_active = EXCLUDED.is_active,
            updated_at = EXCLUDED.updated_at,
            last_login = EXCLUDED.last_login,
            bio = EXCLUDED.bio,
            skills = EXCLUDED.skills,
            learning_goals = EXCLUDED.learning_goals,
            completed_courses = EXCLUDED.completed_courses,
            total_study_time = EXCLUDED.total_study_time
        `, [
          user.id, user.name, user.email, user.password, user.role, user.avatar,
          user.is_active, user.created_at, user.updated_at, user.last_login,
          user.bio, user.skills, user.learning_goals, user.completed_courses,
          user.total_study_time
        ]);
      }
      
      // Update sequence
      await client.query(`
        SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))
      `);
      console.log(`  ✅ Imported ${exportData.users.length} users`);
    }

    // Import pdf_documents
    if (exportData.pdf_documents && exportData.pdf_documents.length > 0) {
      console.log(`📊 Importing ${exportData.pdf_documents.length} PDF documents...`);
      for (const doc of exportData.pdf_documents) {
        await client.query(`
          INSERT INTO pdf_documents (
            id, course, filename, file_path, file_size, total_pages, total_chunks,
            processing_status, processing_started_at, processing_completed_at,
            error_message, metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (filename) DO UPDATE SET
            file_size = EXCLUDED.file_size,
            total_pages = EXCLUDED.total_pages,
            total_chunks = EXCLUDED.total_chunks,
            processing_status = EXCLUDED.processing_status,
            processing_completed_at = EXCLUDED.processing_completed_at,
            updated_at = EXCLUDED.updated_at
        `, [
          doc.id, doc.course, doc.filename, doc.file_path, doc.file_size,
          doc.total_pages, doc.total_chunks, doc.processing_status,
          doc.processing_started_at, doc.processing_completed_at,
          doc.error_message, doc.metadata, doc.created_at, doc.updated_at
        ]);
      }
      
      await client.query(`
        SELECT setval('pdf_documents_id_seq', (SELECT MAX(id) FROM pdf_documents))
      `);
      console.log(`  ✅ Imported ${exportData.pdf_documents.length} PDF documents`);
    }

    // Import module_mapping
    if (exportData.module_mapping && exportData.module_mapping.length > 0) {
      console.log(`📊 Importing ${exportData.module_mapping.length} module mappings...`);
      for (const module of exportData.module_mapping) {
        await client.query(`
          INSERT INTO module_mapping (
            id, course, module_id, module_name, keywords, description, display_order, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (course, module_id) DO UPDATE SET
            module_name = EXCLUDED.module_name,
            keywords = EXCLUDED.keywords,
            description = EXCLUDED.description,
            display_order = EXCLUDED.display_order
        `, [
          module.id, module.course, module.module_id, module.module_name,
          module.keywords, module.description, module.display_order, module.created_at
        ]);
      }
      
      await client.query(`
        SELECT setval('module_mapping_id_seq', (SELECT MAX(id) FROM module_mapping))
      `);
      console.log(`  ✅ Imported ${exportData.module_mapping.length} module mappings`);
    }

    // Import knowledge_chunks (with embeddings)
    if (exportData.knowledge_chunks && exportData.knowledge_chunks.length > 0) {
      console.log(`📊 Importing ${exportData.knowledge_chunks.length} knowledge chunks...`);
      console.log('   (This may take several minutes for large datasets)');
      
      let imported = 0;
      let withEmbeddings = 0;
      
      for (const chunk of exportData.knowledge_chunks) {
        // Convert embedding from array or string to proper format
        let embeddingValue = null;
        if (chunk.embedding) {
          if (typeof chunk.embedding === 'string') {
            embeddingValue = chunk.embedding;
          } else if (Array.isArray(chunk.embedding)) {
            embeddingValue = `[${chunk.embedding.join(',')}]`;
          }
          withEmbeddings++;
        } else if (chunk.embedding_placeholder) {
          // Handle old format
          const parsed = JSON.parse(chunk.embedding_placeholder);
          if (Array.isArray(parsed)) {
            embeddingValue = `[${parsed.join(',')}]`;
            withEmbeddings++;
          }
        }

        await client.query(`
          INSERT INTO knowledge_chunks (
            id, course, pdf_source, module, section, page_number,
            chunk_index, content, content_preview, embedding, token_count,
            metadata, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (course, pdf_source, chunk_index) DO UPDATE SET
            module = EXCLUDED.module,
            section = EXCLUDED.section,
            content = EXCLUDED.content,
            embedding = EXCLUDED.embedding,
            updated_at = EXCLUDED.updated_at
        `, [
          chunk.id, chunk.course, chunk.pdf_source, chunk.module,
          chunk.section, chunk.page_number, chunk.chunk_index, chunk.content,
          chunk.content_preview, embeddingValue, chunk.token_count,
          chunk.metadata, chunk.created_at, chunk.updated_at
        ]);
        
        imported++;
        if (imported % 100 === 0) {
          console.log(`   Progress: ${imported}/${exportData.knowledge_chunks.length} chunks`);
        }
      }
      
      await client.query(`
        SELECT setval('knowledge_chunks_id_seq', (SELECT MAX(id) FROM knowledge_chunks))
      `);
      console.log(`  ✅ Imported ${imported} knowledge chunks (${withEmbeddings} with embeddings)`);
    }

    // Import chat_history
    if (exportData.chat_history && exportData.chat_history.length > 0) {
      console.log(`📊 Importing ${exportData.chat_history.length} chat messages...`);
      for (const chat of exportData.chat_history) {
        await client.query(`
          INSERT INTO chat_history (
            id, user_id, course, session_id, message_type, message, sources, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [
          chat.id, chat.user_id, chat.course, chat.session_id,
          chat.message_type, chat.message, chat.sources, chat.created_at
        ]);
      }
      
      await client.query(`
        SELECT setval('chat_history_id_seq', (SELECT MAX(id) FROM chat_history))
      `);
      console.log(`  ✅ Imported ${exportData.chat_history.length} chat messages`);
    }

    // Import quiz_attempts if table exists
    if (exportData.quiz_attempts && exportData.quiz_attempts.length > 0) {
      const quizTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'quiz_attempts'
        )
      `);
      
      if (quizTableCheck.rows[0].exists) {
        console.log(`📊 Importing ${exportData.quiz_attempts.length} quiz attempts...`);
        for (const attempt of exportData.quiz_attempts) {
          await client.query(`
            INSERT INTO quiz_attempts (
              id, user_id, course, module, questions, answers, score, 
              total_questions, completed_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO NOTHING
          `, [
            attempt.id, attempt.user_id, attempt.course, attempt.module,
            attempt.questions, attempt.answers, attempt.score,
            attempt.total_questions, attempt.completed_at, attempt.created_at
          ]);
        }
        console.log(`  ✅ Imported ${exportData.quiz_attempts.length} quiz attempts`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ All data imported successfully!');

    // Create vector index if we have embeddings
    if (exportData.knowledge_chunks && exportData.knowledge_chunks.length > 0) {
      console.log('\n🔄 Creating vector similarity index...');
      try {
        await client.query(`
          CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx 
          ON knowledge_chunks 
          USING ivfflat (embedding vector_cosine_ops)
          WITH (lists = 100)
        `);
        console.log('  ✅ Vector index created');
      } catch (error: any) {
        console.log('  ⚠️  Vector index creation skipped:', error.message);
      }
    }

    // Print final summary
    console.log('\n📊 Migration Summary:');
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const pdfCount = await client.query('SELECT COUNT(*) FROM pdf_documents');
    const moduleCount = await client.query('SELECT COUNT(*) FROM module_mapping');
    const chunkCount = await client.query('SELECT COUNT(*) FROM knowledge_chunks');
    const chatCount = await client.query('SELECT COUNT(*) FROM chat_history');
    
    console.log(`  - Users: ${userCount.rows[0].count}`);
    console.log(`  - PDF Documents: ${pdfCount.rows[0].count}`);
    console.log(`  - Module Mappings: ${moduleCount.rows[0].count}`);
    console.log(`  - Knowledge Chunks: ${chunkCount.rows[0].count}`);
    console.log(`  - Chat History: ${chatCount.rows[0].count}`);

    client.release();
    await pool.end();
    
    console.log('\n🎉 Migration to Neon DB completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

importData();
