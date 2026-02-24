import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokenFromRequest, verifyToken } from '@/lib/auth'
import { User } from '@/lib/models/UserPostgres'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const token = getAuthTokenFromRequest(request)
    const user = token ? verifyToken(token) : null

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get admin statistics
    const totalUsers = await User.getTotalCount()
    const activeUsers = await User.getActiveCount()
    const recentUsers = await User.getRecentUsers(10)
    
    // Get course counts
    const fitterCount = await User.getCourseCount('fitter')
    const electricianCount = await User.getCourseCount('electrician')

    return NextResponse.json({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      recentUsers,
      fitterCount,
      electricianCount
    })

  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}