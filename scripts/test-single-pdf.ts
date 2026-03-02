#!/usr/bin/env tsx

/**
 * Test Single PDF Processing
 * Process just one small section to test the pipeline
 */

// MUST load env vars BEFORE any other imports
import { config } from 'dotenv';
import path from 'path';
const envPath = path.join(process.cwd(), '.env.local');
config({ path: envPath });

// Verify env vars loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
} as const;

async function testSinglePDF() {
  console.log(`${colors.cyan}🧪 Testing Single PDF Processing${colors.reset}\n`);

  try {
    // Get PDF path and course from command line args
    const args = process.argv.slice(2);
    const pdfFile = args[0] || 'fitter/Fitter - 1st Year - TP (NSQF 2022).pdf';
    const course = args[1] || 'fitter';
    
    // Dynamic import to ensure env vars are loaded first
    const { PDFProcessingPipeline } = await import('../lib/rag/pdf-pipeline');
    const pipeline = new PDFProcessingPipeline({
      chunkSize: 500, // Smaller for testing
      chunkOverlap: 50,
      embeddingBatchSize: 10,
      maxConcurrentFiles: 1,
      progressCallback: (progress) => {
        console.log(`${colors.cyan}[${progress.stage}]${colors.reset} ${progress.message} (${progress.progress}%)`);
      }
    });

    const pdfPath = path.join(process.cwd(), pdfFile);
    
    console.log(`${colors.cyan}Processing:${colors.reset} ${pdfPath}\n`);

    const result = await pipeline.processPDF(pdfPath, course);

    if (result.success) {
      console.log(`\n${colors.green}✅ Success!${colors.reset}`);
      console.log(`Chunks: ${result.totalChunks}`);
      console.log(`Embeddings: ${result.totalEmbeddings}`);
      console.log(`Time: ${(result.processingTimeMs / 1000).toFixed(1)}s`);
    } else {
      console.log(`\n${colors.red}❌ Failed: ${result.error}${colors.reset}`);
    }

  } catch (error) {
    console.error(`${colors.red}❌ Error: ${(error as Error).message}${colors.reset}`);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

testSinglePDF();
