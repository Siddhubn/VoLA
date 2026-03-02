#!/usr/bin/env tsx

/**
 * OCR PDFs using FREE OCR.space API
 * No cost, no installation required!
 * 
 * Get free API key: https://ocr.space/ocrapi
 * (25,000 requests/month free)
 */

import fs from 'fs/promises'
import path from 'path'
import FormData from 'form-data'
import fetch from 'node-fetch'

const OCR_API_KEY = process.env.OCR_SPACE_API_KEY || 'K87899142388957' // Free demo key

interface OCRResult {
  ParsedText: string
  ErrorMessage?: string
}

interface OCRResponse {
  ParsedResults: OCRResult[]
  OCRExitCode: number
  IsErroredOnProcessing: boolean
  ErrorMessage?: string[]
}

async function ocrPDF(pdfPath: string): Promise<string> {
  const filename = path.basename(pdfPath)
  console.log(`\n📄 OCR'ing: ${filename}`)
  
  try {
    // Read PDF file
    const fileBuffer = await fs.readFile(pdfPath)
    
    // Create form data
    const formData = new FormData()
    formData.append('file', fileBuffer, filename)
    formData.append('apikey', OCR_API_KEY)
    formData.append('language', 'eng')
    formData.append('isOverlayRequired', 'false')
    formData.append('detectOrientation', 'true')
    formData.append('scale', 'true')
    formData.append('OCREngine', '2') // Use OCR Engine 2 for better results
    
    console.log('  🔄 Uploading to OCR.space...')
    
    // Call OCR API
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders()
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json() as OCRResponse
    
    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage?.join(', ') || 'OCR processing failed')
    }
    
    if (!result.ParsedResults || result.ParsedResults.length === 0) {
      throw new Error('No text extracted from PDF')
    }
    
    const extractedText = result.ParsedResults
      .map(r => r.ParsedText)
      .join('\n\n')
    
    console.log(`  ✅ Extracted ${extractedText.length} characters`)
    
    return extractedText
    
  } catch (error) {
    console.error(`  ❌ OCR failed:`, error)
    throw error
  }
}

async function savePDFWithText(originalPath: string, text: string): Promise<void> {
  // Save extracted text to a .txt file
  const txtPath = originalPath.replace('.pdf', '_ocr.txt')
  await fs.writeFile(txtPath, text, 'utf-8')
  console.log(`  💾 Saved to: ${path.basename(txtPath)}`)
}

async function main() {
  console.log('🆓 Free OCR using OCR.space API\n')
  console.log('Note: Free tier has limits. For large PDFs, use Google Drive method instead.\n')
  
  // Find PDFs
  const courses = ['fitter', 'electrician']
  const pdfs: string[] = []
  
  for (const course of courses) {
    const courseDir = path.join(process.cwd(), course)
    try {
      const files = await fs.readdir(courseDir)
      for (const file of files) {
        if (file.toLowerCase().endsWith('.pdf')) {
          pdfs.push(path.join(courseDir, file))
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read ${course} directory`)
    }
  }
  
  if (pdfs.length === 0) {
    console.log('❌ No PDFs found in fitter/ or electrician/ folders')
    return
  }
  
  console.log(`Found ${pdfs.length} PDFs:\n`)
  pdfs.forEach((pdf, i) => {
    console.log(`  ${i + 1}. ${path.basename(pdf)}`)
  })
  
  console.log('\n⚠️  WARNING: OCR.space free tier may not handle large PDFs well.')
  console.log('For best results, use Google Drive method (see FREE-OCR-SOLUTION.md)\n')
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')
  
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  // Process each PDF
  for (const pdfPath of pdfs) {
    try {
      const text = await ocrPDF(pdfPath)
      await savePDFWithText(pdfPath, text)
    } catch (error) {
      console.error(`Failed to process ${path.basename(pdfPath)}`)
    }
    
    // Rate limiting - wait between requests
    console.log('  ⏳ Waiting 3 seconds before next PDF...')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  
  console.log('\n✅ OCR processing complete!')
  console.log('\n📝 Text files saved with _ocr.txt extension')
  console.log('\n⚠️  Note: OCR.space free tier may not extract all pages from large PDFs.')
  console.log('For complete extraction, use Google Drive method (FREE-OCR-SOLUTION.md)')
}

main().catch(console.error)
