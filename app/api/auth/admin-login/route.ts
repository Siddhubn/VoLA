import { NextRequest, NextResponse } from 'next/server'
import { generateToken, comparePassword } from '@/lib/auth'
import { User } from '@/lib/models/UserPostgres'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find admin user by email
    const user = await User.findByEmail(username)

    if (!user) {
      console.log(`❌ Failed admin login attempt: ${username} (user not found)`)
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log(`❌ Failed admin login attempt: ${username} (not an admin)`)
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password)

    if (!isValidPassword) {
      console.log(`❌ Failed admin login attempt: ${username} (invalid password)`)
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      )
    }

    console.log(`✅ Admin login successful: ${user.name} (${user.email})`)

    // Update last login
    await User.update(user.id, { last_login: new Date() })

    // Generate JWT token for admin
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    // Create response with admin data
    const response = NextResponse.json({
      success: true,
      message: 'Admin login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
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