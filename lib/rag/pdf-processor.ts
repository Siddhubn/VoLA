import fs from 'fs/promises'
import path from 'path'
import { moduleDetector, ModuleInfo, ModuleDetectionResult } from './module-detector'
import { OCRService } from './ocr-service'

// Lazy load pdf-parse (uses new PDFParse class API)
let PDFParseClass: any = null
async function getPDFParseClass() {
  if (!PDFParseClass) {
    try {
      // Import pdf-parse - it now exports a PDFParse class
      const module = await import('pdf-parse')
      PDFParseClass = module.PDFParse
      
      if (!PDFParseClass || typeof PDFParseClass !== 'function') {
        throw new Error(`pdf-parse import failed: PDFParse class not found`)
      }
    } catch (error) {
      console.error('Failed to import pdf-parse:', error)
      throw error
    }
  }
  return PDFParseClass
}

export interface PDFProcessorConfig {
  chunkSize: number // Target tokens per chunk
  chunkOverlap: number // Overlap tokens
  excludePatterns: string[] // Patterns to exclude
}

export interface ProcessedChunk {
  content: string
  module: string | null
  section: string | null
  pageNumber: number
  chunkIndex: number
  tokenCount: number
  metadata: Record<string, any>
}

export interface PDFMetadata {
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modDate?: Date
}

export interface ExtractedContent {
  text: string
  numPages: number
  metadata: PDFMetadata
  pageTexts: string[] // Text per page
}

// Patterns to exclude from content
const DEFAULT_EXCLUDE_PATTERNS = [
  /^bibliography$/i,
  /^references$/i,
  /^index$/i,
  /^table of contents$/i,
  /^acknowledgments?$/i,
  /^appendix [a-z]/i,
]

// Header/footer patterns to remove
const HEADER_FOOTER_PATTERNS = [
  /^NSQF Level \d+$/,
  /^ITI - \w+$/,
  /^Fitter|Electrician$/i,
  /^Page \d+$/i,
  /^\d+$/,  // Page numbers alone
  /^Chapter \d+$/i,
]

export class PDFProcessor {
  private config: PDFProcessorConfig

  constructor(config?: Partial<PDFProcessorConfig>) {
    this.config = {
      chunkSize: config?.chunkSize || 750,
      chunkOverlap: config?.chunkOverlap || 100,
      excludePatterns: (config?.excludePatterns || DEFAULT_EXCLUDE_PATTERNS) as any,
    }
  }

  /**
   * Extract text and metadata from a PDF file
   * Automatically uses OCR if PDF is image-based
   */
  async extractText(pdfPath: string): Promise<ExtractedContent> {
    try {
      // First, try normal text extraction
      const PDFParseClass = await getPDFParseClass()
      const dataBuffer = await fs.readFile(pdfPath)
      const uint8Array = new Uint8Array(dataBuffer)
      const parser = new PDFParseClass(uint8Array)
      const result = await parser.getText()
      
      const fullText = result.text || ''
      const numPages = result.total || 0
      
      // Extract page texts from the pages array
      const pageTexts: string[] = []
      if (result.pages && Array.isArray(result.pages)) {
        for (const page of result.pages) {
          pageTexts.push(page.text || '')
        }
      }
      
      // Check if PDF needs OCR (has no meaningful text)
      const avgCharsPerPage = fullText.length / (numPages || 1)
      const needsOCR = avgCharsPerPage < 50 // Less than 50 chars per page
      
      if (needsOCR) {
        console.log('  ⚠️  PDF appears to be image-based, using OCR...')
        
        // Use OCR to extract text
        const ocrService = new OCRService({
          language: 'eng',
          maxConcurrentPages: 3,
          preprocessImage: true
        })
        
        try {
          const ocrResult = await ocrService.processPDF(pdfPath)
          
          // Get document info
          let metadata: PDFMetadata = {}
          try {
            const info = await parser.getInfo()
            metadata = this.extractMetadata(info)
          } catch (error) {
            console.warn('Could not extract PDF metadata:', error)
          }
          
          // Clean up OCR worker
          await ocrService.terminate()
          
          return {
            text: ocrResult.fullText,
            numPages: ocrResult.numPages,
            metadata: {
              ...metadata,
              ocrProcessed: true,
              ocrConfidence: ocrResult.averageConfidence
            } as any,
            pageTexts: ocrResult.pageTexts
          }
        } catch (ocrError) {
          console.error('  ❌ OCR failed, falling back to extracted text:', ocrError)
          // Fall back to whatever text was extracted
        } finally {
          await ocrService.terminate()
        }
      }
      
      // Get document info
      let metadata: PDFMetadata = {}
      try {
        const info = await parser.getInfo()
        metadata = this.extractMetadata(info)
      } catch (error) {
        console.warn('Could not extract PDF metadata:', error)
      }

      return {
        text: fullText,
        numPages,
        metadata,
        pageTexts,
      }
    } catch (error: any) {
      throw new Error(`Failed to extract text from PDF: ${error.message}`)
    }
  }

