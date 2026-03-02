import { query } from '../postgresql'
import { getRagStatistics } from './rag-db'

export interface RAGSystemStats {
  // PDF Processing Stats
  total_pdfs: number
  pdfs_by_status: Record<string, number>
  pdfs_by_course: Record<string, number>
  
  // Chunk and Embedding Stats
  total_chunks: number
  total_embeddings: number
  chunks_by_course: Record<string, number>
  chunks_by_module: Array<{ course: string; module: string; count: number }>
  
  // Search Analytics
  total_searches?: number
  avg_similarity?: number
  searches_by_course?: Record<string, number>
  
  // API Usage (if tracked)
  api_calls?: number
  estimated_cost?: number
  
  // Database Stats
  database_size?: string
  largest_tables?: Array<{ table_name: string; size: string }>
}

export interface SearchAnalytics {
  total_queries: number
  avg_similarity: number
  queries_by_course: Record<string, number>
  queries_by_module: Record<string, number>
  recent_queries: Array<{
    query: string
    course: string
    module?: string
    avg_similarity: number
    timestamp: Date
  }>
}

export class StatisticsService {
  /**
   * Get comprehensive RAG system statistics
   */
  async getSystemStats(): Promise<RAGSystemStats> {
    // Get basic stats from existing function
    const basicStats = await getRagStatistics()
    
    // Get PDFs by course
    const pdfsByCourse = await query(`
      SELECT course, COUNT(*) as count 
      FROM pdf_documents 
      GROUP BY course
    `)
    
    const pdfsByCourseMap: Record<string, number> = {}
    pdfsByCourse.rows.forEach((row: any) => {
      pdfsByCourseMap[row.course] = parseInt(row.count)
    })
    
    // Get chunks by module
    const chunksByModule = await query(`
      SELECT course, module, COUNT(*) as count 
      FROM knowledge_chunks 
      WHERE module IS NOT NULL
      GROUP BY course, module
      ORDER BY course, count DESC
    `)
    
    return {
      total_pdfs: basicStats.total_pdfs,
      pdfs_by_status: basicStats.pdfs_by_status,
      pdfs_by_course: pdfsByCourseMap,
      total_chunks: basicStats.total_chunks,
      total_embeddings: basicStats.total_embeddings,
      chunks_by_course: basicStats.chunks_by_course,
      chunks_by_module: chunksByModule.rows.map((row: any) => ({
        course: row.course,
        module: row.module,
        count: parseInt(row.count)
      }))
    }
  }
  
  /**
   * Get PDF processing statistics
   */
  async getPDFProcessingStats() {
    const result = await query(`
      SELECT 
        course,
        processing_status,
        COUNT(*) as count,
        AVG(total_chunks) as avg_chunks,
        AVG(EXTRACT(EPOCH FROM (processing_completed_at - processing_started_at))) as avg_processing_time
      FROM pdf_documents
      WHERE processing_started_at IS NOT NULL
      GROUP BY course, processing_status
    `)
    
    return result.rows.map((row: any) => ({
      course: row.course,
      status: row.processing_status,
      count: parseInt(row.count),
      avg_chunks: row.avg_chunks ? parseFloat(row.avg_chunks) : null,
      avg_processing_time_seconds: row.avg_processing_time ? parseFloat(row.avg_processing_time) : null
    }))
  }
  
  /**
   * Get database size statistics
   */
  async getDatabaseStats() {
    // Get table sizes
    const tableSizes = await query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
        pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('pdf_documents', 'knowledge_chunks', 'module_mapping', 'chat_history')
      ORDER BY size_bytes DESC
    `)
    
    // Get total database size
    const dbSize = await query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `)
    
