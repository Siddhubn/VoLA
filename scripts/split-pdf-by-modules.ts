#!/usr/bin/env tsx
/**
 * Split PDF by Modules - Intelligent PDF Segmentation
 * 
 * This script:
 * 1. Extracts the table of contents/index
 * 2. Identifies module boundaries (page ranges)
 * 3. Splits PDF into separate module PDFs
 * 4. Saves index as separate PDF
 * 5. Creates metadata for cross-module mapping
 * 
 * Usage:
 *   npx tsx scripts/split-pdf-by-modules.ts --input "electrician/Electrician - 1st year - TT (NSQF 2022).pdf"
 */

import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

interface ModuleBoundary {
  moduleNumber: number;
  moduleName: string;
  startPage: number;
  endPage: number;
  topics: string[];
  hours: number;
  tradeType: 'TT' | 'TP';
}

interface SplitResult {
  success: boolean;
  indexPdfPath?: string;
  modulePdfs: Array<{
    moduleNumber: number;
    moduleName: string;
    pdfPath: string;
    pageCount: number;
  }>;
  metadata: {
    originalPdf: string;
    totalPages: number;
    totalModules: number;
    tradeType: string;
  };
}

/**
 * Extract curriculum documents (index and syllabus)
 */
async function extractCurriculumDocs(
  pdfDoc: PDFDocument,
  tradeType: 'TT' | 'TP',
  outputDir: string
): Promise<void> {
  console.log('\n📚 Extracting curriculum documents...');
  
  // Define page ranges (0-indexed)
  const curriculumPages = tradeType === 'TT' ? {
    index: { start: 5, end: 8 },      // Pages 6-9
    syllabus: { start: 9, end: 15 }   // Pages 10-16
  } : {
    index: { start: 5, end: 10 },     // Pages 6-11
    syllabus: { start: 12, end: 17 }  // Pages 13-18
  };
  
  // Create curriculum directory
  const curriculumDir = path.join(outputDir, 'curriculum');
  await fs.mkdir(curriculumDir, { recursive: true });
  
  // Extract index
  console.log(`   📑 Extracting index (pages ${curriculumPages.index.start + 1}-${curriculumPages.index.end + 1})...`);
  const indexPdf = await PDFDocument.create();
  const indexPages = await indexPdf.copyPages(
    pdfDoc,
    Array.from(
      { length: curriculumPages.index.end - curriculumPages.index.start + 1 },
      (_, i) => curriculumPages.index.start + i
    )
  );
  indexPages.forEach(page => indexPdf.addPage(page));
  
  const indexPdfPath = path.join(curriculumDir, 'index.pdf');
  const indexPdfBytes = await indexPdf.save();
  await fs.writeFile(indexPdfPath, indexPdfBytes);
  console.log(`   ✅ Saved: ${indexPdfPath}`);
  
  // Extract syllabus
  console.log(`   📋 Extracting syllabus (pages ${curriculumPages.syllabus.start + 1}-${curriculumPages.syllabus.end + 1})...`);
  const syllabusPdf = await PDFDocument.create();
  const syllabusPages = await syllabusPdf.copyPages(
    pdfDoc,
    Array.from(
      { length: curriculumPages.syllabus.end - curriculumPages.syllabus.start + 1 },
      (_, i) => curriculumPages.syllabus.start + i
    )
  );
  syllabusPages.forEach(page => syllabusPdf.addPage(page));
  
  const syllabusPdfPath = path.join(curriculumDir, 'syllabus.pdf');
  const syllabusPdfBytes = await syllabusPdf.save();
  await fs.writeFile(syllabusPdfPath, syllabusPdfBytes);
  console.log(`   ✅ Saved: ${syllabusPdfPath}\n`);
}

/**
 * Parse module boundaries using manually identified page ranges
 */
