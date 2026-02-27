import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/postgresql'

/**
 * GET /api/rag/quality/metrics
 * Get quality metrics dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const course = searchParams.get('course') as 'fitter' | 'electrician' | null

    // Build base query with optional course filter
    let whereClause = "WHERE metadata->'quality' IS NOT NULL"
    const params: any[] = []
    
    if (course) {
      whereClause += " AND course = $1"
      params.push(course)
    }

    // Get overall quality distribution
    const qualityDistribution = await query(
      `SELECT 
        metadata->'quality'->>'status' as status,
        COUNT(*) as count,
        AVG((metadata->'quality'->>'score')::float) as avg_score
      FROM knowledge_chunks
      ${whereClause}
      GROUP BY metadata->'quality'->>'status'
      ORDER BY avg_score DESC`,
      params
    )

    // Get quality by course
    const qualityByCourse = await query(
      `SELECT 
        course,
        COUNT(*) as total_chunks,
        AVG((metadata->'quality'->>'score')::float) as avg_score,
        COUNT(CASE WHEN metadata->'quality'->>'status' = 'excellent' THEN 1 END) as excellent,
        COUNT(CASE WHEN metadata->'quality'->>'status' = 'good' THEN 1 END) as good,
        COUNT(CASE WHEN metadata->'quality'->>'status' = 'fair' THEN 1 END) as fair,
        COUNT(CASE WHEN metadata->'quality'->>'status' = 'poor' THEN 1 END) as poor,
        COUNT(CASE WHEN metadata->'quality'->>'status' = 'needs_review' THEN 1 END) as needs_review
      FROM knowledge_chunks
      ${whereClause}
      GROUP BY course`,
      params
    )

    // Get quality by module
    const qualityByModule = await query(
      `SELECT 
        course,
        module,
        COUNT(*) as chunk_count,
        AVG((metadata->'quality'->>'score')::float) as avg_score,
        metadata->'quality'->>'status' as status
      FROM knowledge_chunks
      ${whereClause}
      GROUP BY course, module, metadata->'quality'->>'status'
      ORDER BY course, module, avg_score DESC`,
      params
    )

    // Get quality flags summary
    const flagsSummary = await query(
      `SELECT 
        COUNT(CASE WHEN (metadata->'quality'->'flags'->>'tooShort')::boolean = true THEN 1 END) as too_short,
        COUNT(CASE WHEN (metadata->'quality'->'flags'->>'tooLong')::boolean = true THEN 1 END) as too_long,
        COUNT(CASE WHEN (metadata->'quality'->'flags'->>'highRepetition')::boolean = true THEN 1 END) as high_repetition,
        COUNT(CASE WHEN (metadata->'quality'->'flags'->>'lowReadability')::boolean = true THEN 1 END) as low_readability,
        COUNT(CASE WHEN (metadata->'quality'->'flags'->>'suspiciousContent')::boolean = true THEN 1 END) as suspicious_content,
        COUNT(CASE WHEN (metadata->'quality'->'flags'->>'needsReview')::boolean = true THEN 1 END) as needs_review
      FROM knowledge_chunks
      ${whereClause}`,
      params
    )

    // Get top issues (chunks with lowest scores)
    const topIssues = await query(
      `SELECT 
        id,
        course,
        module,
        section,
        page_number,
        content_preview,
        (metadata->'quality'->>'score')::float as quality_score,
        metadata->'quality'->>'status' as status,
        metadata->'quality'->'recommendations' as recommendations
      FROM knowledge_chunks
      ${whereClause}
      ORDER BY (metadata->'quality'->>'score')::float ASC
      LIMIT 20`,
      params
    )

    // Get metrics over time (if validated_at is available)
    const metricsOverTime = await query(
      `SELECT 
        DATE(metadata->'quality'->>'validated_at') as validation_date,
        COUNT(*) as chunks_validated,
        AVG((metadata->'quality'->>'score')::float) as avg_score
      FROM knowledge_chunks
      ${whereClause}
      AND metadata->'quality'->>'validated_at' IS NOT NULL
      GROUP BY DATE(metadata->'quality'->>'validated_at')
      ORDER BY validation_date DESC
      LIMIT 30`,
      params
    )

    // Calculate overall statistics
    const overallStats = await query(
      `SELECT 
        COUNT(*) as total_chunks,
        COUNT(CASE WHEN metadata->'quality' IS NOT NULL THEN 1 END) as validated_chunks,
        AVG((metadata->'quality'->>'score')::float) as avg_quality_score,
        MIN((metadata->'quality'->>'score')::float) as min_quality_score,
        MAX((metadata->'quality'->>'score')::float) as max_quality_score,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (metadata->'quality'->>'score')::float) as median_quality_score
      FROM knowledge_chunks
      ${whereClause}`,
      params
    )

    return NextResponse.json({
      success: true,
      metrics: {
        overall: overallStats.rows[0],
        distribution: qualityDistribution.rows,
        byCourse: qualityByCourse.rows,
        byModule: qualityByModule.rows,
        flags: flagsSummary.rows[0],
        topIssues: topIssues.rows,
        overTime: metricsOverTime.rows
      }
    })
  } catch (error) {
    console.error('Error fetching quality metrics:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch quality metrics'
      },
      { status: 500 }
    )
  }
}
