#!/usr/bin/env tsx
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';

async function debugIndexDetection() {
  const pdfPath = path.join(process.cwd(), 'electrician', 'Electrician - 1st year - TT (NSQF 2022).pdf');
  
  console.log('🔍 Debugging index detection...\n');
  
  const loadingTask = pdfjsLib.getDocument(pdfPath);
  const pdf = await loadingTask.promise;
  
  // Check page 7 specifically (where we saw CONTENTS)
  const page = await pdf.getPage(7);
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
  
  console.log('=== PAGE 7 TEXT ===');
  console.log(pageText);
  console.log('\n=== ANALYSIS ===');
  
  const lowerText = pageText.toLowerCase();
  console.log('Contains "contents":', lowerText.includes('contents'));
  console.log('Contains "module":', lowerText.includes('module'));
  
  const pageNumberPattern = /\.{2,}\s*\d+|[-–—]{2,}\s*\d+/g;
  const matches = pageText.match(pageNumberPattern);
  console.log('Page number patterns found:', matches ? matches.length : 0);
  if (matches) {
    console.log('Sample matches:', matches.slice(0, 5));
  }
  
  // Test isIndexPage logic
  const hasIndexKeywords = 
    lowerText.includes('contents') ||
    lowerText.includes('index') ||
    lowerText.includes('table of contents') ||
    lowerText.includes('syllabus');
  
  const hasPageNumbers = matches && matches.length >= 3;
  
  console.log('\nhasIndexKeywords:', hasIndexKeywords);
  console.log('hasPageNumbers:', hasPageNumbers);
  console.log('Would be detected as index:', hasIndexKeywords && hasPageNumbers);
}

debugIndexDetection().catch(console.error);