  /**
   * Extract and normalize PDF metadata
   */
  private extractMetadata(info: any): PDFMetadata {
    return {
      title: info?.Title,
      author: info?.Author,
      subject: info?.Subject,
      keywords: info?.Keywords,
      creator: info?.Creator,
      producer: info?.Producer,
      creationDate: info?.CreationDate ? new Date(info.CreationDate) : undefined,
      modDate: info?.ModDate ? new Date(info.ModDate) : undefined,
    }
  }

  /**
   * Filter content to remove unwanted sections
   */
  async filterContent(text: string): Promise<string> {
    const lines = text.split('\n')
    const filteredLines: string[] = []
    let skipSection = false
    let emptyLineCount = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Check if we should skip this section
      if (this.shouldExcludeSection(line)) {
        skipSection = true
        continue
      }

      // Check if section ended (new heading, significant content, or multiple empty lines)
      if (skipSection) {
        if (line.length === 0) {
          emptyLineCount++
          // After 2+ empty lines, assume section ended
          if (emptyLineCount >= 2) {
            skipSection = false
            emptyLineCount = 0
          }
        } else if (this.isNewSection(line)) {
          skipSection = false
          emptyLineCount = 0
        } else {
          emptyLineCount = 0
        }
      }

      // Skip if in excluded section
      if (skipSection) {
        continue
      }

      // Remove header/footer patterns
      if (this.isHeaderOrFooter(line)) {
        continue
      }

      // Keep the line if it has meaningful content
      if (line.length > 0) {
        filteredLines.push(line)
      }
    }

