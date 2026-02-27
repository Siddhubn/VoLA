import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { generateQuizWithRAG } from '@/lib/gemini'
import { ContextBuilder } from '@/lib/rag/context-builder'

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

    const body = await request.json()
    const { course, module, difficulty } = body

    // Validate input
    if (!course || !module) {
      return NextResponse.json(
        { error: 'Course and module are required' },
        { status: 400 }
      )
    }

    if (!['fitter', 'electrician'].includes(course)) {
      return NextResponse.json(
        { error: 'Invalid course' },
        { status: 400 }
      )
    }

    // Build RAG context for quiz generation
    const contextBuilder = new ContextBuilder()
    const quizContext = await contextBuilder.buildQuizContext(course, module, {
      topK: 5,
      minSimilarity: 0.6
    })

    // Generate quiz using Gemini AI with RAG context - always 5 questions
    const result = await generateQuizWithRAG({
      course,
      module,
      numQuestions: 5,
      difficulty: difficulty || 'medium',
      context: quizContext
    })

    return NextResponse.json({
      success: true,
      questions: result.questions,
      sources: result.sources,
      metadata: {
        course,
        module,
        totalQuestions: result.questions.length,
        difficulty: difficulty || 'medium',
        retrievedChunks: quizContext.chunkCount,
        usedFallback: result.usedFallback
      }
    })
  } catch (error) {
    console.error('Quiz generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate quiz' },
      { status: 500 }
    )
  }
}
