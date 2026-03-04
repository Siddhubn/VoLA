import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { getChatHistory } from '@/lib/rag/rag-db'

/**
 * GET /api/chat/history
 * Get chat history for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const course = searchParams.get('course') as 'fitter' | 'electrician' | null
    const sessionId = searchParams.get('sessionId')
    const userId = decoded.userId || 1 // Default user ID

    // If sessionId provided, get that specific session
    if (sessionId) {
      const history = await getChatHistory(sessionId, 100)
      
      return NextResponse.json({
        success: true,
        messages: history.map(msg => ({
          role: msg.message_type,
          content: msg.message,
          sources: msg.sources,
          timestamp: msg.created_at
        })),
        sessionId
      })
    }

    // Get the most recent session for this user and course
    if (course) {
      const { query } = await import('@/lib/postgresql')
      const result = await query(`
        SELECT DISTINCT session_id, MAX(created_at) as last_message
        FROM chat_history 
        WHERE user_id = $1 AND course = $2
        GROUP BY session_id
        ORDER BY last_message DESC
        LIMIT 1
      `, [userId, course])

      if (result.rows.length > 0) {
        const latestSessionId = result.rows[0].session_id
        const history = await getChatHistory(latestSessionId, 100)
        
        return NextResponse.json({
          success: true,
          messages: history.map(msg => ({
            role: msg.message_type,
            content: msg.message,
            sources: msg.sources,
            timestamp: msg.created_at
          })),
          sessionId: latestSessionId
        })
      }
    }

    // Otherwise, return empty (no default session)
    return NextResponse.json({
      success: true,
      messages: [],
      sessionId: null
    })

  } catch (error) {
    console.error('Chat history error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load chat history'
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat/history
 * Delete chat history (clear conversation)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { sessionId, course } = body
    const userId = decoded.userId || 1 // Default user ID

    if (sessionId) {
      // Delete specific session
      const { query } = await import('@/lib/postgresql')
      await query(
        'DELETE FROM chat_history WHERE session_id::text = $1',
        [sessionId]
      )
    } else if (course) {
      // Delete all sessions for this user and course
      const { query } = await import('@/lib/postgresql')
      await query(
        'DELETE FROM chat_history WHERE user_id = $1 AND course = $2',
        [userId, course]
      )
    } else {
      return NextResponse.json(
        { success: false, error: 'Session ID or course is required' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Chat history deleted'
    })

  } catch (error) {
    console.error('Delete chat history error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete chat history'
      },
      { status: 500 }
    )
  }
}
