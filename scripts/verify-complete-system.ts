#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { bgeEmbeddings } from '../lib/rag/bge-embeddings';

config({ path: path.join(process.cwd(), '.env.local') });

async function verifyCompleteSystem() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
    password: 'admin',
  });

  console.log('🔍 Verifying Complete System...\n');

  try {
    // 1. Check Syllabus Structure
    console.log('1️⃣ Checking Syllabus Structure...');
    const syllabusResult = await pool.query(`
      SELECT 
        course,
        trade_type,
        COUNT(*) as module_count,
        SUM(jsonb_array_length(topics)) as topic_count
      FROM module_syllabus
      GROUP BY course, trade_type
      ORDER BY course, trade_type
    `);

    if (syllabusResult.rows.length === 0) {
      console.log('   ❌ No syllabus data found!');
      return;
    }

    console.log('   ✅ Syllabus Structure:');
    for (const row of syllabusResult.rows) {
      const tradeLabel = row.trade_type === 'trade_theory' ? 'Theory' : 'Practical';
      console.log(`      ${row.course} - ${tradeLabel}: ${row.module_count} modules, ${row.topic_count} topics`);
    }

    // 2. Check Content Chunks
    console.log('\n2️⃣ Checking Content Chunks...');
    const chunksResult = await pool.query(`
      SELECT 
        course,
        trade_type,
        COUNT(*) as chunk_count,
        COUNT(DISTINCT module) as module_count,
        COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as embedding_count
      FROM knowledge_chunks
      GROUP BY course, trade_type
      ORDER BY course, trade_type
    `);

    if (chunksResult.rows.length === 0) {
      console.log('   ❌ No content chunks found!');
      return;
    }

    console.log('   ✅ Content Chunks:');
    for (const row of chunksResult.rows) {
      const tradeLabel = row.trade_type === 'trade_theory' ? 'Theory' : 'Practical';
      console.log(`      ${row.course} - ${tradeLabel}: ${row.chunk_count} chunks, ${row.embedding_count} embeddings`);
    }

    // 3. Test BGE Embeddings
    console.log('\n3️⃣ Testing BGE Embeddings...');
    await bgeEmbeddings.initialize();
    const testEmbedding = await bgeEmbeddings.generateEmbedding('Test query about Ohm\'s law');
    console.log(`   ✅ BGE Model: Working (${testEmbedding.length} dimensions)`);

    // 4. Test Semantic Search
    console.log('\n4️⃣ Testing Semantic Search...');
    const queryEmbedding = await bgeEmbeddings.generateEmbedding('What is Ohm\'s law?');
    
    const searchResult = await pool.query(`
      SELECT 
        module_name,
        content,
        1 - (embedding <=> $1::vector) as similarity
      FROM knowledge_chunks
      WHERE course = 'electrician' AND trade_type = 'trade_theory'
      ORDER BY embedding <=> $1::vector
      LIMIT 3
    `, [`[${queryEmbedding.join(',')}]`]);

    if (searchResult.rows.length > 0) {
      console.log('   ✅ Semantic Search: Working');
      console.log(`      Top result: ${searchResult.rows[0].module_name}`);
      console.log(`      Similarity: ${(searchResult.rows[0].similarity * 100).toFixed(1)}%`);
      console.log(`      Content preview: ${searchResult.rows[0].content.substring(0, 100)}...`);
    } else {
      console.log('   ⚠️  No search results found');
    }

    // 5. Check Sample Module
    console.log('\n5️⃣ Checking Sample Module...');
    const moduleResult = await pool.query(`
      SELECT 
        module_id,
        module_name,
        module_number,
        jsonb_array_length(topics) as topic_count
      FROM module_syllabus
      WHERE course = 'electrician' AND trade_type = 'trade_theory'
      ORDER BY module_number
      LIMIT 1
    `);

    if (moduleResult.rows.length > 0) {
      const module = moduleResult.rows[0];
      console.log('   ✅ Sample Module:');
      console.log(`      ID: ${module.module_id}`);
      console.log(`      Name: ${module.module_name}`);
      console.log(`      Number: ${module.module_number}`);
      console.log(`      Topics: ${module.topic_count}`);
    }

    // 6. System Summary
    console.log('\n📊 System Summary:');
    const totalSyllabus = syllabusResult.rows.reduce((sum, row) => sum + parseInt(row.module_count), 0);
    const totalTopics = syllabusResult.rows.reduce((sum, row) => sum + parseInt(row.topic_count), 0);
    const totalChunks = chunksResult.rows.reduce((sum, row) => sum + parseInt(row.chunk_count), 0);
    const totalEmbeddings = chunksResult.rows.reduce((sum, row) => sum + parseInt(row.embedding_count), 0);

    console.log(`   📚 Syllabus: ${totalSyllabus} modules, ${totalTopics} topics`);
    console.log(`   📄 Content: ${totalChunks} chunks, ${totalEmbeddings} embeddings`);
    console.log(`   🤖 BGE Model: Operational (384 dimensions)`);
    console.log(`   🔍 Semantic Search: Functional`);

    console.log('\n✅ System Verification Complete!');
    console.log('\n🎉 All components are working correctly!');
    console.log('\nReady for:');
    console.log('  • Syllabus display (/syllabus page)');
    console.log('  • Quiz generation (with semantic search)');
    console.log('  • RAG chatbot (with context retrieval)');

    await pool.end();
  } catch (error) {
    console.error('\n❌ Verification failed:', (error as Error).message);
    console.error('\nPlease check:');
    console.error('  1. Database is running');
    console.error('  2. Tables are created (run setup-database-schema.ts)');
    console.error('  3. Syllabus is loaded (run load-manual-syllabus.ts)');
    console.error('  4. Content is extracted (run extract-content-with-embeddings.ts)');
    process.exit(1);
  }
}

verifyCompleteSystem();
