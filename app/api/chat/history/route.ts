import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
  password: 'admin',
})

/**
 * GET /api/chat/history
 * Get chat history for the current user and course
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
    const course = searchParams.get('course') || 'electrician'
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get the most recent session for this user and course
    const sessionResult = await pool.query(
      `SELECT DISTINCT session_id 
       FROM chat_history 
       WHERE user_id = $1 AND course = $2 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [decoded.userId, course]
    )

    let messages: Array<{
      role: string
      content: string
      sources: any
      timestamp: string
    }> = []
    let sessionId: string | null = null

    if (sessionResult.rows.length > 0) {
      sessionId = sessionResult.rows[0].session_id

      // Get messages for this session
      const messagesResult = await pool.query(
        `SELECT role, content, sources, created_at
         FROM chat_history
         WHERE user_id = $1 AND session_id = $2
         ORDER BY created_at ASC
         LIMIT $3`,
        [decoded.userId, sessionId, limit]
      )

      messages = messagesResult.rows.map(row => ({
        role: row.role,
        content: row.content,
        sources: row.sources,
        timestamp: row.created_at
      }))
    }

    return NextResponse.json({
      success: true,
      messages,
      sessionId
    })

  } catch (error) {
    console.error('❌ Error loading chat history:', error)
    
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

/**
 * DELETE /api/chat/history
 * Clear chat history for the current user and course, or delete a specific session
 */
export async function DELETE(request: NextRequest) {
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

    const body = await request.json()
    const { course, sessionId } = body

    if (sessionId) {
      // Delete specific session
      await pool.query(
        `DELETE FROM chat_history 
         WHERE user_id = $1 AND session_id = $2`,
        [decoded.userId, sessionId]
      )

      return NextResponse.json({
        success: true,
        message: 'Session deleted'
      })
    } else if (course) {
      // Delete all chat history for this user and course
      await pool.query(
        `DELETE FROM chat_history 
         WHERE user_id = $1 AND course = $2`,
        [decoded.userId, course]
      )

      return NextResponse.json({
        success: true,
        message: 'Chat history cleared'
      })
    } else {
      return NextResponse.json(
        { error: 'Either sessionId or course is required' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Error clearing chat history:', error)
    
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
