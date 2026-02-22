import { NextRequest, NextResponse } from 'next/server'
import { validateEmail } from '@/lib/utils'

// Try MongoDB first, fallback to simple auth
let useSimpleAuth = false

async function tryMongoAuth() {
  try {
    const dbConnect = (await import('@/lib/mongodb')).default
    const User = (await import('@/lib/models/User')).default
    const { comparePassword, generateToken, setAuthCookie } = await import('@/lib/auth')
    return { dbConnect, User, comparePassword, generateToken, setAuthCookie }
  } catch (error) {
    console.log('MongoDB not available, using simple auth fallback')
    useSimpleAuth = true
    const { findUserByEmail, comparePassword, generateToken, setAuthCookie } = await import('@/lib/simple-auth')
    return { findUserByEmail, comparePassword, generateToken, setAuthCookie }
  }
}

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

    const authModule = await tryMongoAuth()

    let user: any

    if (useSimpleAuth) {
      // Use simple auth fallback
      const { findUserByEmail, comparePassword, generateToken, setAuthCookie } = authModule as any
      
      user = await findUserByEmail(email)
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
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
        lastLogin: new Date(),
        profile: user.profile
      }

      return NextResponse.json({
        message: 'Login successful (simple auth)',
        user: userData
      })

    } else {
      // Use MongoDB
      const { dbConnect, User, comparePassword, generateToken, setAuthCookie } = authModule as any

      // Connect to database
      await dbConnect()

      // Find user
      user = await User.findOne({ email: email.toLowerCase() })
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Check if user is active
      if (!user.isActive) {
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
      user.lastLogin = new Date()
      await user.save()

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
        lastLogin: user.lastLogin,
        profile: user.profile
      }

      return NextResponse.json({
        message: 'Login successful',
        user: userData
      })
    }

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please check the console for details.' },
      { status: 500 }
    )
  }
}