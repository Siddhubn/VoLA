import { NextRequest, NextResponse } from 'next/server'
import { validateEmail, validatePassword } from '@/lib/utils'

// Try MongoDB first, fallback to simple auth
let useSimpleAuth = false

async function tryMongoAuth() {
  try {
    const dbConnect = (await import('@/lib/mongodb')).default
    const User = (await import('@/lib/models/User')).default
    const { hashPassword, generateToken, setAuthCookie } = await import('@/lib/auth')
    return { dbConnect, User, hashPassword, generateToken, setAuthCookie }
  } catch (error) {
    console.log('MongoDB not available, using simple auth fallback')
    useSimpleAuth = true
    const { createUser, generateToken, setAuthCookie } = await import('@/lib/simple-auth')
    return { createUser, generateToken, setAuthCookie }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role = 'student' } = await request.json()

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
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

    const authModule = await tryMongoAuth()

    let user: any
    let userId: string

    if (useSimpleAuth) {
      // Use simple auth fallback
      const { createUser, generateToken, setAuthCookie } = authModule as any
      
      try {
        user = await createUser({ name, email, password, role })
        userId = user.id
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          return NextResponse.json(
            { error: 'User with this email already exists' },
            { status: 409 }
          )
        }
        throw error
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role
      })

      // Set cookie
      setAuthCookie(token)

      // Return user data (without password)
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: '',
        createdAt: user.createdAt,
        profile: user.profile
      }

      return NextResponse.json({
        message: 'User registered successfully (simple auth)',
        user: userData
      }, { status: 201 })

    } else {
      // Use MongoDB
      const { dbConnect, User, hashPassword, generateToken, setAuthCookie } = authModule as any

      // Connect to database
      await dbConnect()

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() })
      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        )
      }

      // Hash password
      const hashedPassword = await hashPassword(password)

      // Create user
      user = await User.create({
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        profile: {
          skills: [],
          learningGoals: [],
          completedCourses: 0,
          totalStudyTime: 0
        }
      })

      // Generate JWT token
      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      })

      // Set cookie
      setAuthCookie(token)

      // Return user data (without password)
      const userData = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
        profile: user.profile
      }

      return NextResponse.json({
        message: 'User registered successfully',
        user: userData
      }, { status: 201 })
    }

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please check the console for details.' },
      { status: 500 }
    )
  }
}