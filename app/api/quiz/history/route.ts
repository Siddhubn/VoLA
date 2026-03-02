import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
  password: 'admin',
})

/**
 * GET /api/quiz/history
 * Get quiz history for the authenticated user
 * 
 * Query params:
 * - limit?: number (default: 10)
 */
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

    const userId = decoded.userId
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get quiz history
    const result = await pool.query(
      `SELECT 
        id,
        course,
        module,
        score,
        total_questions as "totalQuestions",
        percentage,
        time_spent as "timeSpent",
        completed_at as "completedAt"
       FROM quiz_history
       WHERE user_id = $1
       ORDER BY completed_at DESC
       LIMIT $2`,
      [userId, limit]
    )

    return NextResponse.json({
      success: true,
      history: result.rows
    })

  } catch (error) {
    console.error('❌ Quiz history error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching quiz history' },
      { status: 500 }
    )
  }
}
