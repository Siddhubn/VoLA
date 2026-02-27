import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/postgresql'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get total users (excluding admins)
    const totalUsersResult = await query('SELECT COUNT(*) as count FROM users WHERE role != $1', ['admin'])
    const totalUsers = parseInt(totalUsersResult.rows[0].count)

    // Get active users (excluding admins)
    const activeUsersResult = await query('SELECT COUNT(*) as count FROM users WHERE is_active = true AND role != $1', ['admin'])
    const activeUsers = parseInt(activeUsersResult.rows[0].count)

    // Get inactive users
    const inactiveUsers = totalUsers - activeUsers

    // Get recent users (last 10, excluding admins)
    const recentUsersResult = await query(`
      SELECT id, name, email, role, course, avatar, created_at, is_active, last_login
      FROM users 
      WHERE role != $1
      ORDER BY created_at DESC 
      LIMIT 10
    `, ['admin'])
    const recentUsers = recentUsersResult.rows

    // Get course counts (excluding admins)
    const fitterCountResult = await query(`
      SELECT COUNT(*) as count FROM users WHERE course = 'fitter' AND role != $1
    `, ['admin'])
    const fitterCount = parseInt(fitterCountResult.rows[0].count)

    const electricianCountResult = await query(`
      SELECT COUNT(*) as count FROM users WHERE course = 'electrician' AND role != $1
    `, ['admin'])
    const electricianCount = parseInt(electricianCountResult.rows[0].count)

    return NextResponse.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      recentUsers,
      fitterCount,
      electricianCount
    })

  } catch (error: any) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    )
  }
}
