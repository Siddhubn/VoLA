#!/usr/bin/env tsx
/**
 * Intelligent PDF Processing for Module-Based Content
 * 
 * This script processes split module PDFs with:
 * 1. Semantic chunking (topic-aware, not random)
 * 2. Content classification (theory, practical, safety, etc.)
 * 3. Proper module mapping and organization
 * 4. Quality filtering (removes noise, figures, page numbers)
 * 5. Priority-based ranking
 */

import { config } from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { Pool } from 'pg';
import crypto from 'crypto';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

// Database connection
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

// Lazy load heavy dependencies
let PDFParseClass: any = null;
let pipeline: any = null;

async function getPDFParser() {
  if (!PDFParseClass) {
    const module = await import('pdf-parse');
    PDFParseClass = module.PDFParse;
  }
  return PDFParseClass;
}

async function getEmbeddingPipeline() {
  if (!pipeline) {
    const { pipeline: pipelineFunc } = await import('@xenova/transformers');
    pipeline = await pipelineFunc('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return pipeline;
}

interface ProcessedChunk {
  content: string;
  contentHash: string;
  trade: string;
  tradeType: string;
  moduleId: string;
  moduleName: string;
  moduleNumber: number;
  contentType: string;
  sectionTitle: string | null;
  topicKeywords: string[];
  sourceFile: string;
  pageStart: number | null;
  pageEnd: number | null;
  embedding: number[];
  chunkIndex: number;
  totalChunks: number;
  isSynthetic: boolean;
  priority: number;
  charCount: number;
  wordCount: number;
  sentenceCount: number;
}

/**
 * Noise patterns to remove
 */
const NOISE_PATTERNS = [
  /Professional\s+Skill\s*:?\s*\d+\s*Hrs?\.?/gi,
  /Professional\s+Knowledge\s*:?\s*\d+\s*Hrs?\.?/gi,
  /NOS\s*:\s*[A-Z0-9\/\-]+/gi,
  /Exercise\s+\d+\.\d+\.\d+/gi,
  /\(Fig\.?\s*\d+\)/gi,
  /\(Figure\s+\d+\)/gi,
  /Scan\s+the\s+QR\s+Code/gi,
  /Draw\s+the\s+layout/gi,
  /^\s*\d+\s*$/gm,  // Standalone numbers
  /^Page\s+\d+/gim,
  /NSQF\s+Level\s+\d+/gi,
  /^\s*[-–—]\s*$/gm,  // Standalone dashes
];

/**
 * Section markers that indicate new topics
 */
const SECTION_PATTERNS = [
  /^(?:UNIT|MODULE|CHAPTER|SECTION)\s+\d+/i,
  /^\d+\.\d+(?:\.\d+)?\s+[A-Z]/,  // Numbered headings
  /^[A-Z][A-Z\s]{10,}$/,  // ALL CAPS headings
];

/**
 * Content type classification patterns
 */
const CONTENT_TYPE_PATTERNS = {
  safety: /safety|hazard|precaution|protective|PPE|danger|warning|first aid/i,
  tools: /tool|equipment|instrument|device|apparatus|machine/i,
  theory: /principle|theory|concept|definition|formula|law|equation/i,
  practical: /procedure|step|method|process|operation|practice|exercise/i,
  example: /example|illustration|case study|application/i,
  definition: /define|definition|meaning|refers to|is called|known as/i,
};

/**
 * Clean content by removing noise
 */
function cleanContent(text: string): string {
  let cleaned = text;
  
  // Remove noise patterns
  NOISE_PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Detect section headings in text
 */
function detectSections(text: string): Array<{ heading: string; position: number }> {
  const sections: Array<{ heading: string; position: number }> = [];
  const lines = text.split('\n');
  let position = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.length > 0) {
      // Check if line matches section pattern
      const isSection = SECTION_PATTERNS.some(pattern => pattern.test(trimmed));
      
      if (isSection && trimmed.length < 200) {  // Reasonable heading length
        sections.push({
          heading: trimmed,
          position
        });
      }
    }
    
    position += line.length + 1;  // +1 for newline
  }
  
  return sections;
}

/**
 * Classify content type
 */
function classifyContentType(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Check each pattern
  for (const [type, pattern] of Object.entries(CONTENT_TYPE_PATTERNS)) {
    if (pattern.test(lowerText)) {
      return type;
    }
  }
  
  // Default to theory
  return 'theory';
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  // Simple keyword extraction (can be improved with NLP)
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4);  // Words longer than 4 chars
  
  // Count frequency
  const freq: Record<string, number> = {};
  words.forEach(w => {
    freq[w] = (freq[w] || 0) + 1;
  });
  
  // Get top keywords
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return sorted;
}

/**
 * Split text into semantic chunks
 */