    return filteredLines.join('\n')
  }

  /**
   * Check if a line indicates a section to exclude
   */
  private shouldExcludeSection(line: string): boolean {
    return this.config.excludePatterns.some((pattern: any) => pattern.test(line))
  }

  /**
   * Check if a line is a header or footer
   */
  private isHeaderOrFooter(line: string): boolean {
    return HEADER_FOOTER_PATTERNS.some(pattern => pattern.test(line))
  }

  /**
   * Check if a line indicates a new section
   */
  private isNewSection(line: string): boolean {
    // Check for common heading patterns
    const headingPatterns = [
      /^Chapter \d+/i,
      /^Module \d+/i,
      /^Unit \d+/i,
      /^\d+\.\s+[A-Z]/,  // Numbered headings like "1. Introduction"
      /^[A-Z][A-Z\s]+$/,  // ALL CAPS headings
    ]

    return headingPatterns.some(pattern => pattern.test(line))
  }

  /**
   * Detect document structure (chapters, sections, headings)
   */
  detectStructure(text: string): {
    chapters: Array<{ title: string; startIndex: number }>
    sections: Array<{ title: string; startIndex: number; chapter?: string }>
  } {
    const lines = text.split('\n')
    const chapters: Array<{ title: string; startIndex: number }> = []
    const sections: Array<{ title: string; startIndex: number; chapter?: string }> = []
    
    let currentChapter: string | undefined

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Detect chapters
      const chapterMatch = line.match(/^(?:Chapter|Module|Unit)\s+(\d+)[:\s]*(.*)$/i)
      if (chapterMatch) {
        const title = line
        currentChapter = title
        chapters.push({ title, startIndex: i })
        continue
      }

      // Detect sections (numbered headings)
      const sectionMatch = line.match(/^(\d+(?:\.\d+)*)\s+([A-Z].+)$/)
      if (sectionMatch) {
        sections.push({
          title: line,
          startIndex: i,
          chapter: currentChapter,
        })
        continue
      }

      // Detect ALL CAPS headings (but not single words)
      if (line.length > 10 && line === line.toUpperCase() && /^[A-Z\s]+$/.test(line)) {
        sections.push({
          title: line,
          startIndex: i,
          chapter: currentChapter,
        })
      }
    }

    return { chapters, sections }
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (can be improved with NLP library)
    return text
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.trim().length > 0)
  }

  /**
   * Chunk content with overlap and sentence boundary preservation
   */
  async chunkContent(
    text: string,
    config?: Partial<PDFProcessorConfig>
  ): Promise<ProcessedChunk[]> {
    const chunkSize = config?.chunkSize || this.config.chunkSize
    const chunkOverlap = config?.chunkOverlap || this.config.chunkOverlap

    const sentences = this.splitIntoSentences(text)
    const chunks: ProcessedChunk[] = []
    
    let currentSentences: string[] = []
    let currentTokenCount = 0
    let chunkIndex = 0

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      const sentenceTokens = this.estimateTokenCount(sentence)

      // If adding this sentence exceeds chunk size and we have content, create a chunk
      if (currentTokenCount + sentenceTokens > chunkSize && currentSentences.length > 0) {
        // Create the current chunk
        chunks.push({
          content: currentSentences.join(' '),
          module: null,
          section: null,
          pageNumber: 0, // Will be set later
          chunkIndex: chunkIndex++,
          tokenCount: currentTokenCount,
          metadata: {},
        })

        // Calculate overlap for next chunk
        // Find sentences that fit within overlap limit, starting from the end
        let overlapTokens = 0
        let overlapSentences: string[] = []
        
        // Work backwards through current sentences to build overlap
        for (let j = currentSentences.length - 1; j >= 0; j--) {
          const sentenceTokens = this.estimateTokenCount(currentSentences[j])
          if (overlapTokens + sentenceTokens <= chunkOverlap) {
            overlapTokens += sentenceTokens
            overlapSentences.unshift(currentSentences[j])
          } else {
            break
          }
        }

        // Start new chunk with overlap sentences
        currentSentences = [...overlapSentences]
        currentTokenCount = overlapTokens
      }

      // Add sentence to current chunk
      currentSentences.push(sentence)
      currentTokenCount += sentenceTokens
    }

    // Add final chunk if there's content
    if (currentSentences.length > 0) {
      chunks.push({
        content: currentSentences.join(' '),
        module: null,
        section: null,
        pageNumber: 0,
        chunkIndex: chunkIndex++,
        tokenCount: currentTokenCount,
        metadata: {},
      })
    }

    return chunks
  }

  /**
   * Process a PDF file end-to-end
   */
  async processPDF(pdfPath: string): Promise<{
    content: ExtractedContent
    filteredText: string
    structure: ReturnType<PDFProcessor['detectStructure']>
    chunks: ProcessedChunk[]
  }> {
    console.log(`📄 Processing PDF: ${path.basename(pdfPath)}`)

    // Extract text
    console.log('  🔄 Extracting text...')
    const content = await this.extractText(pdfPath)
    console.log(`  ✅ Extracted ${content.numPages} pages`)

    // Filter content
    console.log('  🔄 Filtering content...')
    const filteredText = await this.filterContent(content.text)
    console.log(`  ✅ Filtered content (${filteredText.length} characters)`)

    // Detect structure
    console.log('  🔄 Detecting structure...')
    const structure = this.detectStructure(filteredText)
    console.log(`  ✅ Found ${structure.chapters.length} chapters, ${structure.sections.length} sections`)

    // Chunk content
    console.log('  🔄 Chunking content...')
    const chunks = await this.chunkContent(filteredText)
    console.log(`  ✅ Created ${chunks.length} chunks`)

    return {
      content,
      filteredText,
      structure,
      chunks,
    }
  }

  /**
   * Detect modules in the extracted text with syllabus type detection
   */
  async detectModules(
    text: string, 
    course: 'fitter' | 'electrician', 
    filename: string
  ): Promise<{ moduleDetection: ModuleDetectionResult; syllabusInfo: any }> {
    console.log(`  🔄 Detecting syllabus type and modules for ${course} course...`)
    
    // First detect syllabus type from filename and content
    const syllabusInfo = moduleDetector.detectSyllabusType(filename, text)
    console.log(`  📋 Detected syllabus: ${syllabusInfo.course} - ${syllabusInfo.syllabusType} (confidence: ${(syllabusInfo.confidence * 100).toFixed(1)}%)`)
    
    // Then detect modules based on syllabus type
    const moduleDetection = moduleDetector.detectModules(text, course, syllabusInfo.syllabusType as any)
    
    console.log(`  ✅ Detected ${moduleDetection.detectedModules.length} modules`)
    moduleDetection.detectedModules.forEach(module => {
      console.log(`    - ${module.moduleName} (confidence: ${(module.confidence * 100).toFixed(1)}%)`)
    })

    return { moduleDetection, syllabusInfo }
  }

  /**
   * Assign modules to chunks based on content analysis with syllabus type
   */
  async assignModulesToChunks(
    chunks: ProcessedChunk[], 
    course: 'fitter' | 'electrician',
    syllabusType: 'TP' | 'TT' = 'TP',
    detectedModules?: ModuleInfo[]
  ): Promise<ProcessedChunk[]> {
    console.log(`  🔄 Assigning ${syllabusType} modules to ${chunks.length} chunks...`)
    
    // Get all modules for this course and syllabus type to look up names
    const allModules = moduleDetector.getModulesForCourse(course, syllabusType)
    const moduleNameMap = new Map(allModules.map(m => [m.module_id, m.module_name]))
    
    let assignedCount = 0
    
    const updatedChunks = chunks.map(chunk => {
      const assignment = moduleDetector.assignChunkToModule(
        chunk.content, 
        course,
        syllabusType,
        detectedModules
      )
      
      if (assignment) {
        assignedCount++
        const moduleName = moduleNameMap.get(assignment.moduleId) || 'General Content'
        return {
          ...chunk,
          module: assignment.moduleId,
          metadata: {
            ...chunk.metadata,
            moduleName: moduleName,
            moduleConfidence: assignment.confidence,
            syllabusType: syllabusType
          }
        }
      }
      
      return {
        ...chunk,
        module: 'general-content',
        metadata: {
          ...chunk.metadata,
          moduleName: 'General Content',
          syllabusType: syllabusType
        }
      }
    })

    console.log(`  ✅ Assigned ${syllabusType} modules to ${assignedCount}/${chunks.length} chunks`)
    
    return updatedChunks
  }

  /**
   * Enhanced PDF processing with module detection and syllabus type detection
   */
  async processPDFWithModules(
    pdfPath: string, 
    course: 'fitter' | 'electrician'
  ): Promise<{
    content: ExtractedContent
    filteredText: string
    structure: ReturnType<PDFProcessor['detectStructure']>
    moduleDetection: ModuleDetectionResult
    syllabusInfo: any
    chunks: ProcessedChunk[]
  }> {
    const filename = path.basename(pdfPath)
    console.log(`📄 Processing PDF with module detection: ${filename}`)

    // Extract text
    console.log('  🔄 Extracting text...')
    const content = await this.extractText(pdfPath)
    console.log(`  ✅ Extracted ${content.numPages} pages`)

    // Filter content
    console.log('  🔄 Filtering content...')
    const filteredText = await this.filterContent(content.text)
    console.log(`  ✅ Filtered content (${filteredText.length} characters)`)

    // Detect structure
    console.log('  🔄 Detecting structure...')
    const structure = this.detectStructure(filteredText)
    console.log(`  ✅ Found ${structure.chapters.length} chapters, ${structure.sections.length} sections`)

    // Detect syllabus type and modules
    const { moduleDetection, syllabusInfo } = await this.detectModules(filteredText, course, filename)

    // Chunk content
    console.log('  🔄 Chunking content...')
    let chunks = await this.chunkContent(filteredText)
    console.log(`  ✅ Created ${chunks.length} chunks`)

    // Assign modules to chunks with syllabus type
    chunks = await this.assignModulesToChunks(
      chunks, 
      course, 
      syllabusInfo.syllabusType, 
      moduleDetection.detectedModules
    )

    return {
      content,
      filteredText,
      structure,
      moduleDetection,
      syllabusInfo,
      chunks,
    }
  }
}

// Export default instance
export const pdfProcessor = new PDFProcessor()
