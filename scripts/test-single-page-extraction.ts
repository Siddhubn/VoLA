#!/usr/bin/env tsx

import { PDFProcessor } from '../lib/rag/pdf-processor';
import fs from 'fs';

async function testExtraction() {
  console.log('\n=== Testing PDF Text Extraction ===\n');
  
  const processor = new PDFProcessor();
  const pdfPath = 'electrician/Electrician - 1st year - TT (NSQF 2022).pdf';
  
  try {
    console.log('Extracting from:', pdfPath);
    console.log('This may take a moment...\n');
    
    const result = await processor.extractText(pdfPath);
    
    console.log(`Total pages: ${result.numPages}`);
    console.log(`Total text length: ${result.text.length.toLocaleString()} characters`);
    console.log(`Average per page: ${Math.round(result.text.length / result.numPages)} characters\n`);
    
    // Show first 3 pages
    console.log('=== First 3 Pages Sample ===\n');
    for (let i = 0; i < Math.min(3, result.pageTexts.length); i++) {
      const pageText = result.pageTexts[i];
      console.log(`--- Page ${i + 1} (${pageText.length} chars) ---`);
      console.log(pageText.substring(0, 500).replace(/\s+/g, ' ').trim());
      console.log('...\n');
    }
    
    // Check a middle page
    const middlePage = Math.floor(result.numPages / 2);
    if (result.pageTexts[middlePage]) {
      console.log(`=== Middle Page ${middlePage + 1} Sample ===`);
      console.log(result.pageTexts[middlePage].substring(0, 500).replace(/\s+/g, ' ').trim());
      console.log('...\n');
    }
    
    // Word count
    const words = result.text.split(/\s+/).filter(w => w.length > 0);
    console.log(`Total words: ${words.length.toLocaleString()}`);
    console.log(`Average words per page: ${Math.round(words.length / result.numPages)}`);
    
    console.log('\n✅ Extraction complete. The text content shown above is what gets stored in the database.');
    console.log('   Images, diagrams, and complex tables are not extracted (this is normal).');
    
  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

testExtraction();
