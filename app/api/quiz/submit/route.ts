import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { query } from '@/lib/postgresql'

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
    const { course, module, score, totalQuestions, timeSpent } = body

    // Validate input
    if (!course || !module || typeof score !== 'number' || typeof totalQuestions !== 'number') {
      return NextResponse.json(
        { error: 'Invalid submission data' },
        { status: 400 }
      )
    }

    if (score < 0 || score > totalQuestions) {
      return NextResponse.json(
        { error: 'Invalid score' },
        { status: 400 }
      )
    }

    // Save only the quiz result (not the questions) to database
    const result = await query(
      `INSERT INTO quiz_attempts (user_id, course, module, score, total_questions, time_spent, answers)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, completed_at`,
      [Number(decoded.userId), course, module, score, totalQuestions, timeSpent || 0, JSON.stringify({})]
    )

    const attempt = result.rows[0]

    // Get updated leaderboard position
    const leaderboardResult = await query(
      `SELECT 
        l.*,
        u.name,
        RANK() OVER (ORDER BY l.total_score DESC) as rank
       FROM leaderboard l
       JOIN users u ON l.user_id = u.id
       WHERE l.user_id = $1`,
      [Number(decoded.userId)]
    )

    const userStats = leaderboardResult.rows[0]

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      completedAt: attempt.completed_at,
      userStats: userStats ? {
        totalScore: userStats.total_score,
        totalQuizzes: userStats.total_quizzes,
        averageScore: parseFloat(userStats.average_score),
        bestScore: userStats.best_score,
        rank: userStats.rank
      } : null
    })
  } catch (error) {
    console.error('Quiz submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit quiz' },
      { status: 500 }
    )
  }
}
