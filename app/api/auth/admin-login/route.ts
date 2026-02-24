import { NextRequest, NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'

// Get admin credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  throw new Error('Admin credentials not configured. Please set ADMIN_USERNAME and ADMIN_PASSWORD in .env.local')
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Check admin credentials
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      console.log(`❌ Failed admin login attempt: ${username}`)
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      )
    }

    console.log(`✅ Admin login successful: ${username}`)

    // Generate JWT token for admin
    const token = generateToken({
      userId: 0, // Special ID for admin
      email: 'admin@vola.system',
      role: 'admin'
    })

    // Create response with admin data
    const response = NextResponse.json({
      success: true,
      message: 'Admin login successful',
      user: {
        id: 0,
        name: 'System Administrator',
        email: 'admin@vola.system',
        role: 'admin',
        avatar: null
      }
    })

    // Set the auth cookie with explicit settings
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: false, // Set to false for localhost
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}