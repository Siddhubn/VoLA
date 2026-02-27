import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { query } from '@/lib/postgresql'
import { VectorSearchService } from '@/lib/rag/vector-search'

interface TopicInfo {
  section: string
  chunkCount: number
  pageNumbers: number[]
  contentExcerpts: string[]
}

interface ModuleDetail {
  id: string
  name: string
  description?: string
  topics: TopicInfo[]
  totalChunks: number
  pageRange: string
}

/**
 * GET /api/rag/syllabus/:course/:module
 * Get detailed information for a specific module
 * 
 * Query parameters:
 * - search?: string (keyword or semantic search within module)
 * 
 * Response:
 * {
 *   success: boolean,
 *   course: string,
 *   module: ModuleDetail
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { course: string; module: string } }
) {
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

    const { course, module: moduleParam } = params
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search')

    // Validate course
    if (!['fitter', 'electrician'].includes(course)) {
      return NextResponse.json(
        { error: 'Invalid course. Must be "fitter" or "electrician"' },
        { status: 400 }
      )
    }

    // Decode module parameter (it might be URL encoded)
    const moduleId = decodeURIComponent(moduleParam)
    
    console.log(`📖 Fetching module details: ${course}/${moduleId}${searchQuery ? `, search: "${searchQuery}"` : ''}`)

    // First, find the actual module name from the database
    const moduleCheckResult = await query(`
      SELECT DISTINCT module
      FROM knowledge_chunks
      WHERE course = $1 
      AND (
        module = $2 
        OR LOWER(REPLACE(module, ' ', '-')) = LOWER($2)
        OR LOWER(module) = LOWER($2)
      )
      LIMIT 1
    `, [course, moduleId])

    if (moduleCheckResult.rows.length === 0) {
      return NextResponse.json(
        { error: `Module "${moduleId}" not found in course "${course}"` },
        { status: 404 }
      )
    }

    const actualModuleName = moduleCheckResult.rows[0].module

    let topics: TopicInfo[] = []
    let totalChunks = 0
    let pageRange = 'N/A'

    if (searchQuery && searchQuery.trim().length > 0) {
      // Perform semantic search within the module
      const vectorSearchService = new VectorSearchService()
      const searchResults = await vectorSearchService.search({
        query: searchQuery,
        course: course as 'fitter' | 'electrician',
        module: actualModuleName,
        topK: 20,
        minSimilarity: 0.6
      })

      // Group by section
      const sectionMap = new Map<string, {
        chunkIds: Set<number>
        pages: Set<number>
        excerpts: string[]
      }>()

      for (const result of searchResults) {
        const sectionName = result.source.section || 'General'
        if (!sectionMap.has(sectionName)) {
          sectionMap.set(sectionName, {
            chunkIds: new Set(),
            pages: new Set(),
            excerpts: []
          })
        }
        const sectionData = sectionMap.get(sectionName)!
        sectionData.chunkIds.add(result.chunkId)
        if (result.source.pageNumber) {
          sectionData.pages.add(result.source.pageNumber)
        }
        // Add excerpt (first 200 chars)
        if (sectionData.excerpts.length < 3) {
          sectionData.excerpts.push(
            result.content.substring(0, 200) + (result.content.length > 200 ? '...' : '')
          )
        }
      }

      topics = Array.from(sectionMap.entries()).map(([section, data]) => ({
        section,
        chunkCount: data.chunkIds.size,
        pageNumbers: Array.from(data.pages).sort((a, b) => a - b),
        contentExcerpts: data.excerpts
      }))

      totalChunks = searchResults.length

      const allPages = searchResults
        .map(r => r.source.pageNumber)
        .filter((p): p is number => p !== null)
        .sort((a, b) => a - b)
      
      if (allPages.length > 0) {
        pageRange = `${allPages[0]}-${allPages[allPages.length - 1]}`
      }
    } else {
      // Get all topics/sections for the module
      const result = await query(`
        SELECT 
          COALESCE(section, 'General') as section,
          COUNT(*) as chunk_count,
          array_agg(page_number ORDER BY page_number) FILTER (WHERE page_number IS NOT NULL) as page_numbers,
          array_agg(LEFT(content, 200) ORDER BY chunk_index) as excerpts
        FROM knowledge_chunks
        WHERE course = $1 AND module = $2
        GROUP BY section
        ORDER BY MIN(page_number) NULLS LAST, section
      `, [course, actualModuleName])

      topics = result.rows.map((row: any) => ({
        section: row.section,
        chunkCount: parseInt(row.chunk_count),
        pageNumbers: row.page_numbers || [],
        contentExcerpts: (row.excerpts || []).slice(0, 3).map((e: string) => 
          e + (e.length >= 200 ? '...' : '')
        )
      }))

      // Get total stats
      const statsResult = await query(`
        SELECT 
          COUNT(*) as total_chunks,
          MIN(page_number) as min_page,
          MAX(page_number) as max_page
        FROM knowledge_chunks
        WHERE course = $1 AND module = $2
      `, [course, actualModuleName])

      if (statsResult.rows.length > 0) {
        totalChunks = parseInt(statsResult.rows[0].total_chunks)
        const minPage = statsResult.rows[0].min_page
        const maxPage = statsResult.rows[0].max_page
        if (minPage && maxPage) {
          pageRange = `${minPage}-${maxPage}`
        }
      }
    }

    // Try to get description from module_mapping
    let description: string | undefined
    try {
      const mappingResult = await query(`
        SELECT description
        FROM module_mapping
        WHERE course = $1 AND (module_id = $2 OR module_name = $3)
        LIMIT 1
      `, [course, moduleId, actualModuleName])

      if (mappingResult.rows.length > 0) {
        description = mappingResult.rows[0].description
      }
    } catch (error) {
      console.warn('Could not fetch module description:', error)
    }

    const moduleDetail: ModuleDetail = {
      id: moduleId,
      name: actualModuleName,
      description,
      topics,
      totalChunks,
      pageRange
    }

    console.log(`✅ Found ${topics.length} topics in module ${actualModuleName}`)

    return NextResponse.json({
      success: true,
      course,
      module: moduleDetail
    })

  } catch (error) {
    console.error('❌ Module detail fetch error:', error)
    
    if (error instanceof Error) {
      // Handle database errors
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
      { error: 'An unexpected error occurred while fetching module details' },
      { status: 500 }
    )
  }
}
