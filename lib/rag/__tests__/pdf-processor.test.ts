import { describe, it, expect, beforeAll } from 'vitest'
import { PDFProcessor } from '../pdf-processor'

describe('PDF Processor Tests', () => {
  let processor: PDFProcessor

  beforeAll(() => {
    processor = new PDFProcessor()
  })

  describe('Content Filtering', () => {
    it('should remove bibliography sections', async () => {
      const text = `
Chapter 1: Introduction
This is the main content.

Bibliography
Reference 1
Reference 2

Chapter 2: Conclusion
More content here.
      `
      
      const filtered = await processor.filterContent(text)
      
      expect(filtered).toContain('Chapter 1: Introduction')
      expect(filtered).toContain('This is the main content')
      expect(filtered).not.toContain('Bibliography')
      expect(filtered).not.toContain('Reference 1')
      expect(filtered).toContain('Chapter 2: Conclusion')
    })

    it('should remove references sections', async () => {
      const text = `
Main content here.


References
[1] Author, Title
[2] Another reference


Next section
      `
      
      const filtered = await processor.filterContent(text)
      
      expect(filtered).toContain('Main content here')
      expect(filtered).not.toContain('References')
      expect(filtered).not.toContain('[1] Author')
      expect(filtered).toContain('Next section')
    })

    it('should remove index sections', async () => {
      const text = `
Chapter content

Index
A - Page 1
B - Page 2

Appendix A
      `
      
      const filtered = await processor.filterContent(text)
      
      expect(filtered).toContain('Chapter content')
      expect(filtered).not.toContain('Index')
      expect(filtered).not.toContain('A - Page 1')
    })

    it('should remove page numbers', async () => {
      const text = `
Content on page one
42
More content
Page 43
Even more content
      `
      
      const filtered = await processor.filterContent(text)
      
      expect(filtered).toContain('Content on page one')
      expect(filtered).not.toContain('42\n')
      expect(filtered).toContain('More content')
      expect(filtered).not.toContain('Page 43')
    })

    it('should remove header and footer patterns', async () => {
      const text = `
NSQF Level 4
ITI - Fitter
Chapter 1: Safety
Important safety information
Fitter
Page 15
More content here
      `
      
      const filtered = await processor.filterContent(text)
      
      expect(filtered).not.toContain('NSQF Level 4')
      expect(filtered).not.toContain('ITI - Fitter')
      expect(filtered).toContain('Chapter 1: Safety')
      expect(filtered).toContain('Important safety information')
      expect(filtered).not.toContain('Page 15')
    })
  })

  describe('Structure Detection', () => {
    it('should detect chapters', () => {
      const text = `
Introduction text

Chapter 1: Safety Basics
Content about safety

Chapter 2: Tools and Equipment
Content about tools

Module 3: Advanced Topics
Advanced content
      `
      
      const structure = processor.detectStructure(text)
      
      expect(structure.chapters.length).toBe(3)
      expect(structure.chapters[0].title).toContain('Chapter 1')
      expect(structure.chapters[1].title).toContain('Chapter 2')
      expect(structure.chapters[2].title).toContain('Module 3')
    })

    it('should detect numbered sections', () => {
      const text = `
Chapter 1: Introduction

1.1 Overview
Some overview text

1.2 Objectives
Objectives text

2.1 First Topic
Topic content
      `
      
      const structure = processor.detectStructure(text)
      
      expect(structure.sections.length).toBeGreaterThanOrEqual(3)
      expect(structure.sections.some(s => s.title.includes('1.1'))).toBe(true)
      expect(structure.sections.some(s => s.title.includes('1.2'))).toBe(true)
    })

    it('should detect ALL CAPS headings', () => {
      const text = `
Introduction

SAFETY PROCEDURES
Safety content here

TOOLS AND EQUIPMENT
Tools content here
      `
      
      const structure = processor.detectStructure(text)
      
      expect(structure.sections.length).toBeGreaterThanOrEqual(2)
      expect(structure.sections.some(s => s.title.includes('SAFETY PROCEDURES'))).toBe(true)
      expect(structure.sections.some(s => s.title.includes('TOOLS AND EQUIPMENT'))).toBe(true)
    })
  })

  describe('Token Estimation', () => {
    it('should estimate token count correctly', () => {
      const text = 'This is a test sentence with approximately twenty characters per token.'
      const tokenCount = processor.estimateTokenCount(text)
      
      // Rough estimate: 1 token ≈ 4 characters
      expect(tokenCount).toBeGreaterThan(0)
      expect(tokenCount).toBeLessThan(text.length)
    })

    it('should handle empty text', () => {
      const tokenCount = processor.estimateTokenCount('')
      expect(tokenCount).toBe(0)
    })
  })

  describe('Content Chunking', () => {
    it('should create chunks with proper size', async () => {
      const text = `
This is the first sentence. This is the second sentence. This is the third sentence.
This is the fourth sentence. This is the fifth sentence. This is the sixth sentence.
This is the seventh sentence. This is the eighth sentence. This is the ninth sentence.
This is the tenth sentence. This is the eleventh sentence. This is the twelfth sentence.
      `.repeat(10) // Repeat to ensure multiple chunks
      
      const chunks = await processor.chunkContent(text, {
        chunkSize: 200,
        chunkOverlap: 50,
      })
      
      expect(chunks.length).toBeGreaterThan(1)
      
      // Check that chunks don't exceed size significantly
      chunks.forEach(chunk => {
        expect(chunk.tokenCount).toBeLessThanOrEqual(250) // Allow some margin
      })
    })

    it('should preserve sentence boundaries', async () => {
      const text = `
First sentence here. Second sentence here. Third sentence here.
Fourth sentence here. Fifth sentence here. Sixth sentence here.
      `.repeat(5)
      
      const chunks = await processor.chunkContent(text, {
        chunkSize: 100,
        chunkOverlap: 20,
      })
      
      // Each chunk should end with a complete sentence
      chunks.forEach(chunk => {
        const content = chunk.content.trim()
        // Should end with sentence-ending punctuation or be the last chunk
        const endsWithPunctuation = /[.!?]$/.test(content)
        expect(endsWithPunctuation || chunk.chunkIndex === chunks.length - 1).toBe(true)
      })
    })

    it('should create overlap between consecutive chunks', async () => {
      const text = `
Sentence one. Sentence two. Sentence three. Sentence four. Sentence five.
Sentence six. Sentence seven. Sentence eight. Sentence nine. Sentence ten.
      `.repeat(5)
      
      const chunks = await processor.chunkContent(text, {
        chunkSize: 150,
        chunkOverlap: 50,
      })
      
      if (chunks.length > 1) {
        // Check that consecutive chunks have some overlap
        for (let i = 0; i < chunks.length - 1; i++) {
          const currentChunk = chunks[i].content
          const nextChunk = chunks[i + 1].content
          
          // Extract last few words from current chunk
          const currentWords = currentChunk.split(' ').slice(-10).join(' ')
          
          // Check if any of these words appear in the next chunk
          const hasOverlap = nextChunk.includes(currentWords.split(' ')[0])
          expect(hasOverlap).toBe(true)
        }
      }
    })

    it('should assign sequential chunk indexes', async () => {
      const text = `
Content here. More content. Even more content. Additional content. Final content.
      `.repeat(10)
      
      const chunks = await processor.chunkContent(text, {
        chunkSize: 100,
        chunkOverlap: 20,
      })
      
      chunks.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index)
      })
    })

    it('should handle very short text', async () => {
      const text = 'Just one short sentence.'
      
      const chunks = await processor.chunkContent(text)
      
      expect(chunks.length).toBe(1)
      expect(chunks[0].content).toContain('Just one short sentence')
    })

    it('should handle empty text', async () => {
      const text = ''
      
      const chunks = await processor.chunkContent(text)
      
      expect(chunks.length).toBe(0)
    })
  })

  describe('Configuration', () => {
    it('should use custom chunk size', async () => {
      const customProcessor = new PDFProcessor({
        chunkSize: 50,
        chunkOverlap: 10,
      })
      
      const text = `
Sentence one. Sentence two. Sentence three. Sentence four. Sentence five.
      `.repeat(10)
      
      const chunks = await customProcessor.chunkContent(text)
      
      // With smaller chunk size, should create more chunks
      expect(chunks.length).toBeGreaterThan(3)
    })

    it('should use custom exclude patterns', async () => {
      const customProcessor = new PDFProcessor({
        excludePatterns: [/^CUSTOM SECTION$/i],
      })
      
      const text = `
Main content


CUSTOM SECTION
Content to exclude


More main content
      `
      
      const filtered = await customProcessor.filterContent(text)
      
      expect(filtered).toContain('Main content')
      expect(filtered).not.toContain('CUSTOM SECTION')
      expect(filtered).not.toContain('Content to exclude')
      expect(filtered).toContain('More main content')
    })
  })

  describe('Edge Cases', () => {
    it('should handle text with no sentence boundaries', async () => {
      const text = 'This is one long text without any sentence boundaries at all just continuous text'
      
      const chunks = await processor.chunkContent(text, {
        chunkSize: 20,
        chunkOverlap: 5,
      })
      
      expect(chunks.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle text with special characters', async () => {
      const text = `
Content with special chars: @#$%^&*()
More content with numbers: 123456789
Content with symbols: ±×÷≈≠
      `
      
      const filtered = await processor.filterContent(text)
      
      expect(filtered).toContain('special chars')
      expect(filtered).toContain('numbers')
      expect(filtered).toContain('symbols')
    })

    it('should handle very long sentences', async () => {
      const longSentence = 'This is a very long sentence that goes on and on and on '.repeat(50) + '.'
      
      const chunks = await processor.chunkContent(longSentence, {
        chunkSize: 100,
        chunkOverlap: 20,
      })
      
      expect(chunks.length).toBeGreaterThan(0)
    })
  })
})
