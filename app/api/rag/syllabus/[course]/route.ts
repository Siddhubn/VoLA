import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { query } from '@/lib/postgresql'
import { VectorSearchService } from '@/lib/rag/vector-search'

interface ModuleInfo {
  id: string
  name: string
  topics: string[]
  chunkCount: number
  pageRange: string
  description?: string
}

/**
 * GET /api/rag/syllabus/:course
 * Get syllabus structure for a course
 * 
 * Query parameters:
 * - search?: string (keyword or semantic search)
 * 
 * Response:
 * {
 *   success: boolean,
 *   course: string,
 *   modules: ModuleInfo[]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { course: string } }
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

    const { course } = params
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search')

    // Validate course
    if (!['fitter', 'electrician'].includes(course)) {
      return NextResponse.json(
        { error: 'Invalid course. Must be "fitter" or "electrician"' },
        { status: 400 }
      )
    }

    console.log(`📚 Fetching syllabus for course: ${course}${searchQuery ? `, search: "${searchQuery}"` : ''}`)

    let modules: ModuleInfo[] = []

    if (searchQuery && searchQuery.trim().length > 0) {
      // Perform semantic search within the course
      const vectorSearchService = new VectorSearchService()
      const searchResults = await vectorSearchService.search({
        query: searchQuery,
        course: course as 'fitter' | 'electrician',
        topK: 20,
        minSimilarity: 0.6
      })

      // Group results by module
      const moduleMap = new Map<string, {
        sections: Set<string>
        chunkIds: Set<number>
        pages: Set<number>
      }>()

      for (const result of searchResults) {
        const moduleName = result.source.module || 'General'
        if (!moduleMap.has(moduleName)) {
          moduleMap.set(moduleName, {
            sections: new Set(),
            chunkIds: new Set(),
            pages: new Set()
          })
        }
        const moduleData = moduleMap.get(moduleName)!
        if (result.source.section) {
          moduleData.sections.add(result.source.section)
        }
        moduleData.chunkIds.add(result.chunkId)
        if (result.source.pageNumber) {
          moduleData.pages.add(result.source.pageNumber)
        }
      }

      // Convert to ModuleInfo array
      modules = Array.from(moduleMap.entries()).map(([name, data]) => {
        const pages = Array.from(data.pages).sort((a, b) => a - b)
        return {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          topics: Array.from(data.sections),
          chunkCount: data.chunkIds.size,
          pageRange: pages.length > 0 
            ? `${pages[0]}-${pages[pages.length - 1]}`
            : 'N/A'
        }
      })
    } else {
      // Get all modules for the course
      const result = await query(`
        SELECT 
          module,
          COUNT(*) as chunk_count,
          MIN(page_number) as min_page,
          MAX(page_number) as max_page,
          array_agg(DISTINCT section) FILTER (WHERE section IS NOT NULL) as sections
        FROM knowledge_chunks
        WHERE course = $1 AND module IS NOT NULL
        GROUP BY module
        ORDER BY MIN(page_number) NULLS LAST, module
      `, [course])

      modules = result.rows.map((row: any) => ({
        id: row.module.toLowerCase().replace(/\s+/g, '-'),
        name: row.module,
        topics: row.sections || [],
        chunkCount: parseInt(row.chunk_count),
        pageRange: row.min_page && row.max_page 
          ? `${row.min_page}-${row.max_page}`
          : 'N/A'
      }))
    }

    // Try to enrich with module_mapping data
    try {
      const mappingResult = await query(`
        SELECT module_id, module_name, description, display_order
        FROM module_mapping
        WHERE course = $1
        ORDER BY display_order NULLS LAST, module_name
      `, [course])

      const mappingMap = new Map(
        mappingResult.rows.map((row: any) => [
          row.module_id,
          { name: row.module_name, description: row.description, order: row.display_order }
        ])
      )

      // Enrich modules with mapping data
      modules = modules.map(module => {
        const mapping = mappingMap.get(module.id)
        if (mapping) {
          return {
            ...module,
            name: mapping.name || module.name,
            description: mapping.description
          }
        }
        return module
      })
    } catch (error) {
      console.warn('Could not fetch module mapping data:', error)
      // Continue without enrichment
    }

    console.log(`✅ Found ${modules.length} modules for ${course}`)

    return NextResponse.json({
      success: true,
      course,
      modules,
      totalModules: modules.length
    })

  } catch (error) {
    console.error('❌ Syllabus fetch error:', error)
    
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
      { error: 'An unexpected error occurred while fetching syllabus' },
      { status: 500 }
    )
  }
}