function createSemanticChunks(
  text: string,
  maxTokens: number = 800
): Array<{ content: string; sectionTitle: string | null }> {
  const chunks: Array<{ content: string; sectionTitle: string | null }> = [];
  
  // Detect sections
  const sections = detectSections(text);
  
  if (sections.length === 0) {
    // No sections detected, use sentence-based chunking
    return createSentenceChunks(text, maxTokens);
  }
  
  // Split by sections
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextSection = sections[i + 1];
    
    const sectionStart = section.position;
    const sectionEnd = nextSection ? nextSection.position : text.length;
    const sectionText = text.substring(sectionStart, sectionEnd).trim();
    
    // If section is too large, split it further
    const estimatedTokens = sectionText.length / 4;
    
    if (estimatedTokens > maxTokens) {
      // Split large section into smaller chunks
      const subChunks = createSentenceChunks(sectionText, maxTokens);
      subChunks.forEach(chunk => {
        chunks.push({
          content: chunk.content,
          sectionTitle: section.heading
        });
      });
    } else {
      chunks.push({
        content: sectionText,
        sectionTitle: section.heading
      });
    }
  }
  
  return chunks;
}

/**
 * Fallback: sentence-based chunking
 */
function createSentenceChunks(
  text: string,
  maxTokens: number
): Array<{ content: string; sectionTitle: string | null }> {
  const chunks: Array<{ content: string; sectionTitle: string | null }> = [];
  
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const estimatedTokens = (currentChunk + sentence).length / 4;
    
    if (estimatedTokens > maxTokens && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        sectionTitle: null
      });
      currentChunk = sentence;
    } else {
      currentChunk += ' ' + sentence;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      sectionTitle: null
    });
  }
  
  return chunks;
}

/**
 * Calculate priority based on content
 */
function calculatePriority(content: string, contentType: string, isSynthetic: boolean): number {
  if (isSynthetic) return 10;  // Highest priority for synthetic overviews
  
  // Base priority by content type
  const basePriority: Record<string, number> = {
    'module_overview': 9,
    'safety': 8,
    'definition': 7,
    'theory': 6,
    'practical': 6,
    'tools': 5,
    'example': 4,
    'procedure': 6
  };
  
  let priority = basePriority[contentType] || 5;
  
  // Boost if content is substantial
  if (content.length > 2000) priority += 1;
  
  // Cap at 10
  return Math.min(priority, 10);
}

/**
 * Generate content hash
 */
function generateHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Extract text from PDF
 */
async function extractPDFText(pdfPath: string): Promise<string> {
  const PDFParse = await getPDFParser();
  const dataBuffer = await fs.readFile(pdfPath);
  const uint8Array = new Uint8Array(dataBuffer);
  const parser = new PDFParse(uint8Array);
  const result = await parser.getText();
  
  return result.text || '';
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const embeddingPipeline = await getEmbeddingPipeline();
  
  // Truncate if too long (model limit)
  const truncated = text.substring(0, 5000);
  
  const output = await embeddingPipeline(truncated, {
    pooling: 'mean',
    normalize: true
  });
  
  return Array.from(output.data);
}

/**
 * Process a single PDF file
 */
async function processPDF(
  pdfPath: string,
  trade: string,
  tradeType: string,
  moduleId: string,
  moduleName: string,
  moduleNumber: number
): Promise<ProcessedChunk[]> {
  console.log(`\n📄 Processing: ${path.basename(pdfPath)}`);
  
  // Extract text
  const rawText = await extractPDFText(pdfPath);
  console.log(`   📝 Extracted ${rawText.length} characters`);
  
  // Clean content
  const cleanedText = cleanContent(rawText);
  console.log(`   🧹 Cleaned to ${cleanedText.length} characters`);
  
  if (cleanedText.length < 100) {
    console.log(`   ⚠️  Content too short, skipping`);
    return [];
  }
  
  // Create semantic chunks
  const rawChunks = createSemanticChunks(cleanedText);
  console.log(`   ✂️  Created ${rawChunks.length} semantic chunks`);
  
  // Process each chunk
  const processedChunks: ProcessedChunk[] = [];
  
  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];
    
    if (chunk.content.length < 50) continue;  // Skip tiny chunks
    
    const contentType = classifyContentType(chunk.content);
    const keywords = extractKeywords(chunk.content);
    const priority = calculatePriority(chunk.content, contentType, false);
    
    // Generate embedding
    const embedding = await generateEmbedding(chunk.content);
    
    // Count metrics
    const wordCount = chunk.content.split(/\s+/).length;
    const sentenceCount = (chunk.content.match(/[.!?]+/g) || []).length;
    
    processedChunks.push({
      content: chunk.content,
      contentHash: generateHash(chunk.content),
      trade,
      tradeType,
      moduleId,
      moduleName,
      moduleNumber,
      contentType,
      sectionTitle: chunk.sectionTitle,
      topicKeywords: keywords,
      sourceFile: path.basename(pdfPath),
      pageStart: null,
      pageEnd: null,
      embedding,
      chunkIndex: i,
      totalChunks: rawChunks.length,
      isSynthetic: false,
      priority,
      charCount: chunk.content.length,
      wordCount,
      sentenceCount
    });
    
    if ((i + 1) % 10 === 0) {
      console.log(`   ⚙️  Processed ${i + 1}/${rawChunks.length} chunks`);
    }
  }
  
  console.log(`   ✅ Completed ${processedChunks.length} chunks`);
  
  return processedChunks;
}

