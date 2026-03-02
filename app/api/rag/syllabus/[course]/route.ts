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
 * - tradeType?: 'trade_theory' | 'trade_practical' (filter by trade type)
 * 
 * Response:
 * {
 *   success: boolean,
 *   course: string,
 *   tradeType?: string,
 *   modules: ModuleInfo[]
 * }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ course: string }> }
) {
  try {
    // Await params in Next.js 15+
    const resolvedParams = await context.params
    const { course } = resolvedParams
    
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

    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search')
    const tradeType = searchParams.get('tradeType')

    // Validate course
    if (!['fitter', 'electrician'].includes(course)) {
      return NextResponse.json(
        { error: 'Invalid course. Must be "fitter" or "electrician"' },
        { status: 400 }
      )
    }

    // Validate tradeType if provided
    if (tradeType && !['trade_theory', 'trade_practical'].includes(tradeType)) {
      return NextResponse.json(
        { error: 'Invalid tradeType. Must be "trade_theory" or "trade_practical"' },
        { status: 400 }
      )
    }

    console.log(`📚 Fetching syllabus for course: ${course}${tradeType ? `, tradeType: ${tradeType}` : ''}${searchQuery ? `, search: "${searchQuery}"` : ''}`)

    let modules: ModuleInfo[] = []

    // First, try to get clean syllabus structure from module_syllabus table
    try {
      let syllabusSql = `
        SELECT 
          module_id,
          module_name,
          module_number,
          topics,
          extracted_from
        FROM module_syllabus
        WHERE course = $1`
      
      const syllabusParams: any[] = [course]
      
      if (tradeType) {
        syllabusSql += ` AND trade_type = $2`
        syllabusParams.push(tradeType)
      }
      
      syllabusSql += ` ORDER BY module_number NULLS LAST, module_name`

      const syllabusResult = await query(syllabusSql, syllabusParams)

      if (syllabusResult.rows.length > 0) {
        // Use clean syllabus structure
        console.log(`✅ Using clean syllabus structure (${syllabusResult.rows.length} modules)`)
        
        modules = syllabusResult.rows.map((row: any) => ({
          id: row.module_id,
          name: row.module_name,
          moduleNumber: row.module_number,
          topics: row.topics || [],
          chunkCount: (row.topics || []).length,
          pageRange: 'N/A',
          source: 'syllabus'
        }))

        return NextResponse.json({
          success: true,
          course,
          tradeType,
          modules,
          totalModules: modules.length,
          source: 'clean_syllabus'
        })
      }
    } catch (error) {
      console.warn('Could not fetch from module_syllabus, falling back to chunks:', error)
    }

    // Fallback: Use knowledge_chunks if syllabus not available
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
      let sql = `
        SELECT 
          module,
          module_name,
          COUNT(*) as chunk_count,
          MIN(page_number) as min_page,
          MAX(page_number) as max_page,
          array_agg(DISTINCT section) FILTER (WHERE section IS NOT NULL) as sections
        FROM knowledge_chunks
        WHERE course = $1 AND module IS NOT NULL`
      
      const params: any[] = [course]
      
      // Add trade_type filter if provided
      if (tradeType) {
        sql += ` AND trade_type = $2`
        params.push(tradeType)
      }
      
      sql += `
        GROUP BY module, module_name
        ORDER BY MIN(page_number) NULLS LAST, module
      `

      const result = await query(sql, params)

      modules = result.rows.map((row: any) => ({
        id: row.module,
        name: row.module_name || row.module,
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
        const mapping = mappingMap.get(module.id) as any
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

    console.log(`✅ Found ${modules.length} modules for ${course}${tradeType ? ` (${tradeType})` : ''}`)

    return NextResponse.json({
      success: true,
      course,
      tradeType,
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
