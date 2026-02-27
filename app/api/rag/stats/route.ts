import { NextRequest, NextResponse } from 'next/server'
import { statisticsService } from '@/lib/rag/statistics-service'

/**
 * GET /api/rag/stats
 * Get comprehensive RAG system statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'system'
    const course = searchParams.get('course') as 'fitter' | 'electrician' | undefined
    const filename = searchParams.get('filename')
    
    switch (type) {
      case 'system':
        const systemStats = await statisticsService.getSystemStats()
        return NextResponse.json({
          success: true,
          stats: systemStats
        })
      
      case 'processing':
        const processingStats = await statisticsService.getPDFProcessingStats()
        return NextResponse.json({
          success: true,
          stats: processingStats
        })
      
      case 'database':
        const dbStats = await statisticsService.getDatabaseStats()
        return NextResponse.json({
          success: true,
          stats: dbStats
        })
      
      case 'modules':
        const moduleStats = await statisticsService.getModuleStats(course)
        return NextResponse.json({
          success: true,
          stats: moduleStats
        })
      
      case 'chat':
        const chatStats = await statisticsService.getChatStats()
        return NextResponse.json({
          success: true,
          stats: chatStats
        })
      
      case 'pdf':
        if (!filename) {
          return NextResponse.json({
            success: false,
            error: 'filename parameter required for pdf type'
          }, { status: 400 })
        }
        
        const pdfSummary = await statisticsService.getPDFProcessingSummary(filename)
        
        if (!pdfSummary) {
          return NextResponse.json({
            success: false,
            error: 'PDF not found'
          }, { status: 404 })
        }
        
        return NextResponse.json({
          success: true,
          stats: pdfSummary
        })
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid type parameter. Valid types: system, processing, database, modules, chat, pdf'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error fetching RAG statistics:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics'
    }, { status: 500 })
  }
}
