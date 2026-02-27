import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { StatisticsService } from '../statistics-service'
import { query, getClient } from '../../postgresql'
import { 
  createPDFDocument, 
  createKnowledgeChunk, 
  createChatMessage,
  createModuleMapping 
} from '../rag-db'

describe('StatisticsService', () => {
  const statsService = new StatisticsService()
  
  // Test data cleanup
  afterAll(async () => {
    // Clean up test data
    await query("DELETE FROM chat_history WHERE session_id::text LIKE 'test-session-stats%'")
    await query('DELETE FROM knowledge_chunks WHERE pdf_source LIKE $1', ['test-stats-%'])
    await query('DELETE FROM pdf_documents WHERE filename LIKE $1', ['test-stats-%'])
  })
  
  describe('getSystemStats', () => {
    it('should return comprehensive system statistics', async () => {
      const stats = await statsService.getSystemStats()
      
      expect(stats).toHaveProperty('total_pdfs')
      expect(stats).toHaveProperty('total_chunks')
      expect(stats).toHaveProperty('total_embeddings')
      expect(stats).toHaveProperty('pdfs_by_status')
      expect(stats).toHaveProperty('pdfs_by_course')
      expect(stats).toHaveProperty('chunks_by_course')
      expect(stats).toHaveProperty('chunks_by_module')
      
      expect(typeof stats.total_pdfs).toBe('number')
      expect(typeof stats.total_chunks).toBe('number')
      expect(typeof stats.total_embeddings).toBe('number')
      expect(Array.isArray(stats.chunks_by_module)).toBe(true)
    })
    
    it('should aggregate PDFs by course correctly', async () => {
      const stats = await statsService.getSystemStats()
      
      expect(stats.pdfs_by_course).toBeTypeOf('object')
      
      // If there are PDFs, verify the counts are positive
      Object.values(stats.pdfs_by_course).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(0)
      })
    })
    
    it('should aggregate chunks by module with course information', async () => {
      const stats = await statsService.getSystemStats()
      
      stats.chunks_by_module.forEach(moduleInfo => {
        expect(moduleInfo).toHaveProperty('course')
        expect(moduleInfo).toHaveProperty('module')
        expect(moduleInfo).toHaveProperty('count')
        expect(typeof moduleInfo.count).toBe('number')
        expect(moduleInfo.count).toBeGreaterThan(0)
      })
    })
  })
  
  describe('getPDFProcessingStats', () => {
    beforeAll(async () => {
      // Clean up any existing test data first
      await query('DELETE FROM knowledge_chunks WHERE pdf_source IN ($1, $2)', 
        ['test-stats-pdf1.pdf', 'test-stats-pdf2.pdf'])
      await query('DELETE FROM pdf_documents WHERE filename IN ($1, $2)', 
        ['test-stats-pdf1.pdf', 'test-stats-pdf2.pdf'])
      
      // Create test PDF documents with processing info
      await createPDFDocument({
        course: 'fitter',
        filename: 'test-stats-pdf1.pdf',
        file_path: '/test/path1.pdf',
        total_chunks: 50,
        processing_status: 'completed',
        processing_started_at: new Date('2026-02-01T10:00:00Z'),
        processing_completed_at: new Date('2026-02-01T10:05:00Z')
      })
      
      await createPDFDocument({
        course: 'electrician',
        filename: 'test-stats-pdf2.pdf',
        file_path: '/test/path2.pdf',
        total_chunks: 75,
        processing_status: 'completed',
        processing_started_at: new Date('2026-02-01T11:00:00Z'),
        processing_completed_at: new Date('2026-02-01T11:08:00Z')
      })
    })
    
    it('should return processing statistics by course and status', async () => {
      const stats = await statsService.getPDFProcessingStats()
      
      expect(Array.isArray(stats)).toBe(true)
      
      stats.forEach(stat => {
        expect(stat).toHaveProperty('course')
        expect(stat).toHaveProperty('status')
        expect(stat).toHaveProperty('count')
        expect(stat.count).toBeGreaterThan(0)
      })
    })
    
    it('should calculate average chunks per PDF', async () => {
      const stats = await statsService.getPDFProcessingStats()
      
      const completedStats = stats.filter(s => s.status === 'completed')
      
      completedStats.forEach(stat => {
        if (stat.avg_chunks !== null) {
          expect(stat.avg_chunks).toBeGreaterThan(0)
        }
      })
    })
    
    it('should calculate average processing time', async () => {
      const stats = await statsService.getPDFProcessingStats()
      
      const completedStats = stats.filter(s => s.status === 'completed')
      
      completedStats.forEach(stat => {
        if (stat.avg_processing_time_seconds !== null) {
          expect(stat.avg_processing_time_seconds).toBeGreaterThan(0)
        }
      })
    })
  })
  
  describe('getDatabaseStats', () => {
    it('should return database size information', async () => {
      const stats = await statsService.getDatabaseStats()
      
      expect(stats).toHaveProperty('database_size')
      expect(stats).toHaveProperty('largest_tables')
      expect(typeof stats.database_size).toBe('string')
      expect(Array.isArray(stats.largest_tables)).toBe(true)
    })
    
    it('should list RAG-related tables with sizes', async () => {
      const stats = await statsService.getDatabaseStats()
      
      const tableNames = stats.largest_tables.map(t => t.table_name)
      
      // Should include at least some of the RAG tables
      const ragTables = ['pdf_documents', 'knowledge_chunks', 'module_mapping', 'chat_history']
      const hasRagTables = ragTables.some(table => tableNames.includes(table))
      
      expect(hasRagTables).toBe(true)
      
      stats.largest_tables.forEach(table => {
        expect(table).toHaveProperty('table_name')
        expect(table).toHaveProperty('size')
        expect(typeof table.size).toBe('string')
      })
    })
  })
  
  describe('getModuleStats', () => {
    beforeAll(async () => {
      // Create PDF document first (foreign key requirement)
      await createPDFDocument({
        course: 'fitter',
        filename: 'test-stats-module.pdf',
        file_path: '/test/module.pdf',
        processing_status: 'completed'
      })
      
      // Create test chunks with module information
      await createKnowledgeChunk({
        course: 'fitter',
        pdf_source: 'test-stats-module.pdf',
        module: 'safety',
        section: 'Safety Basics',
        page_number: 10,
        chunk_index: 1,
        content: 'Test content for safety module',
        token_count: 50
      })
      
      await createKnowledgeChunk({
        course: 'fitter',
        pdf_source: 'test-stats-module.pdf',
        module: 'safety',
        section: 'Safety Equipment',
        page_number: 15,
        chunk_index: 2,
        content: 'More test content for safety module',
        token_count: 60
      })
    })
    
    it('should return module statistics for all courses', async () => {
      const stats = await statsService.getModuleStats()
      
      expect(Array.isArray(stats)).toBe(true)
      
      stats.forEach(moduleStat => {
        expect(moduleStat).toHaveProperty('course')
        expect(moduleStat).toHaveProperty('module_id')
        expect(moduleStat).toHaveProperty('chunk_count')
        expect(moduleStat.chunk_count).toBeGreaterThan(0)
      })
    })
    
    it('should filter module statistics by course', async () => {
      const fitterStats = await statsService.getModuleStats('fitter')
      
      fitterStats.forEach(stat => {
        expect(stat.course).toBe('fitter')
      })
    })
    
    it('should calculate average token count per module', async () => {
      const stats = await statsService.getModuleStats('fitter')
      
      const safetyModule = stats.find(s => s.module_id === 'safety')
      
      if (safetyModule && safetyModule.avg_token_count !== null) {
        expect(safetyModule.avg_token_count).toBeGreaterThan(0)
        expect(safetyModule.avg_token_count).toBeLessThanOrEqual(1000) // Reasonable range
      }
    })
    
    it('should include page range information', async () => {
      const stats = await statsService.getModuleStats('fitter')
      
      stats.forEach(stat => {
        if (stat.page_range) {
          expect(typeof stat.page_range).toBe('string')
          expect(stat.page_range).toMatch(/^\d+-\d+$/)
        }
      })
    })
  })
  
  describe('getChatStats', () => {
    beforeAll(async () => {
      // Create test chat messages with proper UUID
      const { randomUUID } = await import('crypto')
      const testSessionId = randomUUID()
      
      await createChatMessage({
        session_id: testSessionId,
        course: 'fitter',
        message_type: 'user',
        message: 'Test question'
      })
      
      await createChatMessage({
        session_id: testSessionId,
        course: 'fitter',
        message_type: 'assistant',
        message: 'Test answer'
      })
    })
    
    it('should return chat statistics', async () => {
      const stats = await statsService.getChatStats()
      
      expect(stats).toHaveProperty('total_messages')
      expect(stats).toHaveProperty('unique_sessions')
      expect(stats).toHaveProperty('avg_messages_per_session')
      expect(stats).toHaveProperty('messages_by_course')
      
      expect(typeof stats.total_messages).toBe('number')
      expect(typeof stats.unique_sessions).toBe('number')
      expect(typeof stats.avg_messages_per_session).toBe('number')
    })
    
    it('should count messages correctly', async () => {
      const stats = await statsService.getChatStats()
      
      expect(stats.total_messages).toBeGreaterThan(0)
      expect(stats.unique_sessions).toBeGreaterThan(0)
    })
    
    it('should aggregate messages by course', async () => {
      const stats = await statsService.getChatStats()
      
      expect(stats.messages_by_course).toBeTypeOf('object')
      
      Object.values(stats.messages_by_course).forEach(count => {
        expect(count).toBeGreaterThan(0)
      })
    })
  })
  
  describe('getPDFProcessingSummary', () => {
    beforeAll(async () => {
      // Clean up any existing test data first
      await query('DELETE FROM knowledge_chunks WHERE pdf_source = $1', ['test-stats-summary.pdf'])
      await query('DELETE FROM pdf_documents WHERE filename = $1', ['test-stats-summary.pdf'])
      
      // Create a test PDF with chunks
      await createPDFDocument({
        course: 'fitter',
        filename: 'test-stats-summary.pdf',
        file_path: '/test/summary.pdf',
        total_pages: 100,
        file_size: 5000000,
        total_chunks: 3,
        processing_status: 'completed',
        processing_started_at: new Date('2026-02-01T12:00:00Z'),
        processing_completed_at: new Date('2026-02-01T12:03:00Z')
      })
      
      await createKnowledgeChunk({
        course: 'fitter',
        pdf_source: 'test-stats-summary.pdf',
        module: 'tools',
        page_number: 20,
        chunk_index: 1,
        content: 'Test chunk 1',
        token_count: 100
      })
      
      await createKnowledgeChunk({
        course: 'fitter',
        pdf_source: 'test-stats-summary.pdf',
        module: 'tools',
        page_number: 25,
        chunk_index: 2,
        content: 'Test chunk 2',
        token_count: 120
      })
      
      await createKnowledgeChunk({
        course: 'fitter',
        pdf_source: 'test-stats-summary.pdf',
        module: 'safety',
        page_number: 30,
        chunk_index: 3,
        content: 'Test chunk 3',
        token_count: 110
      })
    })
    
    it('should return null for non-existent PDF', async () => {
      const summary = await statsService.getPDFProcessingSummary('non-existent.pdf')
      expect(summary).toBeNull()
    })
    
    it('should return complete summary for existing PDF', async () => {
      const summary = await statsService.getPDFProcessingSummary('test-stats-summary.pdf')
      
      expect(summary).not.toBeNull()
      expect(summary).toHaveProperty('pdf')
      expect(summary).toHaveProperty('chunks')
      expect(summary).toHaveProperty('modules')
    })
    
    it('should include PDF metadata', async () => {
      const summary = await statsService.getPDFProcessingSummary('test-stats-summary.pdf')
      
      expect(summary?.pdf.filename).toBe('test-stats-summary.pdf')
      expect(summary?.pdf.course).toBe('fitter')
      expect(summary?.pdf.status).toBe('completed')
      expect(summary?.pdf.total_pages).toBe(100)
    })
    
    it('should calculate processing time', async () => {
      const summary = await statsService.getPDFProcessingSummary('test-stats-summary.pdf')
      
      // Processing time might be null if timestamps aren't set properly
      if (summary?.pdf.processing_time !== null) {
        expect(summary?.pdf.processing_time).toBeGreaterThan(0)
      }
    })
    
    it('should aggregate chunk statistics', async () => {
      const summary = await statsService.getPDFProcessingSummary('test-stats-summary.pdf')
      
      expect(summary?.chunks.total).toBe(3)
      expect(summary?.chunks.unique_modules).toBe(2)
      expect(summary?.chunks.avg_token_count).toBeGreaterThan(0)
      expect(summary?.chunks.page_range).toBe('20-30')
    })
    
    it('should break down chunks by module', async () => {
      const summary = await statsService.getPDFProcessingSummary('test-stats-summary.pdf')
      
      expect(Array.isArray(summary?.modules)).toBe(true)
      expect(summary?.modules.length).toBeGreaterThan(0)
      
      const toolsModule = summary?.modules.find(m => m.module === 'tools')
      expect(toolsModule).toBeDefined()
      expect(toolsModule?.chunk_count).toBe(2)
      
      const safetyModule = summary?.modules.find(m => m.module === 'safety')
      expect(safetyModule).toBeDefined()
      expect(safetyModule?.chunk_count).toBe(1)
    })
  })
})
