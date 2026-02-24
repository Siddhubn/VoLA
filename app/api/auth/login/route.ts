import { NextRequest, NextResponse } from 'next/server'
import { validateEmail } from '@/lib/utils'
import { User } from '@/lib/models/UserPostgres'
import { comparePassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Find user
    const user = await User.findByEmail(email)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact support.' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login
    await User.updateLastLogin(user.id)

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    console.log('✅ Login successful for:', user.email, 'Role:', user.role)

    // Return user data (without password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      lastLogin: new Date(),
      profile: {
        bio: user.bio,
        skills: user.skills,
        learningGoals: user.learning_goals,
        completedCourses: user.completed_courses,
        totalStudyTime: user.total_study_time
      }
    }

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: userData
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
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please check the console for details.' },
      { status: 500 }
    )
  }
}