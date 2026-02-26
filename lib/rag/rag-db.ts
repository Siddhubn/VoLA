import { query, getClient } from '../postgresql'
import { PoolClient } from 'pg'

// Types for RAG database operations

export interface PDFDocument {
  id?: number
  course: 'fitter' | 'electrician'
  filename: string
  file_path: string
  file_size?: number
  total_pages?: number
  total_chunks?: number
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  processing_started_at?: Date
  processing_completed_at?: Date
  error_message?: string
  metadata?: Record<string, any>
  created_at?: Date
  updated_at?: Date
}

export interface ModuleMapping {
  id?: number
  course: 'fitter' | 'electrician'
  module_id: string
  module_name: string
  keywords?: string[]
  description?: string
  display_order?: number
  created_at?: Date
}

export interface KnowledgeChunk {
  id?: number
  course: 'fitter' | 'electrician'
  pdf_source: string
  module?: string
  section?: string
  page_number?: number
  chunk_index: number
  content: string
  content_preview?: string
  embedding?: number[]
  token_count?: number
  metadata?: Record<string, any>
  created_at?: Date
  updated_at?: Date
}

export interface ChatMessage {
  id?: number
  user_id?: number
  course?: 'fitter' | 'electrician'
  session_id: string
  message_type: 'user' | 'assistant'
  message: string
  sources?: any[]
  created_at?: Date
}

// PDF Documents operations

export async function createPDFDocument(doc: PDFDocument): Promise<number> {
  const result = await query(
    `INSERT INTO pdf_documents 
     (course, filename, file_path, file_size, total_pages, processing_status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      doc.course,
      doc.filename,
      doc.file_path,
      doc.file_size,
      doc.total_pages,
      doc.processing_status || 'pending',
      JSON.stringify(doc.metadata || {})
    ]
  )
  return result.rows[0].id
}

export async function updatePDFDocument(
  filename: string,
  updates: Partial<PDFDocument>
): Promise<void> {
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (updates.processing_status !== undefined) {
    fields.push(`processing_status = $${paramIndex++}`)
    values.push(updates.processing_status)
  }
  if (updates.total_chunks !== undefined) {
    fields.push(`total_chunks = $${paramIndex++}`)
    values.push(updates.total_chunks)
  }
  if (updates.processing_started_at !== undefined) {
    fields.push(`processing_started_at = $${paramIndex++}`)
    values.push(updates.processing_started_at)
  }
  if (updates.processing_completed_at !== undefined) {
    fields.push(`processing_completed_at = $${paramIndex++}`)
    values.push(updates.processing_completed_at)
  }
  if (updates.error_message !== undefined) {
    fields.push(`error_message = $${paramIndex++}`)
    values.push(updates.error_message)
  }
  if (updates.metadata !== undefined) {
    fields.push(`metadata = $${paramIndex++}`)
    values.push(JSON.stringify(updates.metadata))
  }

  if (fields.length === 0) return

  values.push(filename)
  await query(
    `UPDATE pdf_documents SET ${fields.join(', ')} WHERE filename = $${paramIndex}`,
    values
  )
}

export async function getPDFDocument(filename: string): Promise<PDFDocument | null> {
  const result = await query(
    'SELECT * FROM pdf_documents WHERE filename = $1',
    [filename]
  )
  return result.rows.length > 0 ? result.rows[0] : null
}

export async function getAllPDFDocuments(course?: 'fitter' | 'electrician'): Promise<PDFDocument[]> {
  if (course) {
    const result = await query(
      'SELECT * FROM pdf_documents WHERE course = $1 ORDER BY created_at DESC',
      [course]
    )
    return result.rows
  }
  const result = await query('SELECT * FROM pdf_documents ORDER BY created_at DESC')
  return result.rows
}

// Module Mapping operations

export async function getModuleMappings(course: 'fitter' | 'electrician'): Promise<ModuleMapping[]> {
  const result = await query(
    'SELECT * FROM module_mapping WHERE course = $1 ORDER BY display_order',
    [course]
  )
  return result.rows
}

export async function getModuleMapping(
  course: 'fitter' | 'electrician',
  module_id: string
): Promise<ModuleMapping | null> {
  const result = await query(
    'SELECT * FROM module_mapping WHERE course = $1 AND module_id = $2',
    [course, module_id]
  )
  return result.rows.length > 0 ? result.rows[0] : null
}

export async function createModuleMapping(mapping: ModuleMapping): Promise<number> {
  const result = await query(
    `INSERT INTO module_mapping 
     (course, module_id, module_name, keywords, description, display_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      mapping.course,
      mapping.module_id,
      mapping.module_name,
      mapping.keywords || [],
      mapping.description,
      mapping.display_order
    ]
  )
  return result.rows[0].id
}

