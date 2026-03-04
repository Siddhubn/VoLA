import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { 
  searchKnowledgeBase, 
  contextAwareSearch, 
  generateEmbedding,
  type RAGChunk,
  type SearchOptions 
} from '@/lib/rag-helper-optimized'

/**
 * POST /api/rag/search
 * Enhanced semantic search endpoint with advanced filtering
 * 
 * Request body:
 * {
 *   query: string,
 *   trade?: string,              // Default: 'electrician'
 *   tradeType?: 'TT' | 'TP',
 *   moduleId?: string,
 *   contentType?: string,
 *   limit?: number,              // Default: 5
 *   maxDistance?: number,        // Default: 0.5
 *   minPriority?: number,        // Default: 1
 *   context?: {                  // For context-aware search
 *     userLevel?: 'beginner' | 'intermediate' | 'advanced',
 *     focusArea?: 'theory' | 'practical' | 'safety' | 'tools'
 *   }
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   results: RAGChunk[],
 *   totalFound: number,
 *   metadata: {
 *     searchTime: number,
 *     avgSimilarity: number
 *   }
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
    const { 
      query, 
      trade = 'electrician',
      tradeType,
      moduleId,
      contentType,
      limit = 5,
      maxDistance = 0.5,
      minPriority = 1,
      context
    } = body

    // Validate required fields
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate trade if provided
    if (trade && !['fitter', 'electrician'].includes(trade)) {
      return NextResponse.json(
        { error: 'Invalid trade. Must be "fitter" or "electrician"' },
        { status: 400 }
      )
    }

    // Validate tradeType if provided
    if (tradeType && !['TT', 'TP'].includes(tradeType)) {
      return NextResponse.json(
        { error: 'Invalid tradeType. Must be "TT" or "TP"' },
        { status: 400 }
      )
    }

    // Validate contentType if provided
    if (contentType && !['theory', 'safety', 'practical', 'tools', 'definition', 'example'].includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid contentType. Must be one of: theory, safety, practical, tools, definition, example' },
        { status: 400 }
      )
    }

    // Validate numeric parameters
    if (typeof limit !== 'number' || limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'limit must be a number between 1 and 50' },
        { status: 400 }
      )
    }

    if (typeof maxDistance !== 'number' || maxDistance < 0 || maxDistance > 1) {
      return NextResponse.json(
        { error: 'maxDistance must be a number between 0 and 1' },
        { status: 400 }
      )
    }

    if (typeof minPriority !== 'number' || minPriority < 1 || minPriority > 10) {
      return NextResponse.json(
        { error: 'minPriority must be a number between 1 and 10' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    console.log(`🔍 Enhanced search:`, {
      query: query.substring(0, 50),
      trade,
      tradeType,
      moduleId,
      contentType,
      limit,
      maxDistance,
      minPriority,
      hasContext: !!context
    })

    // Generate embedding for the query
    const embedding = await generateEmbedding(query)

    let results: RAGChunk[]

    // Use context-aware search if context is provided
    if (context && (context.userLevel || context.focusArea)) {
      results = await contextAwareSearch(embedding, {
        preferredModule: moduleId,
        preferredContentType: context.focusArea,
        tradeType,
        userLevel: context.userLevel
      }, limit)
    } else {
      // Use standard search with filtering
      const searchOptions: SearchOptions = {
        trade,
        tradeType,
        moduleId,
        contentType,
        limit,
        maxDistance,
        minPriority
      }

      results = await searchKnowledgeBase(embedding, searchOptions)
    }

    const searchTime = Date.now() - startTime
    const avgSimilarity = results.length > 0 
      ? results.reduce((sum, r) => sum + (1 - r.distance), 0) / results.length 
      : 0

    console.log(`✅ Found ${results.length} results in ${searchTime}ms (avg similarity: ${avgSimilarity.toFixed(3)})`)

    return NextResponse.json({
      success: true,
      results,
      totalFound: results.length,
      metadata: {
        searchTime,
        avgSimilarity: parseFloat(avgSimilarity.toFixed(3)),
        query: query.substring(0, 100),
        filters: {
          trade,
          tradeType,
          moduleId,
          contentType,
          minPriority
        }
      }
    })

  } catch (error) {
    console.error('❌ Enhanced search error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
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
