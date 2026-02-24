'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  Users, 
  BookOpen, 
  Shield, 
  Activity,
  Database,
  Settings,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  UserX,
  Clock,
  BarChart3,
  PieChart,
  Monitor,
  Server,
  Headphones,
  Brain
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface User {
  id: number
  name: string
  email: string
  role: string
  avatar?: string
  created_at: string
  is_active: boolean
  last_login?: string
}

interface AdminData {
  admin: {
    id: number
    name: string
    email: string
    role: string
    avatar?: string
  }
  stats: {
    totalUsers: number
    activeUsers: number
    inactiveUsers: number
    recentUsers: User[]
  }
}

interface SystemMetrics {
  totalCourses: number
  totalLessons: number
  completionRate: number
  averageStudyTime: number
  popularCourses: Array<{
    id: number
    title: string
    enrollments: number
    completionRate: number
  }>
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkAdminAuth() {
      try {
        console.log('Checking admin authentication...')
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        })
        
        console.log('Auth response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('User data:', data.user)
          
          if (data.user.role !== 'admin') {
            console.log('❌ Not an admin, redirecting to /master')
            setError('Admin access required')
            setTimeout(() => router.push('/master'), 1000)
            return
          }

          console.log('✅ Admin authenticated')

          // Get admin stats
          const statsResponse = await fetch('/api/admin/stats', {
            credentials: 'include'
          })
          let stats = {
            totalUsers: 0,
            activeUsers: 0,
            inactiveUsers: 0,
            recentUsers: []
          }

          if (statsResponse.ok) {
            const statsData = await statsResponse.json()
            stats = statsData
          }

          setAdminData({
            admin: data.user,
            stats
          })

          // Mock system metrics
          setSystemMetrics({
            totalCourses: 25,
            totalLessons: 340,
            completionRate: 78,
            averageStudyTime: 145,
            popularCourses: [
              {
                id: 1,
                title: 'Introduction to Voice Learning',
                enrollments: 156,
                completionRate: 85
              },
              {
                id: 2,
                title: 'Advanced Audio Processing',
                enrollments: 89,
                completionRate: 72
              },
              {
                id: 3,
                title: 'Machine Learning for Speech',
                enrollments: 67,
                completionRate: 65
              }
            ]
          })
        } else {
          console.log('❌ Not authenticated, redirecting to /master')
          setError('Please login as admin')
          setTimeout(() => router.push('/master'), 1000)
        }
      } catch (err) {
        console.error('Admin auth check failed:', err)
        setError('Authentication check failed')
        setTimeout(() => router.push('/master'), 1000)
      } finally {
        setLoading(false)
      }
    }

    checkAdminAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !adminData || !systemMetrics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Admin access required.</p>
            <div className="mt-4">
              <button 
                onClick={() => router.push('/master')}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Go to Admin Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { admin, stats } = adminData

  const systemHealth = {
    uptime: '99.9%',
    responseTime: '45ms',
    dbConnections: 12,
    memoryUsage: '2.1GB',
    cpuUsage: '15%',
    diskUsage: '45%'
  }

  const recentActivity = [
    {
      id: 1,
      type: 'user_registered',
      description: 'New user registration',
      user: 'john.doe@example.com',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      severity: 'info'
    },
    {
      id: 2,
      type: 'course_completed',
      description: 'Course completion milestone reached',
      user: 'jane.smith@example.com',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      severity: 'success'
    },
    {
      id: 3,
      type: 'login_attempt',
      description: 'Failed login attempt detected',
      user: 'suspicious@email.com',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      severity: 'warning'
    },
    {
      id: 4,
      type: 'system_backup',
      description: 'Database backup completed successfully',
      user: 'system',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      severity: 'success'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={admin} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Admin Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                VoLA Admin Dashboard
              </h1>
              <p className="text-gray-600">
                System overview and user management
              </p>
            </div>
          </div>
          <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              🔒 <strong>Administrator Access:</strong> You have full system privileges. All actions are logged for security.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{systemMetrics.totalCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{systemMetrics.completionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Users & Popular Courses */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Recent User Registrations</span>
                </CardTitle>
                <CardDescription>
                  Latest users who joined the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentUsers.length > 0 ? (
                    stats.recentUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {user.role}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(new Date(user.created_at))}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No recent users found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Popular Courses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5" />
                  <span>Popular Courses</span>
                </CardTitle>
                <CardDescription>
                  Most enrolled and completed courses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemMetrics.popularCourses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{course.title}</h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{course.enrollments} enrollments</span>
                          <span>{course.completionRate}% completion</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{course.completionRate}%</div>
                        <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${course.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* System Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>System Activity</span>
                </CardTitle>
                <CardDescription>
                  Recent system events and alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`p-1 rounded-full ${
                        activity.severity === 'success' ? 'bg-green-100' :
                        activity.severity === 'warning' ? 'bg-yellow-100' :
                        activity.severity === 'error' ? 'bg-red-100' :
                        'bg-blue-100'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          activity.severity === 'success' ? 'bg-green-500' :
                          activity.severity === 'warning' ? 'bg-yellow-500' :
                          activity.severity === 'error' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.user} • {formatDate(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Monitor className="w-5 h-5" />
                  <span>System Health</span>
                </CardTitle>
                <CardDescription>
                  Current system performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Uptime</span>
                    <span className="text-sm font-medium text-green-600">{systemHealth.uptime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Response Time</span>
                    <span className="text-sm font-medium text-green-600">{systemHealth.responseTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Memory Usage</span>
                    <span className="text-sm font-medium text-blue-600">{systemHealth.memoryUsage}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">CPU Usage</span>
                    <span className="text-sm font-medium text-orange-600">{systemHealth.cpuUsage}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">DB Connections</span>
                    <span className="text-sm font-medium text-purple-600">{systemHealth.dbConnections}</span>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">All systems operational</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <button className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>Manage Users</span>
                  </button>
                  <button className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center space-x-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Manage Courses</span>
                  </button>
                  <button className="w-full px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>View Analytics</span>
                  </button>
                  <button className="w-full px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span>Database Backup</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}