import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { generateQuiz } from '@/lib/gemini'

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

    // Generate quiz using Gemini AI - always 5 questions
    const questions = await generateQuiz({
      course,
      module,
      numQuestions: 5,
      difficulty: difficulty || 'medium'
    })

    return NextResponse.json({
      success: true,
      questions,
      metadata: {
        course,
        module,
        totalQuestions: questions.length,
        difficulty: difficulty || 'medium'
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