async function detectModuleBoundaries(
  tradeType: 'TT' | 'TP',
  totalPages: number
): Promise<ModuleBoundary[]> {
  console.log('📖 Using manually identified page ranges');
  
  // Manually identified page ranges (0-indexed for PDF processing)
  // TT: +16 offset, TP: +18 offset
  const moduleDefinitions = tradeType === 'TT' ? [
    { num: 1, name: 'Safety practice and hand tools', start: 16 },
    { num: 2, name: 'Wires, Joints - Soldering - U.G. Cables', start: 44 },
    { num: 3, name: 'Basic Electrical Practice', start: 69 },
    { num: 4, name: 'Magnetism and Capacitors', start: 88 },
    { num: 5, name: 'AC Circuits', start: 100 },
    { num: 6, name: 'Cells and Batteries', start: 135 },
    { num: 7, name: 'Basic wiring practice', start: 147 },
    { num: 8, name: 'Wiring Installation and Earthing', start: 183 },
    { num: 9, name: 'Illumination', start: 203 },
    { num: 10, name: 'Measuring Instruments', start: 220 },
    { num: 11, name: 'Domestic appliances', start: 256 },
    { num: 12, name: 'Transformers', start: 275 }
  ] : [
    { num: 1, name: 'Safety practice and hand tools', start: 18 },
    { num: 2, name: 'Wires, Joints Soldering - U.G. Cables', start: 54 },
    { num: 3, name: 'Basic Electrical Practice', start: 81 },
    { num: 4, name: 'Magnetism and Capacitors', start: 98 },
    { num: 5, name: 'AC Circuits', start: 113 },
    { num: 6, name: 'Cells and Batteries', start: 139 },
    { num: 7, name: 'Basic Wiring Practice', start: 150 },
    { num: 8, name: 'Wiring Installation and earthing', start: 173 },
    { num: 9, name: 'Illumination', start: 197 },
    { num: 10, name: 'Measuring Instruments', start: 208 },
    { num: 11, name: 'Domestic Appliances', start: 230 },
    { num: 12, name: 'Transformers', start: 248 }
  ];
  
  const modules: ModuleBoundary[] = [];
  
  for (let i = 0; i < moduleDefinitions.length; i++) {
    const def = moduleDefinitions[i];
    const nextDef = moduleDefinitions[i + 1];
    
    modules.push({
      moduleNumber: def.num,
      moduleName: def.name,
      startPage: def.start,
      endPage: nextDef ? nextDef.start - 1 : totalPages - 1,
      topics: [],
      hours: 0,
      tradeType
    });
  }
  
  return modules;
}

/**
 * Split PDF into separate module PDFs
 */