export async function seedModuleMappings(): Promise<void> {
  // Import module data
  const { FITTER_MODULES, ELECTRICIAN_MODULES } = await import('./module-detector')
  
  console.log('🌱 Seeding module mappings...')
  
  // Check if data already exists
  const existingFitter = await getModuleMappings('fitter')
  const existingElectrician = await getModuleMappings('electrician')
  
  if (existingFitter.length === 0) {
    console.log('  📝 Seeding Fitter modules...')
    for (const module of FITTER_MODULES) {
      await createModuleMapping(module)
    }
    console.log(`  ✅ Seeded ${FITTER_MODULES.length} Fitter modules`)
  } else {
    console.log(`  ℹ️  Fitter modules already exist (${existingFitter.length} modules)`)
  }
  
  if (existingElectrician.length === 0) {
    console.log('  📝 Seeding Electrician modules...')
    for (const module of ELECTRICIAN_MODULES) {
      await createModuleMapping(module)
    }
    console.log(`  ✅ Seeded ${ELECTRICIAN_MODULES.length} Electrician modules`)
  } else {
    console.log(`  ℹ️  Electrician modules already exist (${existingElectrician.length} modules)`)
  }
  
  console.log('🌱 Module mapping seeding complete')
}

// Knowledge Chunks operations

export async function createKnowledgeChunk(chunk: KnowledgeChunk): Promise<number> {
  // Check if pgvector is available
  const vectorCheck = await query(
    "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
  )
  const hasVector = vectorCheck.rows[0].exists
  
  if (hasVector) {
    const result = await query(
      `INSERT INTO knowledge_chunks 
       (course, pdf_source, module, section, page_number, chunk_index, content, 
        content_preview, embedding, token_count, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        chunk.course,
        chunk.pdf_source,
        chunk.module,
        chunk.section,
        chunk.page_number,
        chunk.chunk_index,
        chunk.content,
        chunk.content_preview || chunk.content.substring(0, 200),
        chunk.embedding ? `[${chunk.embedding.join(',')}]` : null,
        chunk.token_count,
        JSON.stringify(chunk.metadata || {})
      ]
    )
    return result.rows[0].id
  } else {
    const result = await query(
      `INSERT INTO knowledge_chunks 
       (course, pdf_source, module, section, page_number, chunk_index, content, 
        content_preview, embedding_placeholder, token_count, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        chunk.course,
        chunk.pdf_source,
        chunk.module,
        chunk.section,
        chunk.page_number,
        chunk.chunk_index,
        chunk.content,
        chunk.content_preview || chunk.content.substring(0, 200),
        chunk.embedding ? JSON.stringify(chunk.embedding) : null,
        chunk.token_count,
        JSON.stringify(chunk.metadata || {})
      ]
    )
    return result.rows[0].id
  }
}