/**
 * Insert chunks into database
 */
async function insertChunks(chunks: ProcessedChunk[]): Promise<void> {
  console.log(`\n💾 Inserting ${chunks.length} chunks into database...`);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      await query(`
        INSERT INTO knowledge_chunks (
          content, content_hash, trade, trade_type, module_id, module_name, module_number,
          content_type, section_title, topic_keywords, source_file, page_start, page_end,
          embedding, chunk_index, total_chunks, is_synthetic, priority,
          char_count, word_count, sentence_count
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        ON CONFLICT (content_hash) DO NOTHING
      `, [
        chunk.content,
        chunk.contentHash,
        chunk.trade,
        chunk.tradeType,
        chunk.moduleId,
        chunk.moduleName,
        chunk.moduleNumber,
        chunk.contentType,
        chunk.sectionTitle,
        chunk.topicKeywords,
        chunk.sourceFile,
        chunk.pageStart,
        chunk.pageEnd,
        `[${chunk.embedding.join(',')}]`,
        chunk.chunkIndex,
        chunk.totalChunks,
        chunk.isSynthetic,
        chunk.priority,
        chunk.charCount,
        chunk.wordCount,
        chunk.sentenceCount
      ]);
      
      if ((i + 1) % 50 === 0) {
        console.log(`   💾 Inserted ${i + 1}/${chunks.length} chunks`);
      }
    } catch (error: any) {
      if (!error.message.includes('duplicate key')) {
        console.error(`   ❌ Error inserting chunk ${i}:`, error.message);
      }
    }
  }
  
  console.log(`   ✅ Database insertion complete`);
}

/**
 * Process all module PDFs
 */
async function processAllModules(tradeType: 'TT' | 'TP'): Promise<void> {
  const baseDir = `electrician-sep-modules/${tradeType}`;
  
  console.log(`\n📚 Processing ${tradeType} modules from: ${baseDir}`);
  
  // Get all module PDFs
  const files = await fs.readdir(baseDir);
  const modulePdfs = files.filter(f => f.startsWith('module-') && f.endsWith('.pdf'));
  
  console.log(`   Found ${modulePdfs.length} module PDFs`);
  
  for (const file of modulePdfs) {
    // Extract module info from filename
    const match = file.match(/module-(\d+)-(.+)\.pdf/);
    if (!match) continue;
    
    const moduleNumber = parseInt(match[1]);
    const moduleSlug = match[2];
    const moduleId = `module-${moduleNumber}`;
    
    // Convert slug to name
    const moduleName = moduleSlug
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    
    const pdfPath = path.join(baseDir, file);
    
    try {
      const chunks = await processPDF(
        pdfPath,
        'electrician',
        tradeType,
        moduleId,
        moduleName,
        moduleNumber
      );
      
      if (chunks.length > 0) {
        await insertChunks(chunks);
      }
    } catch (error: any) {
      console.error(`   ❌ Error processing ${file}:`, error.message);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Intelligent PDF Processing\n');
  console.log('═'.repeat(60));
  
  try {
    // Process TT modules
    await processAllModules('TT');
    
    // Process TP modules
    await processAllModules('TP');
    
    // Show statistics
    const stats = await query(`
      SELECT 
        trade_type,
        COUNT(*) as total_chunks,
        COUNT(DISTINCT module_id) as modules,
        AVG(word_count)::int as avg_words,
        SUM(word_count) as total_words
      FROM knowledge_chunks
      GROUP BY trade_type
    `);
    
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ Processing Complete!\n');
    console.log('📊 Statistics:');
    stats.rows.forEach(row => {
      console.log(`\n   ${row.trade_type}:`);
      console.log(`   • Total chunks: ${row.total_chunks}`);
      console.log(`   • Modules: ${row.modules}`);
      console.log(`   • Avg words/chunk: ${row.avg_words}`);
      console.log(`   • Total words: ${row.total_words.toLocaleString()}`);
    });
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { processPDF, insertChunks };
