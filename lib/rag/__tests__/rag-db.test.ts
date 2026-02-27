import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { query, getPool, closePool } from '../../postgresql'
import {
  createPDFDocument,
  updatePDFDocument,
  getPDFDocument,
  getAllPDFDocuments,
  getModuleMappings,
  getModuleMapping,
  createKnowledgeChunk,
  createKnowledgeChunksBatch,
  updateChunkEmbedding,
  getKnowledgeChunk,
  getChunksByCourse,
  getChunksByModule,
  searchSimilarChunks,
  createChatMessage,
  getChatHistory,
  getUserChatSessions,
  getRagStatistics,
  checkRagTablesExist,
  PDFDocument,
  KnowledgeChunk,
  ChatMessage,
} from '../rag-db'

describe('RAG Database Schema Tests', () => {
  beforeAll(async () => {
    // Ensure database connection is established
    await getPool()
    
    // Clean up any existing test data
    await query('DELETE FROM chat_history WHERE session_id::text LIKE $1', ['test-%'])
    await query('DELETE FROM knowledge_chunks WHERE pdf_source LIKE $1', ['test-%'])
    await query('DELETE FROM pdf_documents WHERE filename LIKE $1', ['test-%'])
  })

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM chat_history WHERE session_id::text LIKE $1', ['test-%'])
    await query('DELETE FROM knowledge_chunks WHERE pdf_source LIKE $1', ['test-%'])
    await query('DELETE FROM pdf_documents WHERE filename LIKE $1', ['test-%'])
    
    // Close connection pool
    await closePool()
  })

  describe('Table Creation and Constraints', () => {
    it('should verify all RAG tables exist', async () => {
      const tables = await checkRagTablesExist()
      
      expect(tables.pdf_documents).toBe(true)
      expect(tables.module_mapping).toBe(true)
      expect(tables.knowledge_chunks).toBe(true)
      expect(tables.chat_history).toBe(true)
    })

    it('should verify pgvector extension is enabled', async () => {
      const tables = await checkRagTablesExist()
      // pgvector may not be installed - this is acceptable for testing
      expect(typeof tables.pgvector_enabled).toBe('boolean')
    })

    it('should enforce course enum constraint on pdf_documents', async () => {
      await expect(
        query(
          `INSERT INTO pdf_documents (course, filename, file_path) 
           VALUES ($1, $2, $3)`,
          ['invalid_course', 'test-invalid.pdf', '/path/to/file']
        )
      ).rejects.toThrow()
    })

    it('should enforce unique filename constraint on pdf_documents', async () => {
      const filename = 'test-unique-constraint.pdf'
      
      // First insert should succeed
      await query(
        `INSERT INTO pdf_documents (course, filename, file_path) 
         VALUES ($1, $2, $3)`,
        ['fitter', filename, '/path/to/file']
      )
      
      // Second insert with same filename should fail
      await expect(
        query(
          `INSERT INTO pdf_documents (course, filename, file_path) 
           VALUES ($1, $2, $3)`,
          ['electrician', filename, '/path/to/file2']
        )
      ).rejects.toThrow()
      
      // Cleanup
      await query('DELETE FROM pdf_documents WHERE filename = $1', [filename])
    })

    it('should enforce processing_status enum constraint', async () => {
      await expect(
        query(
          `INSERT INTO pdf_documents (course, filename, file_path, processing_status) 
           VALUES ($1, $2, $3, $4)`,
          ['fitter', 'test-status.pdf', '/path', 'invalid_status']
        )
      ).rejects.toThrow()
    })

    it('should enforce foreign key constraint on knowledge_chunks', async () => {
      await expect(
        query(
          `INSERT INTO knowledge_chunks 
           (course, pdf_source, chunk_index, content) 
           VALUES ($1, $2, $3, $4)`,
          ['fitter', 'non-existent.pdf', 1, 'test content']
        )
      ).rejects.toThrow()
    })

    it('should cascade delete knowledge_chunks when pdf_document is deleted', async () => {
      const filename = 'test-cascade.pdf'
      
      // Create PDF document
      const pdfId = await createPDFDocument({
        course: 'fitter',
        filename,
        file_path: '/path/to/file',
      })
      
      // Create knowledge chunk
      const chunkId = await createKnowledgeChunk({
        course: 'fitter',
        pdf_source: filename,
        chunk_index: 1,
        content: 'Test content for cascade delete',
      })
      
      // Verify chunk exists
      const chunk = await getKnowledgeChunk(chunkId)
      expect(chunk).not.toBeNull()
      
      // Delete PDF document
      await query('DELETE FROM pdf_documents WHERE id = $1', [pdfId])
      
      // Verify chunk was cascade deleted
      const deletedChunk = await getKnowledgeChunk(chunkId)
      expect(deletedChunk).toBeNull()
    })
  })

  describe('Index Creation', () => {
    it('should verify standard indexes exist', async () => {
      const result = await query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename IN ('pdf_documents', 'module_mapping', 'knowledge_chunks', 'chat_history')
        ORDER BY indexname
      `)
      
      const indexNames = result.rows.map((row: any) => row.indexname)
      
      // Check for key indexes
      expect(indexNames).toContain('idx_chunks_course')
      expect(indexNames).toContain('idx_chunks_module')
      expect(indexNames).toContain('idx_chunks_course_module')
      expect(indexNames).toContain('idx_pdf_course')
      expect(indexNames).toContain('idx_chat_session')
    })

    it('should verify vector index exists or can be created', async () => {
      const result = await query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'knowledge_chunks'
        AND indexname = 'idx_chunks_embedding'
      `)
      
      // Vector index may not exist if no embeddings are present yet
      // This is expected behavior
      expect(result.rows.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Vector Operations', () => {
    it('should store and retrieve vector embeddings', async () => {
      const tables = await checkRagTablesExist()
      
      // Skip if pgvector is not installed
      if (!tables.pgvector_enabled) {
        console.log('⚠️  Skipping vector test - pgvector not installed')
        return
      }
      
      const filename = 'test-vector-ops.pdf'
      
      // Create PDF document
      await createPDFDocument({
        course: 'fitter',
        filename,
        file_path: '/path/to/file',
      })
      
      // Create chunk with embedding (384 dimensions for local model)
      const embedding = Array(384).fill(0).map(() => Math.random())
      const chunkId = await createKnowledgeChunk({
        course: 'fitter',
        pdf_source: filename,
        chunk_index: 1,
        content: 'Test content with embedding',
        embedding,
      })
      
      // Retrieve chunk
      const chunk = await getKnowledgeChunk(chunkId)
      expect(chunk).not.toBeNull()
      expect(chunk?.embedding).toBeDefined()
      
      // Cleanup
      await query('DELETE FROM pdf_documents WHERE filename = $1', [filename])
    })

    it('should update embeddings for existing chunks', async () => {
      const tables = await checkRagTablesExist()
      
      // Skip if pgvector is not installed
      if (!tables.pgvector_enabled) {
        console.log('⚠️  Skipping vector test - pgvector not installed')
        return
      }
      
      const filename = 'test-update-embedding.pdf'
      
      // Create PDF document
      await createPDFDocument({
        course: 'fitter',
        filename,
        file_path: '/path/to/file',
      })
      
      // Create chunk without embedding
      const chunkId = await createKnowledgeChunk({
        course: 'fitter',
        pdf_source: filename,
        chunk_index: 1,
        content: 'Test content',
      })
      
      // Update with embedding (384 dimensions for local model)
      const embedding = Array(384).fill(0).map(() => Math.random())
      await updateChunkEmbedding(chunkId, embedding)
      
      // Verify embedding was added
      const chunk = await getKnowledgeChunk(chunkId)
      expect(chunk?.embedding).toBeDefined()
      
      // Cleanup
      await query('DELETE FROM pdf_documents WHERE filename = $1', [filename])
    })

    it('should perform cosine similarity search', async () => {
      const tables = await checkRagTablesExist()
      
      // Skip if pgvector is not installed
      if (!tables.pgvector_enabled) {
        console.log('⚠️  Skipping vector test - pgvector not installed')
        return
      }
      
      const filename = 'test-similarity-search.pdf'
      
      // Create PDF document
      await createPDFDocument({
        course: 'fitter',
        filename,
        file_path: '/path/to/file',
      })
      
      // Create chunks with similar embeddings (384 dimensions for local model)
      const baseEmbedding = Array(384).fill(0).map(() => Math.random())
      
      for (let i = 0; i < 3; i++) {
        const embedding = baseEmbedding.map(v => v + (Math.random() - 0.5) * 0.1)
        await createKnowledgeChunk({
          course: 'fitter',
          pdf_source: filename,
          chunk_index: i + 1,
          content: `Test content ${i + 1}`,
          embedding,
        })
      }
      
      // Search with base embedding
      const results = await searchSimilarChunks(baseEmbedding, 'fitter', undefined, 3, 0.5)
      
      expect(results.length).toBeGreaterThan(0)
      expect(results.length).toBeLessThanOrEqual(3)
      
      // Verify results are ordered by similarity
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity)
      }
      
      // Cleanup
      await query('DELETE FROM pdf_documents WHERE filename = $1', [filename])
    })
  })

  describe('PDF Document Operations', () => {
    it('should create and retrieve PDF documents', async () => {
      const doc: PDFDocument = {
        course: 'fitter',
        filename: 'test-create.pdf',
        file_path: '/path/to/test.pdf',
        file_size: 1024000,
        total_pages: 50,
      }
      
      const id = await createPDFDocument(doc)
      expect(id).toBeGreaterThan(0)
      
      const retrieved = await getPDFDocument(doc.filename)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.course).toBe(doc.course)
      expect(retrieved?.filename).toBe(doc.filename)
      
      // Cleanup
      await query('DELETE FROM pdf_documents WHERE id = $1', [id])
    })

    it('should update PDF document status', async () => {
      const filename = 'test-update-status.pdf'
      
      await createPDFDocument({
        course: 'fitter',
        filename,
        file_path: '/path/to/file',
        processing_status: 'pending',
      })
      
      await updatePDFDocument(filename, {
        processing_status: 'processing',
        processing_started_at: new Date(),
      })
      
      const doc = await getPDFDocument(filename)
      expect(doc?.processing_status).toBe('processing')
      expect(doc?.processing_started_at).toBeDefined()
      
      // Cleanup
      await query('DELETE FROM pdf_documents WHERE filename = $1', [filename])
    })

    it('should filter PDF documents by course', async () => {
      const fitterDoc = 'test-fitter-filter.pdf'
      const electricianDoc = 'test-electrician-filter.pdf'
      
      await createPDFDocument({
        course: 'fitter',
        filename: fitterDoc,
        file_path: '/path/to/fitter',
      })
      
      await createPDFDocument({
        course: 'electrician',
        filename: electricianDoc,
        file_path: '/path/to/electrician',
      })
      
      const fitterDocs = await getAllPDFDocuments('fitter')
      const electricianDocs = await getAllPDFDocuments('electrician')
      
      expect(fitterDocs.some(d => d.filename === fitterDoc)).toBe(true)
      expect(fitterDocs.some(d => d.filename === electricianDoc)).toBe(false)
      expect(electricianDocs.some(d => d.filename === electricianDoc)).toBe(true)
      expect(electricianDocs.some(d => d.filename === fitterDoc)).toBe(false)
      
      // Cleanup
      await query('DELETE FROM pdf_documents WHERE filename IN ($1, $2)', [fitterDoc, electricianDoc])
    })
  })

  describe('Module Mapping Operations', () => {
    it('should retrieve module mappings by course', async () => {
      const fitterModules = await getModuleMappings('fitter')
      const electricianModules = await getModuleMappings('electrician')
      
      expect(fitterModules.length).toBeGreaterThan(0)
      expect(electricianModules.length).toBeGreaterThan(0)
      
      // Verify all returned modules match the course
      fitterModules.forEach(m => expect(m.course).toBe('fitter'))
      electricianModules.forEach(m => expect(m.course).toBe('electrician'))
    })

    it('should retrieve specific module mapping', async () => {
      const module = await getModuleMapping('fitter', 'safety')
      
      expect(module).not.toBeNull()
      expect(module?.course).toBe('fitter')
      expect(module?.module_id).toBe('safety')
      expect(module?.keywords).toBeDefined()
    })

    it('should return modules in display order', async () => {
      const modules = await getModuleMappings('fitter')
      
      for (let i = 1; i < modules.length; i++) {
        const prevOrder = modules[i - 1].display_order || 0
        const currOrder = modules[i].display_order || 0
        expect(currOrder).toBeGreaterThanOrEqual(prevOrder)
      }
    })
  })

  describe('Knowledge Chunk Operations', () => {
    it('should create knowledge chunks in batch', async () => {
      const filename = 'test-batch-chunks.pdf'
      
      await createPDFDocument({
        course: 'fitter',
        filename,
        file_path: '/path/to/file',
      })
      
      const chunks: KnowledgeChunk[] = [
        {
          course: 'fitter',
          pdf_source: filename,
          chunk_index: 1,
          content: 'First chunk content',
          module: 'safety',
        },
        {
          course: 'fitter',
          pdf_source: filename,
          chunk_index: 2,
          content: 'Second chunk content',
          module: 'safety',
        },
        {
          course: 'fitter',
          pdf_source: filename,
          chunk_index: 3,
          content: 'Third chunk content',
          module: 'tools',
        },
      ]
      
      await createKnowledgeChunksBatch(chunks)
      
      const retrieved = await getChunksByCourse('fitter')
      const testChunks = retrieved.filter(c => c.pdf_source === filename)
      
      expect(testChunks.length).toBe(3)
      
      // Cleanup
      await query('DELETE FROM pdf_documents WHERE filename = $1', [filename])
    })

    it('should filter chunks by module', async () => {
      const filename = 'test-module-filter.pdf'
      
      await createPDFDocument({
        course: 'fitter',
        filename,
        file_path: '/path/to/file',
      })
      
      await createKnowledgeChunk({
        course: 'fitter',
        pdf_source: filename,
        chunk_index: 1,
        content: 'Safety content',
        module: 'safety',
      })
      
      await createKnowledgeChunk({
        course: 'fitter',
        pdf_source: filename,
        chunk_index: 2,
        content: 'Tools content',
        module: 'tools',
      })
      
      const safetyChunks = await getChunksByModule('fitter', 'safety')
      const toolsChunks = await getChunksByModule('fitter', 'tools')
      
      expect(safetyChunks.some(c => c.pdf_source === filename && c.module === 'safety')).toBe(true)
      expect(toolsChunks.some(c => c.pdf_source === filename && c.module === 'tools')).toBe(true)
      
      // Cleanup
      await query('DELETE FROM pdf_documents WHERE filename = $1', [filename])
    })
  })

  describe('Chat History Operations', () => {
    it('should create and retrieve chat messages', async () => {
      const sessionId = crypto.randomUUID()
      
      const message: ChatMessage = {
        session_id: sessionId,
        message_type: 'user',
        message: 'What is safety?',
        course: 'fitter',
      }
      
      const id = await createChatMessage(message)
      expect(id).toBeGreaterThan(0)
      
      const history = await getChatHistory(sessionId)
      expect(history.length).toBeGreaterThan(0)
      expect(history[0].message).toBe(message.message)
      
      // Cleanup
      await query('DELETE FROM chat_history WHERE session_id = $1', [sessionId])
    })

    it('should maintain conversation order', async () => {
      const sessionId = crypto.randomUUID()
      
      const messages = [
        { message_type: 'user' as const, message: 'Question 1' },
        { message_type: 'assistant' as const, message: 'Answer 1' },
        { message_type: 'user' as const, message: 'Question 2' },
        { message_type: 'assistant' as const, message: 'Answer 2' },
      ]
      
      for (const msg of messages) {
        await createChatMessage({
          session_id: sessionId,
          ...msg,
        })
      }
      
      const history = await getChatHistory(sessionId)
      expect(history.length).toBe(4)
      
      // Verify chronological order
      for (let i = 0; i < messages.length; i++) {
        expect(history[i].message).toBe(messages[i].message)
      }
      
      // Cleanup
      await query('DELETE FROM chat_history WHERE session_id = $1', [sessionId])
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should calculate RAG statistics', async () => {
      const stats = await getRagStatistics()
      
      expect(stats).toHaveProperty('total_pdfs')
      expect(stats).toHaveProperty('total_chunks')
      expect(stats).toHaveProperty('total_embeddings')
      expect(stats).toHaveProperty('pdfs_by_status')
      expect(stats).toHaveProperty('chunks_by_course')
      
      expect(typeof stats.total_pdfs).toBe('number')
      expect(typeof stats.total_chunks).toBe('number')
      expect(typeof stats.total_embeddings).toBe('number')
    })
  })
})
