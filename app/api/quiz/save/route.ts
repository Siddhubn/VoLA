import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
  password: 'admin',
})

/**
 * POST /api/quiz/save
 * Save quiz result to history
 * 
 * Body:
 * {
 *   course: string,
 *   module: string,
 *   score: number,
 *   totalQuestions: number,
 *   percentage: number,
 *   timeSpent: number
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

    const userId = decoded.userId
    const body = await request.json()
    const { course, module, score, totalQuestions, percentage, timeSpent } = body

    if (!course || !module || score === undefined || !totalQuestions || !percentage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Save quiz result
    const result = await pool.query(
      `INSERT INTO quiz_history 
       (user_id, course, module, score, total_questions, percentage, time_spent, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, completed_at`,
      [userId, course, module, score, totalQuestions, percentage, timeSpent || 0]
    )

    console.log(`✅ Saved quiz result for user ${userId}: ${score}/${totalQuestions} (${percentage}%)`)

    return NextResponse.json({
      success: true,
      quizId: result.rows[0].id,
      completedAt: result.rows[0].completed_at
    })

  } catch (error) {
    console.error('❌ Quiz save error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while saving quiz' },
      { status: 500 }
    )
  }
}
