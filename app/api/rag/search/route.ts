import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { VectorSearchService } from '@/lib/rag/vector-search'

/**
 * POST /api/rag/search
 * Semantic search endpoint for the RAG knowledge base
 * 
 * Request body:
 * {
 *   query: string,
 *   course?: 'fitter' | 'electrician',
 *   module?: string,
 *   topK?: number
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   results: SearchResult[],
 *   totalFound: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { query, course, module, topK, minSimilarity } = body

    // Validate required fields
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      if (!query || typeof query !== 'string') {
        return NextResponse.json(
          { error: 'Query is required and must be a string' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      )
    }

    // Validate course if provided
    if (course && !['fitter', 'electrician'].includes(course)) {
      return NextResponse.json(
        { error: 'Invalid course. Must be "fitter" or "electrician"' },
        { status: 400 }
      )
    }

    // Validate topK if provided
    if (topK !== undefined) {
      if (typeof topK !== 'number' || topK < 1 || topK > 100) {
        return NextResponse.json(
          { error: 'topK must be a number between 1 and 100' },
          { status: 400 }
        )
      }
    }

    // Validate minSimilarity if provided
    if (minSimilarity !== undefined) {
      if (typeof minSimilarity !== 'number' || minSimilarity < 0 || minSimilarity > 1) {
        return NextResponse.json(
          { error: 'minSimilarity must be a number between 0 and 1' },
          { status: 400 }
        )
      }
    }

    // Validate module if provided
    if (module !== undefined && typeof module !== 'string') {
      return NextResponse.json(
        { error: 'Module must be a string' },
        { status: 400 }
      )
    }

    // Perform semantic search
    const vectorSearchService = new VectorSearchService()
    
    console.log(`🔍 Semantic search: query="${query}", course=${course || 'all'}, module=${module || 'all'}, topK=${topK || 5}`)
    
    const results = await vectorSearchService.search({
      query,
      course,
      module,
      topK,
      minSimilarity
    })

    console.log(`✅ Found ${results.length} results`)

    return NextResponse.json({
      success: true,
      results,
      totalFound: results.length,
      metadata: {
        query,
        course: course || null,
        module: module || null,
        topK: topK || 5,
        minSimilarity: minSimilarity || 0.7
      }
    })

  } catch (error) {
    console.error('❌ Semantic search error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      // Check for pgvector errors
      if (error.message.includes('pgvector')) {
        return NextResponse.json(
          { error: 'Vector search is not available. Please ensure pgvector is installed.' },
          { status: 503 }
        )
      }

      // Check for embedding errors
      if (error.message.includes('embedding') || error.message.includes('GEMINI_API_KEY')) {
        return NextResponse.json(
          { error: 'Failed to generate query embedding. Please check API configuration.' },
          { status: 503 }
        )
      }

      // Check for database errors
      if (error.message.includes('database') || error.message.includes('connection')) {
        return NextResponse.json(
          { error: 'Database connection error. Please try again later.' },
          { status: 503 }
        )
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during search' },
      { status: 500 }
    )
  }
}
