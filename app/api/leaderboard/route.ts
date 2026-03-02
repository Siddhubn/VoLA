import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
  password: 'admin',
})

/**
 * GET /api/leaderboard
 * Get global leaderboard with top performers
 * 
 * Query params:
 * - course?: string (filter by course)
 * - limit?: number (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const course = searchParams.get('course')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.course,
        COUNT(qh.id) as total_quizzes,
        SUM(qh.score) as total_score,
        ROUND(AVG(qh.percentage)) as average_score,
        MAX(qh.percentage) as highest_score,
        SUM(qh.time_spent) as total_time,
        MAX(qh.completed_at) as last_quiz_date
      FROM users u
      INNER JOIN quiz_history qh ON u.id = qh.user_id
    `

    const params: any[] = []
    
    if (course) {
      query += ` WHERE qh.course = $1`
      params.push(course)
    }

    query += `
      GROUP BY u.id, u.name, u.email, u.course
      ORDER BY total_score DESC, average_score DESC, total_quizzes DESC
      LIMIT $${params.length + 1}
    `
    params.push(limit)

    const result = await pool.query(query, params)

    // Add rank to each user
    const leaderboard = result.rows.map((row, index) => ({
      rank: index + 1,
      userId: row.id,
      name: row.name,
      course: row.course,
      totalScore: parseInt(row.total_score || 0),
      totalQuizzes: parseInt(row.total_quizzes),
      averageScore: parseInt(row.average_score),
      highestScore: parseInt(row.highest_score),
      totalTime: parseInt(row.total_time || 0),
      lastQuizDate: row.last_quiz_date
    }))

    return NextResponse.json({
      success: true,
      leaderboard,
      totalUsers: leaderboard.length
    })

  } catch (error) {
    console.error('❌ Leaderboard error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching leaderboard' },
      { status: 500 }
    )
  }
}
