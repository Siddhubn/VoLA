import { NextRequest, NextResponse } from 'next/server'
import { validateEmail, validatePassword } from '@/lib/utils'
import { ensureDatabaseReady } from '@/lib/db-health'
import { User } from '@/lib/models/UserPostgres'
import { hashPassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role = 'student', course } = await request.json()

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (!course) {
      return NextResponse.json(
        { error: 'Please select a course (Fitter or Electrician)' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      )
    }

    // Ensure database is ready
    await ensureDatabaseReady()

    // Check if user already exists
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      course,
      skills: [],
      learning_goals: []
    })

    console.log(`✅ User registered: ${user.name} (${user.email}) - ID: ${user.id}`)

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    // Return user data (without password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.created_at,
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
      message: 'User registered successfully',
      user: userData
    }, { status: 201 })

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

  } catch (error: any) {
    console.error('Registration error:', error)
    
    // Provide more specific error messages
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'Database connection failed. Please ensure PostgreSQL is running.' },
        { status: 503 }
      )
    } else if (error.code === '3D000') {
      return NextResponse.json(
        { error: 'Database does not exist. Please run: npm run init-db' },
        { status: 503 }
      )
    } else if (error.code === '28P01') {
      return NextResponse.json(
        { error: 'Database authentication failed. Please check your DATABASE_URL.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error. Please check the console for details.' },
      { status: 500 }
    )
  }
}