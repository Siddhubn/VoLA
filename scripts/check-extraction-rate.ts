#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';
import { PDFProcessor } from '../lib/rag/pdf-processor';

config({ path: path.join(process.cwd(), '.env.local') });

async function checkExtractionRate() {
  console.log('\n=== PDF TEXT EXTRACTION CHECK ===\n');
  
  const pdfFiles = [
    { path: 'electrician/Electrician - 1st year - TT (NSQF 2022).pdf', name: 'TT' },
    { path: 'electrician/Electrician - 1st year - TP (NSQF 2022).pdf', name: 'TP' }
  ];
  
  const processor = new PDFProcessor();
  
  for (const file of pdfFiles) {
    try {
      console.log(`Processing: ${file.name}`);
      const result = await processor.extractText(file.path);
      
      console.log(`  Pages: ${result.numPages}`);
      console.log(`  Raw text length: ${result.text.length.toLocaleString()} characters`);
      console.log(`  Raw text size: ${(result.text.length / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`  Average chars per page: ${Math.round(result.text.length / result.numPages)}`);
      
      // Check if text is meaningful
      const words = result.text.split(/\s+/).filter(w => w.length > 0);
      console.log(`  Word count: ${words.length.toLocaleString()}`);
      console.log(`  Average words per page: ${Math.round(words.length / result.numPages)}`);
      console.log('');
    } catch (error) {
      console.error(`  Error: ${(error as Error).message}\n`);
    }
  }
  
  console.log('=== ANALYSIS ===\n');
  console.log('Note: PDFs with many images, diagrams, and tables will have');
  console.log('lower text extraction rates. This is normal for technical manuals.');
  console.log('The extracted text content is what matters for quiz generation');
  console.log('and chatbot responses.\n');
}

checkExtractionRate();
