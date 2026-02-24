import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/postgresql'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const course = searchParams.get('course') // optional filter

    let queryText = `
      SELECT 
        l.user_id,
        u.name,
        u.course,
        l.total_score,
        l.total_quizzes,
        l.average_score,
        l.best_score,
        l.last_quiz_at,
        RANK() OVER (ORDER BY l.total_score DESC) as rank
      FROM leaderboard l
      JOIN users u ON l.user_id = u.id
      WHERE u.is_active = true
    `

    const params: any[] = []
    
    if (course && ['fitter', 'electrician'].includes(course)) {
      queryText += ` AND u.course = $1`
      params.push(course)
      queryText += ` ORDER BY l.total_score DESC LIMIT $2`
      params.push(limit)
    } else {
      queryText += ` ORDER BY l.total_score DESC LIMIT $1`
      params.push(limit)
    }

    const result = await query(queryText, params)

    const leaderboard = result.rows.map(row => ({
      rank: row.rank,
      userId: row.user_id,
      name: row.name,
      course: row.course,
      totalScore: row.total_score,
      totalQuizzes: row.total_quizzes,
      averageScore: parseFloat(row.average_score),
      bestScore: row.best_score,
      lastQuizAt: row.last_quiz_at
    }))

    return NextResponse.json({
      success: true,
      leaderboard,
      total: leaderboard.length
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
