#!/usr/bin/env tsx
/**
 * Process Split Module PDFs
 * 
 * This script processes the module PDFs created by split-pdf-by-modules.ts
 * It creates vector embeddings with proper module context and cross-module mapping
 * 
 * Usage:
 *   npx tsx scripts/process-split-modules.ts --input "pdf-modules/Electrician - 1st year - TT (NSQF 2022)"
 */

import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

interface ModulePdfInfo {
  moduleNumber: number;
  moduleName: string;
  pdfPath: string;
  pageCount: number;
}

interface SplitMetadata {
  originalPdf: string;
  totalPages: number;
  totalModules: number;
  tradeType: string;
  modulePdfs: ModulePdfInfo[];
}

/**
 * Process all module PDFs
 */
async function processModulePDFs(inputDir: string) {
  console.log('🚀 Processing Split Module PDFs\n');
  console.log('═'.repeat(60));
  
  // Load metadata
  const metadataPath = path.join(inputDir, 'split-metadata.json');
  const metadataContent = await fs.readFile(metadataPath, 'utf-8');
  const metadata: SplitMetadata = JSON.parse(metadataContent);
  
  console.log(`\n📖 Original PDF: ${metadata.originalPdf}`);
  console.log(`📚 Total Modules: ${metadata.totalModules}`);
  console.log(`📄 Total Pages: ${metadata.totalPages}`);
  console.log(`📝 Trade Type: ${metadata.tradeType}\n`);
  
  // Import PDF processing pipeline
  const { PDFProcessingPipeline } = await import('../lib/rag/pdf-pipeline');
  
  // Determine course from filename
  const course = metadata.originalPdf.toLowerCase().includes('fitter') ? 'fitter' : 'electrician';
  
  // Process each module PDF
  const results = [];
  
  for (const modulePdf of metadata.modulePdfs) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`\n📚 Processing Module ${modulePdf.moduleNumber}: ${modulePdf.moduleName}`);
    console.log(`📄 File: ${modulePdf.pdfPath}`);
    console.log(`📃 Pages: ${modulePdf.pageCount}\n`);
    
    try {
      const fullPath = path.join(inputDir, modulePdf.pdfPath);
      
      // Create pipeline with module-specific configuration
      const pipeline = new PDFProcessingPipeline({
        chunkSize: 750,
        chunkOverlap: 100,
        embeddingBatchSize: 50,
        progressCallback: (progress) => {
          if (progress.stage === 'complete') {
            console.log(`   ✅ ${progress.message}`);
          } else {
            console.log(`   🔄 ${progress.stage}: ${progress.message}`);
          }
        }
      });
      
      // Process the module PDF
      const result = await pipeline.processPDF(fullPath, course as 'fitter' | 'electrician');
      
      results.push({
        module: modulePdf.moduleNumber,
        moduleName: modulePdf.moduleName,
        success: result.success,
        chunks: result.totalChunks,
        embeddings: result.totalEmbeddings
      });
      
      if (result.success) {
        console.log(`\n   ✅ Module ${modulePdf.moduleNumber} processed successfully`);
        console.log(`   📦 Chunks created: ${result.totalChunks}`);
        console.log(`   🔢 Embeddings generated: ${result.totalEmbeddings}`);
      } else {
        console.log(`\n   ❌ Module ${modulePdf.moduleNumber} failed: ${result.error}`);
      }
      
    } catch (error) {
      console.error(`\n   ❌ Error processing module ${modulePdf.moduleNumber}:`, error);
      results.push({
        module: modulePdf.moduleNumber,
        moduleName: modulePdf.moduleName,
        success: false,
        chunks: 0,
        embeddings: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 Processing Summary\n');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalChunks = results.reduce((sum, r) => sum + r.chunks, 0);
  const totalEmbeddings = results.reduce((sum, r) => sum + r.embeddings, 0);
  
  console.log(`✅ Successful: ${successful}/${metadata.totalModules}`);
  console.log(`❌ Failed: ${failed}/${metadata.totalModules}`);
  console.log(`📦 Total Chunks: ${totalChunks}`);
  console.log(`🔢 Total Embeddings: ${totalEmbeddings}\n`);
  
  console.log('Module Results:');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`   ${status} Module ${r.module}: ${r.moduleName} (${r.chunks} chunks)`);
  });
  
  // Save processing report
  const reportPath = path.join(inputDir, 'processing-report.json');
  await fs.writeFile(
    reportPath,
    JSON.stringify({
      processedAt: new Date().toISOString(),
      metadata,
      results,
      summary: {
        successful,
        failed,
        totalChunks,
        totalEmbeddings
      }
    }, null, 2)
  );
  
  console.log(`\n📋 Report saved: ${reportPath}`);
  
  console.log('\n💡 Next steps:');
  console.log('   1. Test the chatbot with module-specific queries');
  console.log('   2. Verify vector search returns relevant results');
  console.log('   3. Check that module context is preserved in responses');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let inputDir = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      inputDir = args[i + 1];
    }
  }
  
  if (!inputDir) {
    console.error('❌ Error: --input parameter is required');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/process-split-modules.ts --input "pdf-modules/[folder-name]"');
    console.log('\nExample:');
    console.log('  npx tsx scripts/process-split-modules.ts --input "pdf-modules/Electrician - 1st year - TT (NSQF 2022)"');
    process.exit(1);
  }
  
  try {
    await processModulePDFs(inputDir);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { processModulePDFs };
