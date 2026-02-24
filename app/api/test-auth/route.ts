import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(request)
    const user = token ? verifyToken(token) : null

    return NextResponse.json({
      hasToken: !!token,
      token: token ? 'present' : 'missing',
      user: user ? {
        userId: user.userId,
        email: user.email,
        role: user.role
      } : null,
      cookies: Object.fromEntries(request.cookies.entries())
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}