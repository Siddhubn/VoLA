import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
  password: 'admin',
})

/**
 * GET /api/chat/sessions
 * Get all chat sessions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
    const course = searchParams.get('course')

    // Get all sessions with their first message as preview
    let query = `
      SELECT 
        ch.session_id,
        ch.course,
        MIN(ch.created_at) as started_at,
        MAX(ch.created_at) as last_message_at,
        COUNT(*) as message_count,
        (
          SELECT content 
          FROM chat_history 
          WHERE session_id = ch.session_id 
            AND role = 'user' 
          ORDER BY created_at ASC 
          LIMIT 1
        ) as first_message
      FROM chat_history ch
      WHERE ch.user_id = $1
    `

    const params: any[] = [decoded.userId]

    if (course) {
      query += ` AND ch.course = $2`
      params.push(course)
    }

    query += `
      GROUP BY ch.session_id, ch.course
      ORDER BY MAX(ch.created_at) DESC
      LIMIT 50
    `

    const result = await pool.query(query, params)

    const sessions = result.rows.map(row => ({
      sessionId: row.session_id,
      course: row.course,
      startedAt: row.started_at,
      lastMessageAt: row.last_message_at,
      messageCount: parseInt(row.message_count),
      preview: row.first_message ? 
        (row.first_message.length > 60 ? row.first_message.substring(0, 60) + '...' : row.first_message) 
        : 'New conversation'
    }))

    return NextResponse.json({
      success: true,
      sessions
    })

  } catch (error) {
    console.error('❌ Error loading chat sessions:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
