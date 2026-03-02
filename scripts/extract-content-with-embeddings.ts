#!/usr/bin/env tsx
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Pool } from 'pg';
import { bgeEmbeddings } from '../lib/rag/bge-embeddings';
import { GoogleGenerativeAI } from '@google/generative-ai';

config({ path: path.join(process.cwd(), '.env.local') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ContentChunk {
  course: string;
  tradeType: string;
  module: string;
  moduleName: string;
  content: string;
  pageNumber: number;
  chunkIndex: number;
}

async function extractContentWithEmbeddings() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
    password: 'admin',
  });

  try {
    console.log('📚 Extracting content with BGE embeddings...\n');

    // Initialize BGE model
    console.log('🔄 Initializing BGE model...');
    await bgeEmbeddings.initialize();
    console.log('✅ BGE model ready\n');

    const course = 'electrician';
    const courseDir = path.join(process.cwd(), course);
    
    if (!fs.existsSync(courseDir)) {
      throw new Error(`Course directory not found: ${courseDir}`);
    }

    const files = fs.readdirSync(courseDir).filter(f => f.endsWith('.pdf'));
    
    if (files.length === 0) {
      throw new Error(`No PDFs found in ${course}`);
    }

    console.log(`📖 Processing ${files.length} PDFs for ${course}:\n`);

    let totalChunks = 0;
    let totalEmbeddings = 0;

    for (const file of files) {
      const pdfPath = path.join(courseDir, file);
      
      // Detect trade type from filename
      const tradeType = file.includes('_TT') || file.includes('TT') || file.includes('- TT')
        ? 'trade_theory' 
        : file.includes('_TP') || file.includes('TP') || file.includes('- TP')
        ? 'trade_practical'
        : 'trade_theory';

      const tradeLabel = tradeType === 'trade_theory' ? 'Theory' : 'Practical';
      
      console.log(`📄 ${file} (${tradeLabel})`);

      try {
        // Extract content from PDF
        const chunks = await extractPDFContent(pdfPath, course, tradeType);
        console.log(`  ✓ Extracted ${chunks.length} content chunks`);

        if (chunks.length === 0) {
          console.log('  ⚠️  No content extracted\n');
          continue;
        }

        // Option to refine with Gemini (can be slow)
        const useGeminiRefinement = process.env.USE_GEMINI_REFINEMENT === 'true';
        
        let finalChunks = chunks;
        if (useGeminiRefinement) {
          console.log(`  🔄 Refining content with Gemini AI...`);
          finalChunks = await refineContentWithGemini(chunks, tradeType);
          console.log(`  ✓ Refined ${finalChunks.length} chunks`);
        }
        
        console.log(`  🔄 Generating BGE embeddings...`);
        const startTime = Date.now();
        
        for (let i = 0; i < finalChunks.length; i++) {
          const chunk = finalChunks[i];
          
          // Generate embedding
          const embedding = await bgeEmbeddings.generateDocumentEmbedding(chunk.content);
          
          // Store in database
          await pool.query(
            `INSERT INTO knowledge_chunks 
             (course, trade_type, module, module_name, content, embedding, page_number, chunk_index, pdf_source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              chunk.course,
              chunk.tradeType,
              chunk.module,
              chunk.moduleName,
              chunk.content,
              `[${embedding.join(',')}]`,
              chunk.pageNumber,
              chunk.chunkIndex,
              file // Add pdf_source
            ]
          );
          
          totalEmbeddings++;
          
          // Progress indicator
          if ((i + 1) % 10 === 0) {
            process.stdout.write(`\r  🔄 Progress: ${i + 1}/${finalChunks.length} embeddings`);
          }
        }
        
        const embedTime = Date.now() - startTime;
        console.log(`\r  ✅ Generated ${finalChunks.length} embeddings in ${(embedTime / 1000).toFixed(1)}s`);
        console.log(`     Average: ${(embedTime / finalChunks.length).toFixed(0)}ms per embedding\n`);
        
        totalChunks += finalChunks.length;
      } catch (error) {
        console.error(`  ❌ Error processing ${file}:`, (error as Error).message);
        console.log('');
      }
    }

    // Show final statistics
    console.log('\n📊 Extraction Summary:');
    console.log(`  Total chunks: ${totalChunks}`);
    console.log(`  Total embeddings: ${totalEmbeddings}`);
    
    const statsResult = await pool.query(`
      SELECT 
        trade_type,
        COUNT(*) as chunk_count,
        COUNT(DISTINCT module) as module_count
      FROM knowledge_chunks
      WHERE course = $1
      GROUP BY trade_type
    `, [course]);
    
    console.log('\n  By Trade Type:');
    for (const row of statsResult.rows) {
      const tradeLabel = row.trade_type === 'trade_theory' ? 'Theory' : 'Practical';
      console.log(`    ${tradeLabel}: ${row.chunk_count} chunks, ${row.module_count} modules`);
    }

    console.log('\n✅ Content extraction with BGE embeddings complete!');
    await pool.end();
  } catch (error) {
    console.error('❌ Fatal error:', (error as Error).message);
    process.exit(1);
  }
}

async function extractPDFContent(
  pdfPath: string,
  course: string,
  tradeType: string
): Promise<ContentChunk[]> {
  const chunks: ContentChunk[] = [];
  
  const loadingTask = pdfjsLib.getDocument(pdfPath);
  const pdf = await loadingTask.promise;

  // Skip first 15 pages (index, intro, etc.)
  const startPage = 16;
  const endPage = pdf.numPages;

  let chunkIndex = 0;
  let currentModule = 'general-content';
  let currentModuleName = 'General Content';

  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Preserve line breaks
    const items = textContent.items as any[];
    let pageText = '';
    let lastY = -1;
    
    for (const item of items) {
      if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += '\n';
      }
      pageText += item.str + ' ';
      lastY = item.transform[5];
    }

    if (!pageText.trim() || pageText.trim().length < 50) {
      continue;
    }

    // Detect module changes
    const moduleMatch = pageText.match(/Module\s+(\d+):\s*([^\n]+)/i);
    if (moduleMatch) {
      const moduleNumber = parseInt(moduleMatch[1]);
      const moduleName = moduleMatch[2].trim();
      currentModule = `module-${moduleNumber}`;
      currentModuleName = moduleName;
    }

    // Split into chunks (by paragraphs or sections)
    const paragraphs = pageText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 100); // Only meaningful paragraphs

    for (const paragraph of paragraphs) {
      chunks.push({
        course,
        tradeType,
        module: currentModule,
        moduleName: currentModuleName,
        content: paragraph,
        pageNumber: pageNum,
        chunkIndex: chunkIndex++
      });
    }
  }

  return chunks;
}

async function refineContentWithGemini(
  chunks: ContentChunk[],
  tradeType: string
): Promise<ContentChunk[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const refinedChunks: ContentChunk[] = [];
  
  // Process one chunk at a time for better reliability
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Skip very short chunks
    if (chunk.content.length < 100) {
      refinedChunks.push(chunk);
      continue;
    }
    
    const tradeLabel = tradeType === 'trade_theory' ? 'Theory' : 'Practical';
    
    const prompt = `Clean and refine this educational content from an ITI Electrician ${tradeLabel} course.

Module: ${chunk.moduleName}

Original Content:
${chunk.content}

Instructions:
- Remove page numbers, headers, footers, QR code references
- Fix broken sentences and OCR errors
- Keep all technical information accurate
- Make it clear and educational
- Return ONLY the refined content (no JSON, no formatting, just the clean text)`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const refinedText = response.text().trim();
      
      if (refinedText && refinedText.length > 50) {
        refinedChunks.push({
          ...chunk,
          content: refinedText
        });
      } else {
        refinedChunks.push(chunk);
      }
      
      // Progress indicator
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`\r     Refined: ${i + 1}/${chunks.length}`);
      }
    } catch (error) {
      // Keep original on error
      refinedChunks.push(chunk);
    }
    
    // Small delay to avoid rate limiting
    if (i % 10 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log(`\r     Refined: ${chunks.length}/${chunks.length}`);
  return refinedChunks;
}

extractContentWithEmbeddings();
