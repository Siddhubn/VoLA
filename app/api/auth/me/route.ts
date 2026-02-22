import { NextResponse } from 'next/server'

// Try MongoDB first, fallback to simple auth
let useSimpleAuth = false

async function tryMongoAuth() {
  try {
    const dbConnect = (await import('@/lib/mongodb')).default
    const User = (await import('@/lib/models/User')).default
    const { getCurrentUser } = await import('@/lib/auth')
    return { dbConnect, User, getCurrentUser }
  } catch (error) {
    console.log('MongoDB not available, using simple auth fallback')
    useSimpleAuth = true
    const { getCurrentUser, findUserById } = await import('@/lib/simple-auth')
    return { getCurrentUser, findUserById }
  }
}

export async function GET() {
  try {
    const authModule = await tryMongoAuth()

    if (useSimpleAuth) {
      // Use simple auth fallback
      const { getCurrentUser, findUserById } = authModule as any
      
      // Get current user from token
      const currentUser = getCurrentUser()
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        )
      }

      // Find user in simple storage
      const user = await findUserById(currentUser.userId)
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: '',
          createdAt: user.createdAt,
          lastLogin: new Date(),
          profile: user.profile
        }
      })

    } else {
      // Use MongoDB
      const { dbConnect, User, getCurrentUser } = authModule as any

      // Get current user from token
      const currentUser = getCurrentUser()
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Not authenticated' },
          { status: 401 }
        )
      }

      // Connect to database
      await dbConnect()

      // Find user in database
      const user = await User.findById(currentUser.userId).select('-password')
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      // Check if user is active
      if (!user.isActive) {
        return NextResponse.json(
          { error: 'Account is deactivated' },
          { status: 401 }
        )
      }

      return NextResponse.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          profile: user.profile
        }
      })
    }

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please check the console for details.' },
      { status: 500 }
    )
  }
}