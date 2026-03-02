import { NextRequest, NextResponse } from 'next/server'
import { qualityValidator } from '@/lib/rag/quality-validator'

/**
 * POST /api/rag/quality/validate
 * Validate quality of all chunks or specific chunks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chunkIds, storeResults } = body

    if (chunkIds && Array.isArray(chunkIds)) {
      // Validate specific chunks
      const results = []
      
      for (const chunkId of chunkIds) {
        const { query } = await import('@/lib/postgresql')
        const chunkResult = await query(
          'SELECT id, content FROM knowledge_chunks WHERE id = $1',
          [chunkId]
        )

        if (chunkResult.rows.length === 0) {
          results.push({
            chunkId,
            error: 'Chunk not found'
          })
          continue
        }

        const chunk = chunkResult.rows[0]
        const validation = await qualityValidator.validateChunk(chunk.id, chunk.content)
        
        if (storeResults) {
          await qualityValidator.storeQualityMetrics(chunk.id, validation)
        }

        results.push(validation)
      }

      return NextResponse.json({
        success: true,
        results
      })
    } else {
      // Validate all chunks
      const stats = await qualityValidator.batchValidateAndStore()

      return NextResponse.json({
        success: true,
        message: 'Quality validation completed',
        stats
      })
    }
  } catch (error) {
    console.error('Quality validation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Quality validation failed'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rag/quality/validate
 * Get chunks that need review
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const course = searchParams.get('course') as 'fitter' | 'electrician' | null
    const status = searchParams.get('status')

    const { query } = await import('@/lib/postgresql')
    
    let sql = `
      SELECT 
        id,
        course,
        pdf_source,
        module,
        section,
        page_number,
        content,
        content_preview,
        metadata
      FROM knowledge_chunks
      WHERE metadata->'quality' IS NOT NULL
    `

    const params: any[] = []
    let paramIndex = 1

    if (course) {
      sql += ` AND course = $${paramIndex}`
      params.push(course)
      paramIndex++
    }

    if (status) {
      sql += ` AND metadata->'quality'->>'status' = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    sql += ` ORDER BY (metadata->'quality'->>'score')::float ASC`

    const result = await query(sql, params)

    const chunks = result.rows.map((row: any) => ({
      chunkId: row.id,
      course: row.course,
      pdfSource: row.pdf_source,
      module: row.module,
      section: row.section,
      pageNumber: row.page_number,
      content: row.content,
      contentPreview: row.content_preview,
      quality: row.metadata?.quality || null
    }))

    return NextResponse.json({
      success: true,
      chunks,
      total: chunks.length
    })
  } catch (error) {
    console.error('Error fetching quality data:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch quality data'
      },
      { status: 500 }
    )
  }
}
