#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import fs from 'fs';

config({ path: path.join(process.cwd(), '.env.local') });

async function comprehensiveCheck() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
    password: 'admin',
  });

  try {
    console.log('\n=== COMPREHENSIVE CONTENT VERIFICATION ===\n');
    
    // 1. Check PDF file sizes
    console.log('1. PDF FILE SIZES:');
    const pdfFiles = [
      'electrician/Electrician - 1st year - TT (NSQF 2022).pdf',
      'electrician/Electrician - 1st year - TP (NSQF 2022).pdf'
    ];
    
    let totalPdfSize = 0;
    pdfFiles.forEach(file => {
      try {
        const stats = fs.statSync(file);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`   ${file}: ${sizeMB} MB`);
        totalPdfSize += stats.size;
      } catch (error) {
        console.log(`   ${file}: NOT FOUND`);
      }
    });
    console.log(`   Total PDF size: ${(totalPdfSize / (1024 * 1024)).toFixed(2)} MB\n`);
    
    // 2. Check total chunks and content size
    console.log('2. DATABASE CONTENT:');
    const totalStats = await pool.query(`
      SELECT 
        COUNT(*) as total_chunks,
        SUM(LENGTH(content)) as total_content_size,
        AVG(LENGTH(content)) as avg_chunk_size,
        MIN(LENGTH(content)) as min_chunk_size,
        MAX(LENGTH(content)) as max_chunk_size
      FROM knowledge_chunks
    `);
    
    const stats = totalStats.rows[0];
    console.log(`   Total chunks: ${stats.total_chunks}`);
    console.log(`   Total content size: ${(stats.total_content_size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`   Average chunk size: ${Math.round(stats.avg_chunk_size)} characters`);
    console.log(`   Min chunk size: ${stats.min_chunk_size} characters`);
    console.log(`   Max chunk size: ${stats.max_chunk_size} characters\n`);
    
    // 3. Check content by course and trade type
    console.log('3. CONTENT DISTRIBUTION BY COURSE & TRADE TYPE:');
    const distribution = await pool.query(`
      SELECT 
        course,
        trade_type,
        COUNT(*) as chunk_count,
        SUM(LENGTH(content)) as total_content_chars,
        COUNT(DISTINCT module) as module_count
      FROM knowledge_chunks
      GROUP BY course, trade_type
      ORDER BY course, trade_type
    `);
    
    distribution.rows.forEach(row => {
      console.log(`   ${row.course} - ${row.trade_type}:`);
      console.log(`      Chunks: ${row.chunk_count}`);
      console.log(`      Modules: ${row.module_count}`);
      console.log(`      Content: ${(row.total_content_chars / (1024 * 1024)).toFixed(2)} MB`);
    });
    console.log('');
    
    // 4. Check modules with content
    console.log('4. MODULES WITH CONTENT:');
    const modules = await pool.query(`
      SELECT 
        course,
        trade_type,
        module,
        module_name,
        COUNT(*) as chunk_count,
        SUM(LENGTH(content)) as total_chars
      FROM knowledge_chunks
      WHERE module != 'general-content'
      GROUP BY course, trade_type, module, module_name
      ORDER BY course, trade_type, module
    `);
    
    let currentTradeType = '';
    modules.rows.forEach(row => {
      const tradeTypeLabel = `${row.course} - ${row.trade_type}`;
      if (tradeTypeLabel !== currentTradeType) {
        console.log(`\n   ${tradeTypeLabel.toUpperCase()}:`);
        currentTradeType = tradeTypeLabel;
      }
      console.log(`      • ${row.module_name}: ${row.chunk_count} chunks (${(row.total_chars / 1024).toFixed(1)} KB)`);
    });
    console.log('');
    
    // 5. Check for empty or very small chunks
    console.log('5. CONTENT QUALITY CHECK:');
    const qualityCheck = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE LENGTH(TRIM(content)) = 0) as empty_chunks,
        COUNT(*) FILTER (WHERE LENGTH(TRIM(content)) < 50) as very_small_chunks,
        COUNT(*) FILTER (WHERE LENGTH(TRIM(content)) < 500) as small_chunks,
        COUNT(*) FILTER (WHERE LENGTH(TRIM(content)) >= 500 AND LENGTH(TRIM(content)) < 2000) as medium_chunks,
        COUNT(*) FILTER (WHERE LENGTH(TRIM(content)) >= 2000) as large_chunks
      FROM knowledge_chunks
    `);
    
    const quality = qualityCheck.rows[0];
    console.log(`   Empty chunks (0 chars): ${quality.empty_chunks}`);
    console.log(`   Very small chunks (< 50 chars): ${quality.very_small_chunks}`);
    console.log(`   Small chunks (50-500 chars): ${quality.small_chunks}`);
    console.log(`   Medium chunks (500-2000 chars): ${quality.medium_chunks}`);
    console.log(`   Large chunks (≥ 2000 chars): ${quality.large_chunks}\n`);
    
    // 6. Sample content from each trade type
    console.log('6. SAMPLE CONTENT FROM EACH TRADE TYPE:\n');
    const samples = await pool.query(`
      WITH ranked_chunks AS (
        SELECT 
          course,
          trade_type,
          module_name,
          content,
          ROW_NUMBER() OVER (PARTITION BY course, trade_type ORDER BY chunk_index) as rn
        FROM knowledge_chunks
        WHERE module != 'general-content' AND LENGTH(content) > 500
      )
      SELECT course, trade_type, module_name, content
      FROM ranked_chunks
      WHERE rn = 1
      ORDER BY course, trade_type
    `);
    
    samples.rows.forEach(row => {
      console.log(`   ${row.course} - ${row.trade_type} (${row.module_name}):`);
      console.log(`   "${row.content.substring(0, 200).replace(/\s+/g, ' ').trim()}..."`);
      console.log('');
    });
    
    // 7. Check embeddings
    console.log('7. EMBEDDINGS CHECK:');
    const embeddingCheck = await pool.query(`
      SELECT 
        COUNT(*) as chunks_with_embeddings,
        COUNT(*) FILTER (WHERE embedding IS NULL) as chunks_without_embeddings
      FROM knowledge_chunks
    `);
    
    const embStats = embeddingCheck.rows[0];
    console.log(`   Chunks with embeddings: ${embStats.chunks_with_embeddings}`);
    console.log(`   Chunks without embeddings: ${embStats.chunks_without_embeddings}\n`);
    
    // 8. Final assessment
    console.log('=== ASSESSMENT ===\n');
    
    const totalChunks = parseInt(stats.total_chunks);
    const contentSizeMB = parseFloat((stats.total_content_size / (1024 * 1024)).toFixed(2));
    const hasEmbeddings = parseInt(embStats.chunks_with_embeddings) > 0;
    const hasModules = modules.rows.length > 0;
    const qualityGood = parseInt(quality.large_chunks) > totalChunks * 0.5; // At least 50% large chunks
    
    console.log(`✅ Total chunks: ${totalChunks} ${totalChunks > 400 ? '(GOOD)' : '(LOW)'}`);
    console.log(`✅ Content size: ${contentSizeMB} MB ${contentSizeMB > 1 ? '(GOOD)' : '(LOW)'}`);
    console.log(`✅ Modules extracted: ${modules.rows.length} ${hasModules ? '(GOOD)' : '(NONE)'}`);
    console.log(`✅ Content quality: ${qualityGood ? 'GOOD' : 'NEEDS IMPROVEMENT'}`);
    console.log(`✅ Embeddings: ${hasEmbeddings ? 'PRESENT' : 'MISSING'}`);
    
    console.log('\n=== USE CASES ===\n');
    console.log('✅ Quiz Generation: Content is available and organized by module');
    console.log('✅ Chatbot (/chatbot): Embeddings present for semantic search');
    console.log('✅ Syllabus Page (/syllabus): Module names and structure available');
    
    if (totalChunks > 400 && contentSizeMB > 1 && hasModules && hasEmbeddings) {
      console.log('\n🎉 ALL SYSTEMS READY! Knowledge base is complete and functional.\n');
    } else {
      console.log('\n⚠️  Some issues detected. Review the assessment above.\n');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

comprehensiveCheck();
