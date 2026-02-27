import { describe, it, expect, beforeAll } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'
import { createPDFDocument, createKnowledgeChunk } from '@/lib/rag/rag-db'
import { query } from '@/lib/postgresql'

describe('GET /api/rag/stats', () => {
  beforeAll(async () => {
    // Ensure we have some test data
    await query('DELETE FROM knowledge_chunks WHERE pdf_source = $1', ['test-api-stats.pdf'])
    await query('DELETE FROM pdf_documents WHERE filename = $1', ['test-api-stats.pdf'])
    
    await createPDFDocument({
      course: 'fitter',
      filename: 'test-api-stats.pdf',
      file_path: '/test/api-stats.pdf',
      total_chunks: 10,
      processing_status: 'completed'
    })
    
    await createKnowledgeChunk({
      course: 'fitter',
      pdf_source: 'test-api-stats.pdf',
      module: 'safety',
      chunk_index: 1,
      content: 'Test content',
      token_count: 50
    })
  })
  
  describe('system stats', () => {
    it('should return system statistics', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/stats?type=system')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.stats).toHaveProperty('total_pdfs')
      expect(data.stats).toHaveProperty('total_chunks')
      expect(data.stats).toHaveProperty('total_embeddings')
      expect(data.stats).toHaveProperty('pdfs_by_status')
      expect(data.stats).toHaveProperty('chunks_by_course')
    })
    
    it('should default to system stats when no type specified', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/stats')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.stats).toHaveProperty('total_pdfs')
    })
  })
  
  describe('processing stats', () => {
    it('should return PDF processing statistics', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/stats?type=processing')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.stats)).toBe(true)
    })
  })
  
  describe('database stats', () => {
    it('should return database statistics', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/stats?type=database')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.stats).toHaveProperty('database_size')
      expect(data.stats).toHaveProperty('largest_tables')
    })
  })
  
  describe('module stats', () => {
    it('should return module statistics for all courses', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/stats?type=modules')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.stats)).toBe(true)
    })
    
    it('should filter module statistics by course', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/stats?type=modules&course=fitter')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.stats)).toBe(true)
      
      // All results should be for fitter course
      data.stats.forEach((stat: any) => {
        expect(stat.course).toBe('fitter')
      })
    })
  })
  
  describe('chat stats', () => {
    it('should return chat statistics', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/stats?type=chat')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.stats).toHaveProperty('total_messages')
      expect(data.stats).toHaveProperty('unique_sessions')
    })
  })
  
  describe('PDF summary', () => {
    it('should return PDF processing summary', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/stats?type=pdf&filename=test-api-stats.pdf')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.stats).toHaveProperty('pdf')
      expect(data.stats).toHaveProperty('chunks')
      expect(data.stats).toHaveProperty('modules')
    })
    
    it('should return 400 when filename is missing for pdf type', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/stats?type=pdf')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('filename parameter required')
    })
    
    it('should return 404 when PDF not found', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/stats?type=pdf&filename=non-existent.pdf')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('PDF not found')
    })
  })
  
  describe('error handling', () => {
    it('should return 400 for invalid type', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/stats?type=invalid')
      const response = await GET(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid type parameter')
    })
  })
})
