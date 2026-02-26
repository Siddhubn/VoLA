import pdf from 'pdf-parse'
import fs from 'fs/promises'
import path from 'path'

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
      excludePatterns: config?.excludePatterns || DEFAULT_EXCLUDE_PATTERNS,
    }
  }

  /**
   * Extract text and metadata from a PDF file
   */
  async extractText(pdfPath: string): Promise<ExtractedContent> {
    try {
      // Read PDF file
      const dataBuffer = await fs.readFile(pdfPath)
      
      // Parse PDF
      const data = await pdf(dataBuffer, {
        // Extract text with page breaks
        pagerender: (pageData: any) => {
          return pageData.getTextContent().then((textContent: any) => {
            let lastY: number | null = null
            let text = ''
            
            for (const item of textContent.items) {
              // Add line break if Y position changed significantly
              if (lastY !== null && Math.abs(lastY - item.transform[5]) > 5) {
                text += '\n'
              }
              text += item.str
              lastY = item.transform[5]
            }
            
            return text
          })
        },
      })

      // Extract page-by-page text
      const pageTexts: string[] = []
      const dataBufferForPages = await fs.readFile(pdfPath)
      const pdfData = await pdf(dataBufferForPages)
      
      // Get individual page texts
      for (let i = 1; i <= data.numpages; i++) {
        try {
          const pageBuffer = await fs.readFile(pdfPath)
          const pageData = await pdf(pageBuffer, {
            max: i,
            pagerender: (pageData: any) => {
              return pageData.getTextContent().then((textContent: any) => {
                return textContent.items.map((item: any) => item.str).join(' ')
              })
            },
          })
          pageTexts.push(pageData.text)
        } catch (error) {
          console.warn(`Failed to extract text from page ${i}:`, error)
          pageTexts.push('')
        }
      }

      return {
        text: data.text,
        numPages: data.numpages,
        metadata: this.extractMetadata(data.info),
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
    return this.config.excludePatterns.some(pattern => pattern.test(line))
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
}

// Export default instance
export const pdfProcessor = new PDFProcessor()
