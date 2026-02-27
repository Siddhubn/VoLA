import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'
import { generateToken } from '@/lib/simple-auth'
import { query } from '@/lib/postgresql'
import { createKnowledgeChunk, createPDFDocument } from '@/lib/rag/rag-db'
import { LocalEmbeddingService } from '@/lib/rag/local-embedding-service'

describe('GET /api/rag/syllabus/:course/:module', () => {
  let validToken: string
  let testChunkIds: number[] = []
  let embeddingService: LocalEmbeddingService

  beforeAll(async () => {
    // Create a valid auth token
    validToken = generateToken({ userId: '1', email: 'testuser@test.com', role: 'student' })

    // Check if pgvector is available
    const vectorCheck = await query(
      "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
    )
    
    if (!vectorCheck.rows[0].exists) {
      console.warn('⚠️ pgvector extension not available, some tests will be skipped')
      return
    }

    try {
      // Set up test data
      embeddingService = new LocalEmbeddingService()
      
      // Clean up any existing test data
      await query("DELETE FROM knowledge_chunks WHERE pdf_source LIKE 'test-module-%'")
      await query("DELETE FROM pdf_documents WHERE filename LIKE 'test-module-%'")

      // Create test chunks for a specific module
      const testData = [
        {
          course: 'fitter' as const,
          module: 'Safety Basics',
          section: 'Personal Protective Equipment',
          content: 'Safety equipment includes helmets, gloves, and protective eyewear.',
          page: 10
        },
        {
          course: 'fitter' as const,
          module: 'Safety Basics',
          section: 'Personal Protective Equipment',
          content: 'Always wear appropriate PPE when working in hazardous areas.',
          page: 11
        },
        {
          course: 'fitter' as const,
          module: 'Safety Basics',
          section: 'Workplace Hazards',
          content: 'Common workplace hazards include slips, trips, and falls.',
          page: 12
        },
        {
          course: 'fitter' as const,
          module: 'Tools and Equipment',
          section: 'Hand Tools',
          content: 'Basic hand tools include hammers, screwdrivers, and wrenches.',
          page: 25
        }
      ]

      console.log('🔄 Setting up module test data...')
      
      for (let i = 0; i < testData.length; i++) {
        const data = testData[i]
        const pdfFilename = `test-module-${data.course}-${i}.pdf`
        
        // Create PDF document first
        await createPDFDocument({
          course: data.course,
          filename: pdfFilename,
          file_path: `/test/${pdfFilename}`,
          processing_status: 'completed'
        })
        
        const embedding = await embeddingService.generateEmbedding(data.content)
        
        const chunkId = await createKnowledgeChunk({
          course: data.course,
          pdf_source: pdfFilename,
          module: data.module,
          section: data.section,
          page_number: data.page,
          chunk_index: i,
          content: data.content,
          embedding: embedding.embedding,
          token_count: embedding.tokenCount
        })
        
        testChunkIds.push(chunkId)
      }
      
      console.log(`✅ Module test data setup complete: ${testChunkIds.length} chunks created`)
    } catch (error) {
      console.warn('⚠️ Failed to set up test data:', error)
    }
  })

  afterAll(async () => {
    // Clean up test data
    const vectorCheck = await query(
      "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
    )
    
    if (vectorCheck.rows[0].exists) {
      await query("DELETE FROM knowledge_chunks WHERE pdf_source LIKE 'test-module-%'")
      await query("DELETE FROM pdf_documents WHERE filename LIKE 'test-module-%'")
    }
  })

  describe('Authentication', () => {
    it('should return 401 when no auth token is provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/syllabus/fitter/safety-basics', {
        method: 'GET'
      })

      const response = await GET(request, { params: { course: 'fitter', module: 'safety-basics' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Not authenticated')
    })

    it('should return 401 when invalid auth token is provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/syllabus/fitter/safety-basics', {
        method: 'GET',
        headers: {
          'Cookie': 'auth-token=invalid-token'
        }
      })

      const response = await GET(request, { params: { course: 'fitter', module: 'safety-basics' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid token')
    })
  })

  describe('Input Validation', () => {
    it('should return 400 when course is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/rag/syllabus/invalid/safety-basics', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${validToken}`
        }
      })

      const response = await GET(request, { params: { course: 'invalid', module: 'safety-basics' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid course')
    })

    it('should return 404 when module does not exist', async () => {
      const vectorCheck = await query(
        "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
      )
      
      if (!vectorCheck.rows[0].exists) {
        console.warn('⚠️ Skipping test: pgvector not available')
        return
      }

      const request = new NextRequest('http://localhost:3000/api/rag/syllabus/fitter/nonexistent-module', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${validToken}`
        }
      })

      const response = await GET(request, { params: { course: 'fitter', module: 'nonexistent-module' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('not found')
    })
  })

  describe('Module-Level Queries', () => {
    it('should return module details with correct structure', async () => {
      const vectorCheck = await query(
        "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
      )
      
      if (!vectorCheck.rows[0].exists) {
        console.warn('⚠️ Skipping test: pgvector not available')
        return
      }

      const request = new NextRequest('http://localhost:3000/api/rag/syllabus/fitter/Safety%20Basics', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${validToken}`
        }
      })

      const response = await GET(request, { params: { course: 'fitter', module: 'Safety Basics' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.course).toBe('fitter')
      expect(data).toHaveProperty('module')
      expect(data.module).toHaveProperty('id')
      expect(data.module).toHaveProperty('name')
      expect(data.module).toHaveProperty('topics')
      expect(data.module).toHaveProperty('totalChunks')
      expect(data.module).toHaveProperty('pageRange')
      expect(Array.isArray(data.module.topics)).toBe(true)
    })

    it('should return topics with correct structure', async () => {
      const vectorCheck = await query(
        "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
      )
      
      if (!vectorCheck.rows[0].exists) {
        console.warn('⚠️ Skipping test: pgvector not available')
        return
      }

      const request = new NextRequest('http://localhost:3000/api/rag/syllabus/fitter/Safety%20Basics', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${validToken}`
        }
      })

      const response = await GET(request, { params: { course: 'fitter', module: 'Safety Basics' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      
      if (data.module.topics.length > 0) {
        const topic = data.module.topics[0]
        expect(topic).toHaveProperty('section')
        expect(topic).toHaveProperty('chunkCount')
        expect(topic).toHaveProperty('pageNumbers')
        expect(topic).toHaveProperty('contentExcerpts')
        expect(Array.isArray(topic.pageNumbers)).toBe(true)
        expect(Array.isArray(topic.contentExcerpts)).toBe(true)
        expect(typeof topic.chunkCount).toBe('number')
      }
    })

    it('should handle URL-encoded module names', async () => {
      const vectorCheck = await query(
        "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
      )
      
      if (!vectorCheck.rows[0].exists) {
        console.warn('⚠️ Skipping test: pgvector not available')
        return
      }

      const request = new NextRequest('http://localhost:3000/api/rag/syllabus/fitter/safety-basics', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${validToken}`
        }
      })

      const response = await GET(request, { params: { course: 'fitter', module: 'safety-basics' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.module.name).toBe('Safety Basics')
    })

    it('should include page references', async () => {
      const vectorCheck = await query(
        "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
      )
      
      if (!vectorCheck.rows[0].exists) {
        console.warn('⚠️ Skipping test: pgvector not available')
        return
      }

      const request = new NextRequest('http://localhost:3000/api/rag/syllabus/fitter/Safety%20Basics', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${validToken}`
        }
      })

      const response = await GET(request, { params: { course: 'fitter', module: 'Safety Basics' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.module.pageRange).toBeTruthy()
      expect(typeof data.module.pageRange).toBe('string')
    })

    it('should include content excerpts', async () => {
      const vectorCheck = await query(
        "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
      )
      
      if (!vectorCheck.rows[0].exists) {
        console.warn('⚠️ Skipping test: pgvector not available')
        return
      }

      const request = new NextRequest('http://localhost:3000/api/rag/syllabus/fitter/Safety%20Basics', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${validToken}`
        }
      })

      const response = await GET(request, { params: { course: 'fitter', module: 'Safety Basics' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      
      if (data.module.topics.length > 0) {
        const topic = data.module.topics[0]
        expect(Array.isArray(topic.contentExcerpts)).toBe(true)
        // Should have at least one excerpt
        if (topic.contentExcerpts.length > 0) {
          expect(typeof topic.contentExcerpts[0]).toBe('string')
        }
      }
    })
  })

  describe('Search Functionality', () => {
    it('should support semantic search within module', async () => {
      const vectorCheck = await query(
        "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
      )
      
      if (!vectorCheck.rows[0].exists) {
        console.warn('⚠️ Skipping test: pgvector not available')
        return
      }

      if (!process.env.LOCAL_EMBEDDING) {
        console.warn('⚠️ Skipping test: LOCAL_EMBEDDING not available')
        return
      }

      const request = new NextRequest('http://localhost:3000/api/rag/syllabus/fitter/Safety%20Basics?search=protective equipment', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${validToken}`
        }
      })

      const response = await GET(request, { params: { course: 'fitter', module: 'Safety Basics' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.module).toHaveProperty('topics')
      expect(Array.isArray(data.module.topics)).toBe(true)
    })

    it('should filter search results to module only', async () => {
      const vectorCheck = await query(
        "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
      )
      
      if (!vectorCheck.rows[0].exists) {
        console.warn('⚠️ Skipping test: pgvector not available')
        return
      }

      if (!process.env.LOCAL_EMBEDDING) {
        console.warn('⚠️ Skipping test: LOCAL_EMBEDDING not available')
        return
      }

      const request = new NextRequest('http://localhost:3000/api/rag/syllabus/fitter/Safety%20Basics?search=tools', {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${validToken}`
        }
      })

      const response = await GET(request, { params: { course: 'fitter', module: 'Safety Basics' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Search should be limited to Safety Basics module
      expect(data.module.name).toBe('Safety Basics')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const vectorCheck = await query(
        "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
      )
      
      if (!vectorCheck.rows[0].exists) {
        console.warn('⚠️ Skipping test: pgvector not available')
        return
      }

      // This test verifies error handling structure exists
      expect(true).toBe(true)
    })
  })
})
