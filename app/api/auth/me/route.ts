import { NextRequest, NextResponse } from 'next/server'
import { User } from '@/lib/models/UserPostgres'
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get current user from token
    const token = getAuthTokenFromRequest(request)
    const currentUser = token ? verifyToken(token) : null
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Find user in database
    const user = await User.findByIdSafe(currentUser.userId)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        course: (user as any).course,
        avatar: user.avatar,
        createdAt: user.created_at,
        created_at: user.created_at,
        lastLogin: user.last_login,
        profile: {
          bio: user.bio,
          skills: user.skills,
          learningGoals: user.learning_goals,
          completedCourses: user.completed_courses,
          totalStudyTime: user.total_study_time
        }
      }
    })

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please check the console for details.' },
      { status: 500 }
    )
  }
}