export async function createKnowledgeChunksBatch(chunks: KnowledgeChunk[]): Promise<void> {
  if (chunks.length === 0) return

  // Check if pgvector is available
  const vectorCheck = await query(
    "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
  )
  const hasVector = vectorCheck.rows[0].exists

  const client = await getClient()
  try {
    await client.query('BEGIN')

    for (const chunk of chunks) {
      if (hasVector) {
        await client.query(
          `INSERT INTO knowledge_chunks 
           (course, pdf_source, module, section, page_number, chunk_index, content, 
            content_preview, embedding, token_count, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            chunk.course,
            chunk.pdf_source,
            chunk.module,
            chunk.section,
            chunk.page_number,
            chunk.chunk_index,
            chunk.content,
            chunk.content_preview || chunk.content.substring(0, 200),
            chunk.embedding ? `[${chunk.embedding.join(',')}]` : null,
            chunk.token_count,
            JSON.stringify(chunk.metadata || {})
          ]
        )
      } else {
        await client.query(
          `INSERT INTO knowledge_chunks 
           (course, pdf_source, module, section, page_number, chunk_index, content, 
            content_preview, embedding_placeholder, token_count, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            chunk.course,
            chunk.pdf_source,
            chunk.module,
            chunk.section,
            chunk.page_number,
            chunk.chunk_index,
            chunk.content,
            chunk.content_preview || chunk.content.substring(0, 200),
            chunk.embedding ? JSON.stringify(chunk.embedding) : null,
            chunk.token_count,
            JSON.stringify(chunk.metadata || {})
          ]
        )
      }
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateChunkEmbedding(
  chunkId: number,
  embedding: number[]
): Promise<void> {
  await query(
    'UPDATE knowledge_chunks SET embedding = $1 WHERE id = $2',
    [`[${embedding.join(',')}]`, chunkId]
  )
}

export async function getKnowledgeChunk(id: number): Promise<KnowledgeChunk | null> {
  const result = await query(
    'SELECT * FROM knowledge_chunks WHERE id = $1',
    [id]
  )
  return result.rows.length > 0 ? result.rows[0] : null
}

export async function getChunksByCourse(
  course: 'fitter' | 'electrician',
  limit?: number
): Promise<KnowledgeChunk[]> {
  const sql = limit
    ? 'SELECT * FROM knowledge_chunks WHERE course = $1 ORDER BY chunk_index LIMIT $2'
    : 'SELECT * FROM knowledge_chunks WHERE course = $1 ORDER BY chunk_index'
  
  const params = limit ? [course, limit] : [course]
  const result = await query(sql, params)
  return result.rows
}

export async function getChunksByModule(
  course: 'fitter' | 'electrician',
  module: string
): Promise<KnowledgeChunk[]> {
  const result = await query(
    'SELECT * FROM knowledge_chunks WHERE course = $1 AND module = $2 ORDER BY chunk_index',
    [course, module]
  )
  return result.rows
}

// Vector search operations

export interface SearchResult extends KnowledgeChunk {
  similarity: number
}

export async function searchSimilarChunks(
  embedding: number[],
  course?: 'fitter' | 'electrician',
  module?: string,
  topK: number = 5,
  minSimilarity: number = 0.7
): Promise<SearchResult[]> {
  let sql = `
    SELECT 
      id, course, pdf_source, module, section, page_number, chunk_index,
      content, content_preview, token_count, metadata,
      1 - (embedding <=> $1) as similarity
    FROM knowledge_chunks
    WHERE embedding IS NOT NULL
  `
  
  const params: any[] = [`[${embedding.join(',')}]`]
  let paramIndex = 2

  if (course) {
    sql += ` AND course = $${paramIndex++}`
    params.push(course)
  }

  if (module) {
    sql += ` AND module = $${paramIndex++}`
    params.push(module)
  }

  sql += ` AND (1 - (embedding <=> $1)) >= $${paramIndex++}`
  params.push(minSimilarity)

  sql += ` ORDER BY embedding <=> $1 LIMIT $${paramIndex}`
  params.push(topK)

  const result = await query(sql, params)
  return result.rows
}

// Chat History operations

export async function createChatMessage(message: ChatMessage): Promise<number> {
  const result = await query(
    `INSERT INTO chat_history 
     (user_id, course, session_id, message_type, message, sources)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      message.user_id,
      message.course,
      message.session_id,
      message.message_type,
      message.message,
      JSON.stringify(message.sources || [])
    ]
  )
  return result.rows[0].id
}

export async function getChatHistory(
  sessionId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  const result = await query(
    `SELECT * FROM chat_history 
     WHERE session_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [sessionId, limit]
  )
  return result.rows.reverse() // Return in chronological order
}

export async function getUserChatSessions(
  userId: number,
  limit: number = 10
): Promise<{ session_id: string; last_message: Date; message_count: number }[]> {
  const result = await query(
    `SELECT 
       session_id,
       MAX(created_at) as last_message,
       COUNT(*) as message_count
     FROM chat_history
     WHERE user_id = $1
     GROUP BY session_id
     ORDER BY MAX(created_at) DESC
     LIMIT $2`,
    [userId, limit]
  )
  return result.rows
}

// Statistics and monitoring

export async function getRagStatistics(): Promise<{
  total_pdfs: number
  total_chunks: number
  total_embeddings: number
  pdfs_by_status: Record<string, number>
  chunks_by_course: Record<string, number>
}> {
  const pdfCount = await query('SELECT COUNT(*) as count FROM pdf_documents')
  const chunkCount = await query('SELECT COUNT(*) as count FROM knowledge_chunks')
  
  // Check if pgvector is available
  const vectorCheck = await query(
    "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
  )
  const hasVector = vectorCheck.rows[0].exists
  
  let embeddingCount
  if (hasVector) {
    embeddingCount = await query(
      'SELECT COUNT(*) as count FROM knowledge_chunks WHERE embedding IS NOT NULL'
    )
  } else {
    embeddingCount = await query(
      'SELECT COUNT(*) as count FROM knowledge_chunks WHERE embedding_placeholder IS NOT NULL'
    )
  }
  
  const statusCounts = await query(`
    SELECT processing_status, COUNT(*) as count 
    FROM pdf_documents 
    GROUP BY processing_status
  `)
  
  const courseCounts = await query(`
    SELECT course, COUNT(*) as count 
    FROM knowledge_chunks 
    GROUP BY course
  `)

  const pdfsByStatus: Record<string, number> = {}
  statusCounts.rows.forEach(row => {
    pdfsByStatus[row.processing_status] = parseInt(row.count)
  })

  const chunksByCourse: Record<string, number> = {}
  courseCounts.rows.forEach(row => {
    chunksByCourse[row.course] = parseInt(row.count)
  })

  return {
    total_pdfs: parseInt(pdfCount.rows[0].count),
    total_chunks: parseInt(chunkCount.rows[0].count),
    total_embeddings: parseInt(embeddingCount.rows[0].count),
    pdfs_by_status: pdfsByStatus,
    chunks_by_course: chunksByCourse
  }
}

// Database health check for RAG tables

export async function checkRagTablesExist(): Promise<{
  pdf_documents: boolean
  module_mapping: boolean
  knowledge_chunks: boolean
  chat_history: boolean
  pgvector_enabled: boolean
}> {
  const tables = ['pdf_documents', 'module_mapping', 'knowledge_chunks', 'chat_history']
  const results: any = {}

  for (const table of tables) {
    const result = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      )`,
      [table]
    )
    results[table] = result.rows[0].exists
  }

  // Check pgvector extension
  const vectorCheck = await query(
    "SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')"
  )
  results.pgvector_enabled = vectorCheck.rows[0].exists

  return results
}
