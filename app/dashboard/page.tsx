import { redirect } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  TrendingUp, 
  Users, 
  Target,
  Calendar,
  Award
} from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'

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

async function getUserData() {
  const authModule = await tryMongoAuth()

  if (useSimpleAuth) {
    // Use simple auth fallback
    const { getCurrentUser, findUserById } = authModule as any
    
    const currentUser = getCurrentUser()
    if (!currentUser) {
      redirect('/auth/login')
    }

    const user = await findUserById(currentUser.userId)
    
    if (!user) {
      redirect('/auth/login')
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: '',
      createdAt: user.createdAt,
      lastLogin: new Date(),
      profile: user.profile
    }

  } else {
    // Use MongoDB
    const { dbConnect, User, getCurrentUser } = authModule as any

    const currentUser = getCurrentUser()
    if (!currentUser) {
      redirect('/auth/login')
    }

    await dbConnect()
    const user = await User.findById(currentUser.userId).select('-password')
    
    if (!user || !user.isActive) {
      redirect('/auth/login')
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      profile: user.profile
    }
  }
}

export default async function DashboardPage() {
  const user = await getUserData()

  // Mock data for demonstration
  const stats = {
    totalCourses: 12,
    completedCourses: user.profile.completedCourses || 8,
    totalStudyTime: user.profile.totalStudyTime || 145,
    currentStreak: 7,
    achievements: 15,
    rank: 'Advanced Learner'
  }

  const recentActivity = [
    {
      id: 1,
      type: 'course_completed',
      title: 'JavaScript Fundamentals',
      description: 'Completed with 95% score',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      icon: Trophy
    },
    {
      id: 2,
      type: 'skill_unlocked',
      title: 'React Hooks',
      description: 'New skill unlocked',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      icon: Award
    },
    {
      id: 3,
      type: 'study_session',
      title: 'TypeScript Advanced',
      description: '2 hours of focused learning',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      icon: Clock
    }
  ]

  const upcomingGoals = [
    {
      id: 1,
      title: 'Complete React Course',
      progress: 75,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    },
    {
      id: 2,
      title: 'Master Node.js',
      progress: 30,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: 3,
      title: 'Build Portfolio Project',
      progress: 10,
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.name}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Here's your learning progress and what's coming up next.
          </p>
          {useSimpleAuth && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                ℹ️ Running in demo mode with in-memory storage. Data will be lost on server restart.
              </p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Courses</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedCourses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Study Time</p>
                  <p className="text-2xl font-bold text-gray-900">{formatTime(stats.totalStudyTime)}</p>
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
                  <p className="text-sm font-medium text-gray-600">Current Streak</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.currentStreak} days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest learning achievements and progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const Icon = activity.icon
                    return (
                      <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Icon className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(activity.date)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Learning Goals */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Learning Goals</CardTitle>
                <CardDescription>
                  Track your progress towards your goals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingGoals.map((goal) => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {goal.title}
                        </p>
                        <span className="text-xs text-gray-500">
                          {goal.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        Due {formatDate(goal.dueDate)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Your Rank</CardTitle>
                <CardDescription>
                  Based on your learning activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {stats.rank}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.achievements} achievements unlocked
                  </p>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Member since</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                    {user.lastLogin && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-500">Last active</span>
                        <span className="font-medium text-gray-900">
                          {formatDate(user.lastLogin)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}