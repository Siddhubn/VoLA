'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  TrendingUp,
  Calendar,
  Award,
  Target,
  Users,
  PlayCircle,
  CheckCircle,
  Star,
  BarChart3,
  Brain,
  Wrench,
  Zap,
  HardHat,
  Settings,
  FileText,
  HelpCircle
} from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'

interface User {
  id: number
  name: string
  email: string
  role: string
  avatar?: string
  createdAt: string
  lastLogin?: string
  profile: {
    bio?: string
    skills: string[]
    learningGoals: string[]
    completedCourses: number
    totalStudyTime: number
    selectedTrade?: string
  }
}

interface Trade {
  id: string
  name: string
  icon: any
  description: string
  modules: string[]
  color: string
}

interface QuizAttempt {
  id: number
  trade: string
  module: string
  score: number
  totalQuestions: number
  completedAt: string
  timeSpent: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ITI Trades and Modules
  const trades: Trade[] = [
    {
      id: 'fitter',
      name: 'Fitter',
      icon: Wrench,
      description: 'Mechanical fitting, assembly, and maintenance',
      modules: ['Safety Practices', 'Hand Tools', 'Measuring Tools', 'Filing & Drilling', 'Marking Tools'],
      color: 'blue'
    },
    {
      id: 'electrician',
      name: 'Electrician',
      icon: Zap,
      description: 'Electrical installation, wiring, and maintenance',
      modules: ['Electrical Safety', 'Basic Electricity', 'Wiring Circuits', 'Transformers', 'Hand Tools'],
      color: 'yellow'
    },
    {
      id: 'welder',
      name: 'Welder',
      icon: HardHat,
      description: 'Welding techniques and metal fabrication',
      modules: ['Welding Safety', 'Arc Welding', 'Gas Welding', 'Metal Preparation', 'Joint Types'],
      color: 'orange'
    }
  ]

  // Mock quiz history - In real app, this would come from API
  const [recentQuizzes] = useState<QuizAttempt[]>([
    {
      id: 1,
      trade: 'Fitter',
      module: 'Safety Practices',
      score: 8,
      totalQuestions: 10,
      completedAt: '2024-02-23T10:30:00Z',
      timeSpent: 12
    },
    {
      id: 2,
      trade: 'Electrician',
      module: 'Basic Electricity',
      score: 7,
      totalQuestions: 10,
      completedAt: '2024-02-22T15:45:00Z',
      timeSpent: 15
    },
    {
      id: 3,
      trade: 'Fitter',
      module: 'Hand Tools',
      score: 9,
      totalQuestions: 10,
      completedAt: '2024-02-21T09:15:00Z',
      timeSpent: 10
    }
  ])

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          router.push('/auth/login')
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your ITI dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Please log in to access your learning dashboard.</p>
            <div className="mt-4">
              <button 
                onClick={() => router.push('/auth/login')}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Go to Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = {
    totalQuizzes: recentQuizzes.length,
    averageScore: Math.round(recentQuizzes.reduce((acc, quiz) => acc + (quiz.score / quiz.totalQuestions * 100), 0) / recentQuizzes.length),
    totalStudyTime: recentQuizzes.reduce((acc, quiz) => acc + quiz.timeSpent, 0),
    bestScore: Math.max(...recentQuizzes.map(quiz => quiz.score / quiz.totalQuestions * 100)),
    completedModules: [...new Set(recentQuizzes.map(quiz => quiz.module))].length,
    currentStreak: 3
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user.name}! 🎓
              </h1>
              <p className="text-gray-600">
                Continue your ITI learning journey with AI-powered quizzes
              </p>
            </div>
          </div>
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              🏭 <strong>ITI Quiz & Learning Assistant:</strong> Master vocational skills with personalized AI tutoring and interactive assessments
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Quizzes Taken</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
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
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
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
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStudyTime} min</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Target className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Modules</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedModules}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Trade Selection & Modules */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Select Your Trade & Module</span>
                </CardTitle>
                <CardDescription>
                  Choose your vocational trade and start practicing with AI-generated quizzes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {trades.map((trade) => {
                    const Icon = trade.icon
                    return (
                      <div key={trade.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-start space-x-4">
                          <div className={`p-3 rounded-lg ${
                            trade.color === 'blue' ? 'bg-blue-100' :
                            trade.color === 'yellow' ? 'bg-yellow-100' :
                            'bg-orange-100'
                          }`}>
                            <Icon className={`w-6 h-6 ${
                              trade.color === 'blue' ? 'text-blue-600' :
                              trade.color === 'yellow' ? 'text-yellow-600' :
                              'text-orange-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{trade.name}</h3>
                            <p className="text-sm text-gray-600 mb-3">{trade.description}</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {trade.modules.map((module) => (
                                <button
                                  key={module}
                                  className={`px-3 py-2 text-sm rounded border transition-colors hover:bg-blue-50 hover:border-blue-300 ${
                                    trade.color === 'blue' ? 'border-blue-200 text-blue-700' :
                                    trade.color === 'yellow' ? 'border-yellow-200 text-yellow-700' :
                                    'border-orange-200 text-orange-700'
                                  }`}
                                  onClick={() => {
                                    // Navigate to quiz for this trade and module
                                    router.push(`/quiz/${trade.id}/${module.toLowerCase().replace(/\s+/g, '-')}`)
                                  }}
                                >
                                  {module}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Quiz History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Recent Quizzes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentQuizzes.map((quiz) => (
                    <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{quiz.trade}</p>
                        <p className="text-xs text-gray-600">{quiz.module}</p>
                        <p className="text-xs text-gray-500">{formatDate(new Date(quiz.completedAt))}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          quiz.score / quiz.totalQuestions >= 0.8 ? 'text-green-600' :
                          quiz.score / quiz.totalQuestions >= 0.6 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {quiz.score}/{quiz.totalQuestions}
                        </div>
                        <p className="text-xs text-gray-500">{quiz.timeSpent} min</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Learning Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5" />
                  <span>Learning Resources</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <a 
                    href="https://bharatskills.gov.in/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">Bharat Skills Portal</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Official NSQF curriculum and resources</p>
                  </a>
                  
                  <a 
                    href="https://nimilearningonline.in/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">NIMI Learning</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">E-learning materials for ITIs</p>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* AI Learning Assistant */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5" />
                  <span>AI Assistant</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Get instant explanations, hints, and personalized feedback during quizzes
                  </p>
                  <button className="w-full px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
                    Ask AI Tutor
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