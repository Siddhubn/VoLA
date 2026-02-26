import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { query } from '@/lib/postgresql'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get user's quiz history
    const result = await query(
      `SELECT 
        id,
        course,
        module,
        score,
        total_questions,
        time_spent,
        completed_at
       FROM quiz_attempts
       WHERE user_id = $1
       ORDER BY completed_at DESC
       LIMIT $2`,
      [Number(decoded.userId), limit]
    )

    const history = result.rows.map((row: any) => ({
      id: row.id,
      course: row.course,
      module: row.module,
      score: row.score,
      totalQuestions: row.total_questions,
      percentage: Math.round((row.score / row.total_questions) * 100),
      timeSpent: row.time_spent,
      completedAt: row.completed_at
    }))

    return NextResponse.json({
      success: true,
      history
    })
  } catch (error) {
    console.error('Quiz history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quiz history' },
      { status: 500 }
    )
  }
}