    return {
      database_size: dbSize.rows[0]?.size || 'Unknown',
      largest_tables: tableSizes.rows.map((row: any) => ({
        table_name: row.tablename,
        size: row.size
      }))
    }
  }
  
  /**
   * Get module distribution statistics
   */
  async getModuleStats(course?: 'fitter' | 'electrician') {
    let sql = `
      SELECT 
        kc.course,
        kc.module,
        mm.module_name,
        COUNT(*) as chunk_count,
        AVG(kc.token_count) as avg_token_count,
        MIN(kc.page_number) as first_page,
        MAX(kc.page_number) as last_page
      FROM knowledge_chunks kc
      LEFT JOIN module_mapping mm ON kc.course = mm.course AND kc.module = mm.module_id
      WHERE kc.module IS NOT NULL
    `
    
    const params: any[] = []
    if (course) {
      sql += ` AND kc.course = $1`
      params.push(course)
    }
    
    sql += `
      GROUP BY kc.course, kc.module, mm.module_name
      ORDER BY kc.course, chunk_count DESC
    `
    
    const result = await query(sql, params)
    
    return result.rows.map((row: any) => ({
      course: row.course,
      module_id: row.module,
      module_name: row.module_name || row.module,
      chunk_count: parseInt(row.chunk_count),
      avg_token_count: row.avg_token_count ? parseFloat(row.avg_token_count) : null,
      page_range: row.first_page && row.last_page 
        ? `${row.first_page}-${row.last_page}` 
        : null
    }))
  }
  
  /**
   * Get chat history statistics
   */
  async getChatStats() {
    const totalMessages = await query(`
      SELECT COUNT(*) as count FROM chat_history
    `)
    
    const messagesByCourse = await query(`
      SELECT course, COUNT(*) as count 
      FROM chat_history 
      WHERE course IS NOT NULL
      GROUP BY course
    `)
    
    const uniqueSessions = await query(`
      SELECT COUNT(DISTINCT session_id) as count FROM chat_history
    `)
    
    const avgMessagesPerSession = await query(`
      SELECT AVG(message_count) as avg
      FROM (
        SELECT session_id, COUNT(*) as message_count
        FROM chat_history
        GROUP BY session_id
      ) as session_counts
    `)
    
    const messagesByCourseMap: Record<string, number> = {}
    messagesByCourse.rows.forEach((row: any) => {
      if (row.course) {
        messagesByCourseMap[row.course] = parseInt(row.count)
      }
    })
    
    return {
      total_messages: parseInt(totalMessages.rows[0].count),
      unique_sessions: parseInt(uniqueSessions.rows[0].count),
      avg_messages_per_session: avgMessagesPerSession.rows[0].avg 
        ? parseFloat(avgMessagesPerSession.rows[0].avg) 
        : 0,
      messages_by_course: messagesByCourseMap
    }
  }
  
  /**
   * Get processing summary for a specific PDF
   */
  async getPDFProcessingSummary(filename: string) {
    const pdfInfo = await query(`
      SELECT * FROM pdf_documents WHERE filename = $1
    `, [filename])
    
    if (pdfInfo.rows.length === 0) {
      return null
    }
    
    const pdf = pdfInfo.rows[0]
    
    const chunkInfo = await query(`
      SELECT 
        COUNT(*) as total_chunks,
        COUNT(DISTINCT module) as unique_modules,
        AVG(token_count) as avg_token_count,
        MIN(page_number) as first_page,
        MAX(page_number) as last_page
      FROM knowledge_chunks
      WHERE pdf_source = $1
    `, [filename])
    
    const moduleBreakdown = await query(`
      SELECT 
        module,
        COUNT(*) as chunk_count
      FROM knowledge_chunks
      WHERE pdf_source = $1 AND module IS NOT NULL
      GROUP BY module
      ORDER BY chunk_count DESC
    `, [filename])
    
    return {
      pdf: {
        filename: pdf.filename,
        course: pdf.course,
        status: pdf.processing_status,
        total_pages: pdf.total_pages,
        file_size: pdf.file_size,
        processing_time: pdf.processing_started_at && pdf.processing_completed_at
          ? (new Date(pdf.processing_completed_at).getTime() - new Date(pdf.processing_started_at).getTime()) / 1000
          : null
      },
      chunks: {
        total: parseInt(chunkInfo.rows[0].total_chunks),
        unique_modules: parseInt(chunkInfo.rows[0].unique_modules),
        avg_token_count: chunkInfo.rows[0].avg_token_count 
          ? parseFloat(chunkInfo.rows[0].avg_token_count) 
          : null,
        page_range: chunkInfo.rows[0].first_page && chunkInfo.rows[0].last_page
          ? `${chunkInfo.rows[0].first_page}-${chunkInfo.rows[0].last_page}`
          : null
      },
      modules: moduleBreakdown.rows.map((row: any) => ({
        module: row.module,
        chunk_count: parseInt(row.chunk_count)
      }))
    }
  }
}

// Export singleton instance
export const statisticsService = new StatisticsService()
