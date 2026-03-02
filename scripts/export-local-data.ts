#!/usr/bin/env tsx
/**
 * Export data from local database for migration to Neon DB
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const localConnectionString = 'postgresql://postgres:admin@localhost:5433/vola_db';

async function exportData() {
  console.log('🔍 Exporting data from local database...\n');
  
  const pool = new Pool({
    connectionString: localConnectionString,
    ssl: false
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to local database\n');

    const exportData: any = {
      users: [],
      pdf_documents: [],
      module_mapping: [],
      knowledge_chunks: [],
      chat_history: [],
      quiz_questions: [],
      quiz_attempts: []
    };

    // Export users
    console.log('📊 Exporting users...');
    const usersResult = await client.query('SELECT * FROM users ORDER BY id');
    exportData.users = usersResult.rows;
    console.log(`  ✅ Exported ${usersResult.rows.length} users`);

    // Check if RAG tables exist
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('pdf_documents', 'module_mapping', 'knowledge_chunks', 'chat_history')
    `);
    const existingTables = tablesCheck.rows.map((r: any) => r.table_name);

    // Export pdf_documents
    if (existingTables.includes('pdf_documents')) {
      console.log('📊 Exporting PDF documents...');
      const pdfResult = await client.query('SELECT * FROM pdf_documents ORDER BY id');
      exportData.pdf_documents = pdfResult.rows;
      console.log(`  ✅ Exported ${pdfResult.rows.length} PDF documents`);
    }

    // Export module_mapping
    if (existingTables.includes('module_mapping')) {
      console.log('📊 Exporting module mappings...');
      const moduleResult = await client.query('SELECT * FROM module_mapping ORDER BY id');
      exportData.module_mapping = moduleResult.rows;
      console.log(`  ✅ Exported ${moduleResult.rows.length} module mappings`);
    }

    // Export knowledge_chunks (with embeddings)
    if (existingTables.includes('knowledge_chunks')) {
      console.log('📊 Exporting knowledge chunks (this may take a while)...');
      const chunksResult = await client.query('SELECT * FROM knowledge_chunks ORDER BY id');
      exportData.knowledge_chunks = chunksResult.rows;
      console.log(`  ✅ Exported ${chunksResult.rows.length} knowledge chunks`);
      
      // Count chunks with embeddings
      const withEmbeddings = chunksResult.rows.filter((r: any) => 
        r.embedding || r.embedding_placeholder
      ).length;
      console.log(`  📊 Chunks with embeddings: ${withEmbeddings}`);
    }

    // Export chat_history
    if (existingTables.includes('chat_history')) {
      console.log('📊 Exporting chat history...');
      const chatResult = await client.query('SELECT * FROM chat_history ORDER BY id');
      exportData.chat_history = chatResult.rows;
      console.log(`  ✅ Exported ${chatResult.rows.length} chat messages`);
    }

    // Check for quiz tables
    const quizTablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('quiz_questions', 'quiz_attempts')
    `);
    const quizTables = quizTablesCheck.rows.map((r: any) => r.table_name);

    if (quizTables.includes('quiz_questions')) {
      console.log('📊 Exporting quiz questions...');
      const quizResult = await client.query('SELECT * FROM quiz_questions ORDER BY id');
      exportData.quiz_questions = quizResult.rows;
      console.log(`  ✅ Exported ${quizResult.rows.length} quiz questions`);
    }

    if (quizTables.includes('quiz_attempts')) {
      console.log('📊 Exporting quiz attempts...');
      const attemptsResult = await client.query('SELECT * FROM quiz_attempts ORDER BY id');
      exportData.quiz_attempts = attemptsResult.rows;
      console.log(`  ✅ Exported ${attemptsResult.rows.length} quiz attempts`);
    }

    // Save to file
    const exportDir = path.join(process.cwd(), 'supabase-export');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportFile = path.join(exportDir, 'neon-migration-data.json');
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    
    console.log(`\n✅ Data exported successfully to: ${exportFile}`);
    
    // Print summary
    console.log('\n📊 Export Summary:');
    console.log(`  - Users: ${exportData.users.length}`);
    console.log(`  - PDF Documents: ${exportData.pdf_documents.length}`);
    console.log(`  - Module Mappings: ${exportData.module_mapping.length}`);
    console.log(`  - Knowledge Chunks: ${exportData.knowledge_chunks.length}`);
    console.log(`  - Chat History: ${exportData.chat_history.length}`);
    console.log(`  - Quiz Questions: ${exportData.quiz_questions.length}`);
    console.log(`  - Quiz Attempts: ${exportData.quiz_attempts.length}`);

    client.release();
    await pool.end();
    
  } catch (error: any) {
    console.error('\n❌ Export failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

exportData();
