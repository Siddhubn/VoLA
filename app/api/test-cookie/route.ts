import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request)
    const user = token ? verifyToken(token) : null

    // Get all cookies manually
    const cookieHeader = request.headers.get('cookie') || ''
    const cookies: Record<string, string> = {}
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      if (name) cookies[name] = value || ''
    })

    return NextResponse.json({
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : null,
      user: user ? {
        userId: user.userId,
        email: user.email,
        role: user.role
      } : null,
      cookies: cookies,
      headers: {
        cookie: cookieHeader,
        userAgent: request.headers.get('user-agent')
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}