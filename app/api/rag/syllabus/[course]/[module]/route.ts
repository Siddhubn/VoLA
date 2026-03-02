import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { query } from '@/lib/postgresql'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface TopicInfo {
  section: string
  description: string
  keyPoints: string[]
}

/**
 * GET /api/rag/syllabus/:course/:module
 * Get detailed information about a specific module
 * 
 * Query parameters:
 * - tradeType?: 'trade_theory' | 'trade_practical' (filter by trade type)
 * 
 * Response:
 * {
 *   success: boolean,
 *   module: {
 *     id: string,
 *     name: string,
 *     description?: string,
 *     topics: TopicInfo[],
 *     totalChunks: number,
 *     pageRange: string,
 *     tradeType?: string
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ course: string; module: string }> }
) {
  try {
    // Await params in Next.js 15+
    const resolvedParams = await context.params
    const { course, module: moduleId } = resolvedParams
    
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
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

    console.log(`📖 Fetching module details: ${course}/${moduleId}${tradeType ? ` (${tradeType})` : ''}`)

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
        WHERE course = $1 AND module_id = $2`
      
      const syllabusParams: any[] = [course, moduleId]
      
      if (tradeType) {
        syllabusSql += ` AND trade_type = $3`
        syllabusParams.push(tradeType)
      }

      const syllabusResult = await query(syllabusSql, syllabusParams)

      if (syllabusResult.rows.length > 0) {
        // Use clean syllabus structure
        const row = syllabusResult.rows[0]
        console.log(`✅ Using clean syllabus structure for module: ${row.module_name}`)
        
        const topics: TopicInfo[] = (row.topics || []).map((topic: string) => ({
          section: topic,
          description: `Learn about ${topic.toLowerCase()}`,
          keyPoints: []
        }))

        return NextResponse.json({
          success: true,
          module: {
            id: row.module_id,
            name: row.module_name,
            moduleNumber: row.module_number,
            topics,
            totalChunks: topics.length,
            pageRange: 'N/A',
            tradeType: tradeType || undefined,
            source: 'clean_syllabus'
          }
        })
      }
    } catch (error) {
      console.warn('Could not fetch from module_syllabus, falling back to chunks:', error)
    }

    // Fallback: Use knowledge_chunks if syllabus not available
    let moduleName = moduleId.replace(/-/g, ' ')
    let moduleDescription: string | undefined

    // First, get the module_name from knowledge_chunks
    try {
      let nameQuery = `
        SELECT DISTINCT module_name
        FROM knowledge_chunks
        WHERE course = $1 AND module = $2
        LIMIT 1
      `
      const nameResult = await query(nameQuery, [course, moduleId])
      
      if (nameResult.rows.length > 0 && nameResult.rows[0].module_name) {
        moduleName = nameResult.rows[0].module_name
      }
    } catch (error) {
      console.warn('Could not fetch module_name:', error)
    }

    // Try to get additional info from module_mapping if available
    try {
      const mappingResult = await query(`
        SELECT module_name, description
        FROM module_mapping
        WHERE course = $1 AND module_id = $2
      `, [course, moduleId])

      if (mappingResult.rows.length > 0) {
        if (mappingResult.rows[0].module_name) {
          moduleName = mappingResult.rows[0].module_name
        }
        moduleDescription = mappingResult.rows[0].description
      }
    } catch (error) {
      console.warn('Could not fetch module mapping:', error)
    }

    // Get all chunks for this module with page numbers and sections
    // Match by module ID directly since that's what's stored in the database
    let sql = `
      SELECT 
        content,
        chunk_index,
        page_number,
        section,
        trade_type
      FROM knowledge_chunks
      WHERE course = $1 
        AND module = $2`
    
    const params: any[] = [course, moduleId]
    
    // Add trade_type filter if provided
    if (tradeType) {
      sql += ` AND trade_type = $3`
      params.push(tradeType)
    }
    
    sql += ` ORDER BY chunk_index`
    
    const chunksResult = await query(sql, params)

    if (chunksResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Module not found' },
        { status: 404 }
      )
    }

    console.log(`📊 Found ${chunksResult.rows.length} chunks for module: ${moduleId}`)

    // Use Gemini to extract structured topics from the content
    const allContent = chunksResult.rows
      .map((chunk: any) => chunk.content)
      .filter((content: string) => content && content.trim().length > 20)
      .join('\n\n')
    
    let topics: TopicInfo[] = []
    
    try {
      // Use Gemini to extract main topics and structure
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
      
      const prompt = `You are analyzing educational content from an ITI (Industrial Training Institute) course module.

Module: ${moduleName}
Course: ${course}
Trade Type: ${tradeType || 'general'}

Content to analyze:
---
${allContent.substring(0, 15000)} 
---

Extract the main topics covered in this module. For each topic:
1. Identify the topic name/title
2. Write a brief 1-2 sentence description
3. List 3-5 key learning points

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "section": "Topic Name",
    "description": "Brief description of what this topic covers",
    "keyPoints": ["Point 1", "Point 2", "Point 3"]
  }
]

Focus on educational value and clarity. Extract 3-8 main topics maximum.`

      const result = await model.generateContent(prompt)
      const response = result.response
      let text = response.text().trim()
      
      // Clean markdown code blocks
      if (text.startsWith('```json')) {
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      } else if (text.startsWith('```')) {
        text = text.replace(/```\n?/g, '')
      }
      
      const extractedTopics = JSON.parse(text)
      
      if (Array.isArray(extractedTopics) && extractedTopics.length > 0) {
        topics = extractedTopics
        console.log(`✅ Gemini extracted ${topics.length} topics for module: ${moduleName}`)
      } else {
        throw new Error('Invalid topic format from Gemini')
      }
    } catch (geminiError) {
      console.warn('⚠️ Gemini topic extraction failed, using fallback:', geminiError)
      
      // Fallback: Create simple topic structure from sections
      const sectionMap = new Map<string, string[]>()
      
      for (const chunk of chunksResult.rows) {
        const sectionName = chunk.section || 'Module Content'
        if (!sectionMap.has(sectionName)) {
          sectionMap.set(sectionName, [])
        }
        if (chunk.content && chunk.content.trim().length > 20) {
          sectionMap.get(sectionName)!.push(chunk.content)
        }
      }
      
      topics = Array.from(sectionMap.entries()).map(([sectionName, contents]) => {
        // Extract first few sentences as description
        const firstContent = contents[0] || ''
        const sentences = firstContent.split(/[.!?]+/).filter(s => s.trim().length > 10)
        const description = sentences.slice(0, 2).join('. ').trim() + (sentences.length > 0 ? '.' : '')
        
        return {
          section: sectionName,
          description: description.substring(0, 200) || 'Content section',
          keyPoints: contents.slice(0, 3).map(c => {
            const sent = c.split(/[.!?]+/)[0]
            return sent.substring(0, 100).trim()
          }).filter(p => p.length > 10)
        }
      })
    }

    // Calculate page range
    const allPages = chunksResult.rows
      .map((row: any) => row.page_number)
      .filter((page: number) => page != null)
      .sort((a: number, b: number) => a - b)
    
    const pageRange = allPages.length > 0
      ? `${allPages[0]}-${allPages[allPages.length - 1]}`
      : 'N/A'

    const moduleDetails = {
      id: moduleId,
      name: moduleName,
      description: moduleDescription,
      topics,
      totalChunks: chunksResult.rows.length,
      pageRange,
      tradeType: tradeType || undefined
    }

    console.log(`✅ Found ${topics.length} topics for module: ${moduleName}${tradeType ? ` (${tradeType})` : ''}`)

    return NextResponse.json({
      success: true,
      module: moduleDetails
    })

  } catch (error) {
    console.error('❌ Module details fetch error:', error)
    
    if (error instanceof Error) {
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
