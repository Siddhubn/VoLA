import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { getUserChatSessions } from '@/lib/rag/rag-db'

/**
 * GET /api/chat/sessions
 * Get list of chat sessions for the current user
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

    const userId = parseInt(decoded.userId)
    const { searchParams } = new URL(request.url)
    const course = searchParams.get('course')

    // Get user's chat sessions
    const sessions = await getUserChatSessions(userId, 20)

    // Get first message for each session as preview
    const { query } = await import('@/lib/postgresql')
    const sessionsWithPreview = await Promise.all(
      sessions.map(async (session) => {
        const firstMessage = await query(
          `SELECT message FROM chat_history 
           WHERE session_id::text = $1 AND message_type = 'user'
           ORDER BY created_at ASC 
           LIMIT 1`,
          [session.session_id]
        )

        return {
          sessionId: session.session_id,
          course: course || 'electrician', // Default to electrician
          startedAt: session.last_message,
          lastMessageAt: session.last_message,
          messageCount: session.message_count,
          preview: firstMessage.rows[0]?.message || 'New conversation'
        }
      })
    )

    return NextResponse.json({
      success: true,
      sessions: sessionsWithPreview
    })

  } catch (error) {
    console.error('Chat sessions error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load chat sessions'
      },
      { status: 500 }
    )
  }
}
