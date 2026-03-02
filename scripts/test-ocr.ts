#!/usr/bin/env tsx

/**
 * Test OCR on a single PDF
 */

import { OCRService } from '../lib/rag/ocr-service'
import path from 'path'

async function testOCR() {
  console.log('🧪 Testing OCR Service\n')
  
  const testFile = path.join(process.cwd(), 'fitter', 'Fitter - 1st Year - TP (NSQF 2022).pdf')
  
  console.log(`Testing with: ${path.basename(testFile)}\n`)
  
  const ocrService = new OCRService({
    language: 'eng',
    maxConcurrentPages: 2, // Process 2 pages at a time
    preprocessImage: true
  })
  
  try {
    // Check if PDF needs OCR
    console.log('Checking if PDF needs OCR...')
    const needsOCR = await OCRService.needsOCR(testFile)
    console.log(`Needs OCR: ${needsOCR ? 'YES' : 'NO'}\n`)
    
    if (!needsOCR) {
      console.log('✅ PDF has extractable text, OCR not needed')
      return
    }
    
    // Perform OCR
    console.log('Starting OCR processing...\n')
    const result = await ocrService.processPDF(testFile)
    
    console.log('\n📊 OCR Results:')
    console.log(`  Pages processed: ${result.numPages}`)
    console.log(`  Total characters: ${result.fullText.length}`)
    console.log(`  Average confidence: ${result.averageConfidence.toFixed(1)}%`)
    console.log(`  Processing time: ${(result.processingTimeMs / 1000).toFixed(1)}s`)
    console.log(`  Speed: ${(result.numPages / (result.processingTimeMs / 1000)).toFixed(2)} pages/sec`)
    
    console.log('\n📝 Sample text (first 500 characters):')
    console.log(result.fullText.substring(0, 500))
    console.log('...')
    
    console.log('\n✅ OCR test completed successfully!')
    
  } catch (error) {
    console.error('\n❌ OCR test failed:', error)
    process.exit(1)
  } finally {
    await ocrService.terminate()
  }
}

testOCR()
