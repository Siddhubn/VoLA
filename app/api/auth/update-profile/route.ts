import { NextRequest, NextResponse } from 'next/server'
import { User } from '@/lib/models/UserPostgres'
import { verifyToken } from '@/lib/simple-auth'

export async function PUT(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, email, course } = body

    // Validate input
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if email is already taken by another user
    if (email !== decoded.email) {
      const existingUser = await User.findByEmail(email)
      if (existingUser && existingUser.id !== Number(decoded.userId)) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        )
      }
    }

    // Update user
    const updatedUser = await User.update(Number(decoded.userId), {
      name,
      email: email.toLowerCase()
    })

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Update course if provided
    if (course) {
      await User.update(Number(decoded.userId), { course } as any)
    }

    // Get updated user data
    const user = await User.findByIdSafe(Number(decoded.userId))

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        role: user?.role,
        course: (user as any)?.course,
        avatar: user?.avatar,
        created_at: user?.created_at
      }
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
