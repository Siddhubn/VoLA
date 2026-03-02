#!/usr/bin/env tsx
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';

async function inspectPDF() {
  const pdfPath = path.join(process.cwd(), 'electrician', 'Electrician - 1st year - TT (NSQF 2022).pdf');
  
  console.log('📄 Inspecting PDF structure...\n');
  
  const loadingTask = pdfjsLib.getDocument(pdfPath);
  const pdf = await loadingTask.promise;
  
  console.log(`Total pages: ${pdf.numPages}\n`);
  
  // Check first 15 pages
  for (let pageNum = 1; pageNum <= Math.min(15, pdf.numPages); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    
    console.log(`\n=== PAGE ${pageNum} ===`);
    console.log(pageText.substring(0, 500));
    console.log('...\n');
    
    // Check for index indicators
    const lowerText = pageText.toLowerCase();
    if (lowerText.includes('contents') || 
        lowerText.includes('index') || 
        lowerText.includes('syllabus') ||
        lowerText.includes('module')) {
      console.log('🔍 POTENTIAL INDEX PAGE - Contains keywords');
    }
    
    // Check for page number patterns
    if (/\.{3,}\s*\d+/.test(pageText) || /\d+\s*$/.test(pageText)) {
      console.log('🔍 POTENTIAL INDEX PAGE - Has page number patterns');
    }
  }
}

inspectPDF().catch(console.error);
