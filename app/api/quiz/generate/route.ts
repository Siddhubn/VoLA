import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { 
  getBalancedQuizContent, 
  calculateQuizDifficulty, 
  estimateQuizTime,
  type QuizContent,
  type QuizMetadata 
} from '@/lib/quiz-helper'

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

    const { 
      moduleId, 
      tradeType = 'TT', 
      difficulty, 
      questionCount = 10,
      focusArea 
    } = await request.json()

    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 })
    }

    console.log('🎯 Generating quiz:', { moduleId, tradeType, questionCount, focusArea })

    // Get mixed content for comprehensive quiz
    const result = await getBalancedQuizContent(
      moduleId, 
      tradeType as 'TT' | 'TP', 
      questionCount
    )

    const { content, distribution } = result

    if (content.length === 0) {
      return NextResponse.json({ 
        error: 'No content available for this module',
        details: `No quiz content found for ${moduleId} (${tradeType})`
      }, { status: 404 })
    }

    console.log(`📚 Found ${content.length} content chunks`)

    // Calculate difficulty if not provided
    const quizDifficulty = difficulty || calculateQuizDifficulty(content)
    
    // For now, create simple questions from content
    // In production, you'd use AI to generate proper questions
    const questions = content.map((chunk: QuizContent, index: number) => ({
      id: `q_${index + 1}`,
      question: `What is the main concept discussed in this ${chunk.content_type} content?`,
      options: [
        chunk.content.substring(0, 100) + '...',
        'Alternative option A',
        'Alternative option B', 
        'Alternative option C'
      ],
      correctAnswer: 0,
      explanation: `This question is based on ${chunk.content_type} content from ${chunk.module_name}`,
      difficulty: quizDifficulty,
      module: chunk.module_name,
      contentType: chunk.content_type,
      section: chunk.section_title || undefined
    }))
    
    if (questions.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to generate questions',
        details: 'Could not create questions from available content'
      }, { status: 500 })
    }

    // Calculate estimated time
    const estimatedTime = estimateQuizTime(questions.length, quizDifficulty)

    // Create quiz metadata
    const metadata: QuizMetadata = {
      moduleId,
      tradeType: tradeType as 'TT' | 'TP',
      totalQuestions: questions.length,
      contentTypes: distribution,
      difficulty: quizDifficulty,
      estimatedTime
    }

    console.log(`✅ Generated ${questions.length} questions (${quizDifficulty} difficulty)`)

    return NextResponse.json({
      success: true,
      quiz: {
        id: `quiz_${Date.now()}`,
        moduleId,
        moduleName: content[0]?.module_name || `Module ${moduleId.split('-')[1]}`,
        tradeType,
        difficulty: quizDifficulty,
        questionCount: questions.length,
        questions,
        timeLimit: estimatedTime,
        metadata,
        createdAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('❌ Quiz generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz', details: error.message },
      { status: 500 }
    )
  }
}
