import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/postgresql'

/**
 * POST /api/rag/quality/review
 * Submit manual review for a chunk
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chunkId, reviewStatus, reviewNotes, reviewedBy } = body

    if (!chunkId || !reviewStatus) {
      return NextResponse.json(
        {
          success: false,
          error: 'chunkId and reviewStatus are required'
        },
        { status: 400 }
      )
    }

    // Valid review statuses
    const validStatuses = ['approved', 'rejected', 'needs_edit', 'flagged']
    if (!validStatuses.includes(reviewStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid reviewStatus. Must be one of: ${validStatuses.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Update chunk with review information
    await query(
      `UPDATE knowledge_chunks 
       SET metadata = metadata || $1::jsonb
       WHERE id = $2`,
      [
        JSON.stringify({
          review: {
            status: reviewStatus,
            notes: reviewNotes || '',
            reviewed_by: reviewedBy || 'admin',
            reviewed_at: new Date().toISOString()
          }
        }),
        chunkId
      ]
    )

    return NextResponse.json({
      success: true,
      message: 'Review submitted successfully',
      chunkId,
      reviewStatus
    })
  } catch (error) {
    console.error('Review submission error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Review submission failed'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rag/quality/review
 * Get review statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const course = searchParams.get('course') as 'fitter' | 'electrician' | null

    let sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN metadata->'review'->>'status' = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN metadata->'review'->>'status' = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN metadata->'review'->>'status' = 'needs_edit' THEN 1 END) as needs_edit,
        COUNT(CASE WHEN metadata->'review'->>'status' = 'flagged' THEN 1 END) as flagged,
        COUNT(CASE WHEN metadata->'review' IS NULL AND metadata->'quality'->>'status' = 'needs_review' THEN 1 END) as pending_review
      FROM knowledge_chunks
      WHERE metadata->'quality' IS NOT NULL
    `

    const params: any[] = []
    if (course) {
      sql += ` AND course = $1`
      params.push(course)
    }

    const result = await query(sql, params)
    const stats = result.rows[0]

    return NextResponse.json({
      success: true,
      stats: {
        total: parseInt(stats.total),
        approved: parseInt(stats.approved),
        rejected: parseInt(stats.rejected),
        needsEdit: parseInt(stats.needs_edit),
        flagged: parseInt(stats.flagged),
        pendingReview: parseInt(stats.pending_review)
      }
    })
  } catch (error) {
    console.error('Error fetching review statistics:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch review statistics'
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/rag/quality/review
 * Bulk update review status
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { chunkIds, reviewStatus, reviewNotes, reviewedBy } = body

    if (!chunkIds || !Array.isArray(chunkIds) || chunkIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'chunkIds array is required'
        },
        { status: 400 }
      )
    }

    if (!reviewStatus) {
      return NextResponse.json(
        {
          success: false,
          error: 'reviewStatus is required'
        },
        { status: 400 }
      )
    }

    const validStatuses = ['approved', 'rejected', 'needs_edit', 'flagged']
    if (!validStatuses.includes(reviewStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid reviewStatus. Must be one of: ${validStatuses.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Bulk update
    const reviewData = {
      review: {
        status: reviewStatus,
        notes: reviewNotes || '',
        reviewed_by: reviewedBy || 'admin',
        reviewed_at: new Date().toISOString()
      }
    }

    await query(
      `UPDATE knowledge_chunks 
       SET metadata = metadata || $1::jsonb
       WHERE id = ANY($2::int[])`,
      [JSON.stringify(reviewData), chunkIds]
    )

    return NextResponse.json({
      success: true,
      message: `${chunkIds.length} chunks updated successfully`,
      updatedCount: chunkIds.length
    })
  } catch (error) {
    console.error('Bulk review update error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk review update failed'
      },
      { status: 500 }
    )
  }
}
