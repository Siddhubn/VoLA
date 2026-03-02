import Tesseract from 'tesseract.js'
import { pdfToPng } from 'pdf-to-png-converter'
import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

export interface OCRConfig {
  language?: string
  maxConcurrentPages?: number
  preprocessImage?: boolean
  cacheDir?: string
}

export interface OCRResult {
  text: string
  confidence: number
  pageNumber: number
}

export interface PDFOCRResult {
  fullText: string
  pageTexts: string[]
  numPages: number
  averageConfidence: number
  processingTimeMs: number
}

export class OCRService {
  private config: Required<OCRConfig>
  private worker: Tesseract.Worker | null = null

  constructor(config: OCRConfig = {}) {
    this.config = {
      language: config.language || 'eng',
      maxConcurrentPages: config.maxConcurrentPages || 3,
      preprocessImage: config.preprocessImage ?? true,
      cacheDir: config.cacheDir || path.join(process.cwd(), '.ocr-cache')
    }
  }

  /**
   * Initialize Tesseract worker
   */
  private async initializeWorker(): Promise<void> {
    if (this.worker) return

    console.log('🔄 Initializing Tesseract OCR worker...')
    this.worker = await Tesseract.createWorker(this.config.language, 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          // Only log progress at 25% intervals to reduce noise
          if (m.progress && m.progress % 0.25 < 0.01) {
            console.log(`  OCR Progress: ${(m.progress * 100).toFixed(0)}%`)
          }
        }
      }
    })
    console.log('✅ Tesseract OCR worker initialized')
  }

  /**
   * Terminate Tesseract worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
      console.log('✅ Tesseract OCR worker terminated')
    }
  }

  /**
   * Preprocess image for better OCR results
   */
  private async preprocessImage(imagePath: string): Promise<string> {
    const outputPath = imagePath.replace('.png', '_processed.png')
    
    await sharp(imagePath)
      .grayscale() // Convert to grayscale
      .normalize() // Normalize contrast
      .sharpen() // Sharpen edges
      .threshold(128) // Binary threshold
      .toFile(outputPath)
    
    return outputPath
  }

  /**
   * Perform OCR on a single image
   */
  private async recognizeImage(imagePath: string, pageNumber: number): Promise<OCRResult> {
    await this.initializeWorker()
    
    let processedPath = imagePath
    if (this.config.preprocessImage) {
      try {
        processedPath = await this.preprocessImage(imagePath)
      } catch (error) {
        console.warn(`⚠️ Image preprocessing failed for page ${pageNumber}, using original`)
      }
    }

    const { data } = await this.worker!.recognize(processedPath)
    
    // Clean up processed image if different from original
    if (processedPath !== imagePath) {
      try {
        await fs.unlink(processedPath)
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    return {
      text: data.text,
      confidence: data.confidence,
      pageNumber
    }
  }

  /**
   * Convert PDF to images
   */
  private async convertPDFToImages(pdfPath: string): Promise<string[]> {
    console.log('  🔄 Converting PDF to images...')
    
    // Create cache directory if it doesn't exist
    await fs.mkdir(this.config.cacheDir, { recursive: true })
    
    // Convert PDF to PNG images
    const pngPages = await pdfToPng(pdfPath, {
      outputFolder: this.config.cacheDir,
      viewportScale: 2.0, // Higher resolution for better OCR
      strictPagesToProcess: false,
      verbosityLevel: 0
    } as any)

    console.log(`  ✅ Converted ${pngPages.length} pages to images`)
    
    return pngPages.map(page => page.path)
  }

  /**
   * Perform OCR on a PDF file
   */
  async processPDF(pdfPath: string): Promise<PDFOCRResult> {
    const startTime = Date.now()
    const filename = path.basename(pdfPath)
    
    console.log(`📄 Starting OCR for: ${filename}`)

    try {
      // Convert PDF to images
      const imagePaths = await this.convertPDFToImages(pdfPath)
      const numPages = imagePaths.length

      console.log(`  🔄 Performing OCR on ${numPages} pages...`)
      
      // Process pages in batches
      const pageTexts: string[] = []
      const confidences: number[] = []
      const batchSize = this.config.maxConcurrentPages
      
      for (let i = 0; i < imagePaths.length; i += batchSize) {
        const batch = imagePaths.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(imagePaths.length / batchSize)
        
        console.log(`  📦 Processing batch ${batchNumber}/${totalBatches} (pages ${i + 1}-${Math.min(i + batchSize, imagePaths.length)})`)
        
        const batchPromises = batch.map((imagePath, idx) => 
          this.recognizeImage(imagePath, i + idx + 1)
        )
        
        const batchResults = await Promise.all(batchPromises)
        
        batchResults.forEach(result => {
          pageTexts.push(result.text)
          confidences.push(result.confidence)
        })
        
        // Clean up images after processing
        await Promise.all(batch.map(imagePath => 
          fs.unlink(imagePath).catch(() => {})
        ))
      }

      const fullText = pageTexts.join('\n\n')
      const averageConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length
      const processingTimeMs = Date.now() - startTime

      console.log(`  ✅ OCR completed in ${(processingTimeMs / 1000).toFixed(1)}s`)
      console.log(`  📊 Average confidence: ${averageConfidence.toFixed(1)}%`)
      console.log(`  📝 Extracted ${fullText.length} characters`)

      return {
        fullText,
        pageTexts,
        numPages,
        averageConfidence,
        processingTimeMs
      }

    } catch (error) {
      console.error(`❌ OCR failed for ${filename}:`, error)
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if a PDF needs OCR (has no extractable text)
   */
  static async needsOCR(pdfPath: string): Promise<boolean> {
    try {
      const { PDFParse } = await import('pdf-parse')
      const buffer = await fs.readFile(pdfPath)
      const uint8Array = new Uint8Array(buffer)
      const parser = new PDFParse(uint8Array)
      const result = await parser.getText()
      
      // Check if any pages have text
      if (result.pages && Array.isArray(result.pages)) {
        const pagesWithText = result.pages.filter((page: any) => 
          page.text && page.text.trim().length > 10
        ).length
        
        // If less than 10% of pages have text, consider it needing OCR
        return pagesWithText < result.total * 0.1
      }
      
      // If result.text is very short compared to page count, needs OCR
      const avgCharsPerPage = (result.text?.length || 0) / (result.total || 1)
      return avgCharsPerPage < 50 // Less than 50 chars per page on average
      
    } catch (error) {
      console.warn('Could not check if PDF needs OCR:', error)
      return true // Assume needs OCR if check fails
    }
  }

  /**
   * Get OCR statistics
   */
  getStats() {
    return {
      config: this.config,
      workerInitialized: this.worker !== null
    }
  }
}

// Export singleton instance
export const ocrService = new OCRService()