async function splitPDFByModules(
  pdfDoc: PDFDocument,
  inputPdfPath: string,
  modules: ModuleBoundary[],
  outputDir: string
): Promise<SplitResult> {
  console.log(`\n📄 Processing PDF: ${path.basename(inputPdfPath)}`);
  
  const totalPages = pdfDoc.getPageCount();
  
  console.log(`   Total pages: ${totalPages}`);
  console.log(`   Detected modules: ${modules.length}\n`);
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });
  
  const result: SplitResult = {
    success: true,
    modulePdfs: [],
    metadata: {
      originalPdf: path.basename(inputPdfPath),
      totalPages,
      totalModules: modules.length,
      tradeType: modules[0]?.tradeType || 'TT'
    }
  };
  
  // Split into module PDFs
  console.log('📚 Splitting into module PDFs...\n');
  
  for (const module of modules) {
    try {
      console.log(`   Module ${module.moduleNumber}: ${module.moduleName}`);
      console.log(`   Pages: ${module.startPage + 1}-${module.endPage + 1}`);
      
      // Create new PDF for this module
      const modulePdf = await PDFDocument.create();
      
      // Validate page range
      const startPage = Math.max(0, Math.min(module.startPage, totalPages - 1));
      const endPage = Math.max(startPage, Math.min(module.endPage, totalPages - 1));
      
      const pageIndices = Array.from(
        { length: endPage - startPage + 1 },
        (_, i) => startPage + i
      );
      
      const modulePages = await modulePdf.copyPages(pdfDoc, pageIndices);
      modulePages.forEach(page => modulePdf.addPage(page));
      
      // Save module PDF
      const sanitizedName = module.moduleName
        .replace(/[^a-z0-9\s-]/gi, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
      
      const modulePdfPath = path.join(
        outputDir,
        `module-${module.moduleNumber}-${sanitizedName}.pdf`
      );
      
      const modulePdfBytes = await modulePdf.save();
      await fs.writeFile(modulePdfPath, modulePdfBytes);
      
      result.modulePdfs.push({
        moduleNumber: module.moduleNumber,
        moduleName: module.moduleName,
        pdfPath: modulePdfPath,
        pageCount: pageIndices.length
      });
      
      console.log(`   ✅ Saved: ${modulePdfPath} (${pageIndices.length} pages)\n`);
      
    } catch (error) {
      console.error(`   ❌ Error processing module ${module.moduleNumber}:`, error);
    }
  }
  
  // Save metadata
  const metadataPath = path.join(outputDir, 'split-metadata.json');
  await fs.writeFile(
    metadataPath,
    JSON.stringify({
      ...result.metadata,
      modules: modules.map(m => ({
        moduleNumber: m.moduleNumber,
        moduleName: m.moduleName,
        startPage: m.startPage + 1, // 1-indexed for humans
        endPage: m.endPage + 1,
        pageCount: m.endPage - m.startPage + 1
      })),
      modulePdfs: result.modulePdfs.map(m => ({
        ...m,
        pdfPath: path.basename(m.pdfPath)
      }))
    }, null, 2)
  );
  
  console.log(`\n📋 Metadata saved: ${metadataPath}`);
  
  return result;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let inputPdf = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && i + 1 < args.length) {
      inputPdf = args[i + 1];
    }
  }
  
  if (!inputPdf) {
    console.error('❌ Error: --input parameter is required');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/split-pdf-by-modules.ts --input "path/to/pdf"');
    console.log('\nExample:');
    console.log('  npx tsx scripts/split-pdf-by-modules.ts --input "electrician/Electrician - 1st year - TT (NSQF 2022).pdf"');
    process.exit(1);
  }
  
  console.log('🚀 PDF Module Splitter\n');
  console.log('═'.repeat(60));
  
  try {
    // Detect trade type from filename
    const tradeType = inputPdf.toLowerCase().includes(' tt ') ? 'TT' : 'TP';
    console.log(`\n📖 Trade Type: ${tradeType === 'TT' ? 'Trade Theory' : 'Trade Practical'}`);
    
    // Load PDF to get page count
    console.log('\n📝 Loading PDF...');
    const pdfBytes = await fs.readFile(inputPdf);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const numPages = pdfDoc.getPageCount();
    console.log(`   ✅ Total pages: ${numPages}`);
    
    // Use manual page ranges
    console.log('\n🔍 Using manually identified module boundaries...');
    const modules = await detectModuleBoundaries(tradeType, numPages);
    console.log(`   ✅ Configured ${modules.length} modules`);
    
    // Create output directory
    const outputDir = `electrician-sep-modules/${tradeType}`;
    
    // Extract curriculum documents (index and syllabus)
    await extractCurriculumDocs(pdfDoc, tradeType, outputDir);
    
    // Split PDF
    console.log('✂️  Splitting PDF by modules...');
    const result = await splitPDFByModules(pdfDoc, inputPdf, modules, outputDir);
    
    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ PDF Split Complete!\n');
    console.log(`📁 Output directory: ${outputDir}`);
    console.log(`📑 Index PDF: ${result.indexPdfPath ? 'Yes' : 'No'}`);
    console.log(`📚 Module PDFs: ${result.modulePdfs.length}`);
    console.log(`📄 Total pages processed: ${result.metadata.totalPages}`);
    
    console.log('\n📚 Module PDFs created:');
    result.modulePdfs.forEach(m => {
      console.log(`   ${m.moduleNumber}. ${m.moduleName} (${m.pageCount} pages)`);
    });
    
    console.log('\n💡 Next steps:');
    console.log('   1. Review the split PDFs in:', outputDir);
    console.log('   2. Run the processing script on each module PDF');
    console.log('   3. Vector embeddings will be created with proper module context');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { splitPDFByModules, detectModuleBoundaries, extractCurriculumDocs };
