'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  Target,
  BarChart3,
  Brain,
  Wrench,
  Zap,
  FileText,
  PlayCircle
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface User {
  id: number
  name: string
  email: string
  role: string
  course?: string
  avatar?: string
  created_at: string
}

interface Module {
  id: string
  name: string
  description: string
}

interface QuizHistory {
  id: number
  course: string
  module: string
  score: number
  totalQuestions: number
  percentage: number
  timeSpent: number
  completedAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([])
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    totalStudyTime: 0,
    completedModules: 0
  })

  // Course-specific modules
  const courseModules: Record<string, Module[]> = {
    fitter: [
      { id: 'safety-signs', name: 'Safety Signs', description: 'Industrial safety symbols and hazard warnings' },
      { id: 'ppe', name: 'PPE', description: 'Personal Protective Equipment usage and safety' },
      { id: 'vernier-calipers', name: 'Vernier Calipers', description: 'Precision measurement techniques' },
      { id: 'micrometers', name: 'Micrometers', description: 'Micrometer parts and measurement' },
      { id: 'filing', name: 'Filing', description: 'Filing techniques and surface finishing' },
      { id: 'drilling', name: 'Drilling', description: 'Drilling operations and safety' },
      { id: 'marking-tools', name: 'Marking Tools', description: 'Layout and marking techniques' }
    ],
    electrician: [
      { id: 'ohms-law', name: "Ohm's Law", description: 'Voltage, current, and resistance relationships' },
      { id: 'wiring-circuits', name: 'Wiring Circuits', description: 'Circuit diagrams and house wiring' },
      { id: 'transformers', name: 'Transformers', description: 'Transformer principles and applications' },
      { id: 'electrical-safety', name: 'Electrical Safety', description: 'Safety rules and shock prevention' },
      { id: 'hand-tools', name: 'Hand Tools', description: 'Electrical hand tools and their usage' }
    ]
  }

  useEffect(() => {
    async function loadData() {
      try {
        // Get user data
        const authResponse = await fetch('/api/auth/me')
        if (authResponse.ok) {
          const authData = await authResponse.json()
          setUser(authData.user)

          // Get quiz history
          const historyResponse = await fetch('/api/quiz/history?limit=10')
          if (historyResponse.ok) {
            const historyData = await historyResponse.json()
            if (historyData.success) {
              setQuizHistory(historyData.history)
              
              // Calculate stats
              const history = historyData.history
              if (history.length > 0) {
                const totalScore = history.reduce((sum: number, q: QuizHistory) => sum + q.percentage, 0)
                const totalTime = history.reduce((sum: number, q: QuizHistory) => sum + q.timeSpent, 0)
                const uniqueModules = new Set(history.map((q: QuizHistory) => q.module))
                
                setStats({
                  totalQuizzes: history.length,
                  averageScore: Math.round(totalScore / history.length),
                  totalStudyTime: Math.floor(totalTime / 60), // Convert to minutes
                  completedModules: uniqueModules.size
                })
              }
            }
          }
        } else {
          router.push('/auth/login')
        }
      } catch (err) {
        console.error('Error loading data:', err)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Get modules for user's course
  const userCourse = user.course || 'fitter'
  const modules = courseModules[userCourse] || courseModules.fitter
  const CourseIcon = userCourse === 'electrician' ? Zap : Wrench
  const courseColor = userCourse === 'electrician' ? 'yellow' : 'blue'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-2 ${courseColor === 'yellow' ? 'bg-yellow-100' : 'bg-blue-100'} rounded-lg`}>
              <CourseIcon className={`w-6 h-6 ${courseColor === 'yellow' ? 'text-yellow-600' : 'text-blue-600'}`} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user.name}! 🎓
              </h1>
              <p className="text-gray-600">
                {userCourse === 'electrician' ? 'Electrician' : 'Fitter'} Course - Master your skills with AI-powered quizzes
              </p>
            </div>
          </div>
          <div className={`p-4 bg-gradient-to-r ${
            courseColor === 'yellow' ? 'from-yellow-50 to-orange-50 border-yellow-200' : 'from-blue-50 to-green-50 border-blue-200'
          } border rounded-lg`}>
            <p className="text-sm text-gray-700">
              🏭 <strong>Your Learning Path:</strong> Complete quizzes to master each module and track your progress on the leaderboard
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
                  <p className="text-sm font-medium text-gray-600">Modules Done</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedModules}/{modules.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Course Modules */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <CourseIcon className={`w-5 h-5 ${courseColor === 'yellow' ? 'text-yellow-600' : 'text-blue-600'}`} />
                      <h2 className="text-xl font-bold text-gray-900">
                        {userCourse === 'electrician' ? 'Electrician' : 'Fitter'} Modules
                      </h2>
                    </div>
                    <p className="text-sm text-gray-600">
                      Select a module to start your AI-powered quiz (5 questions each)
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modules.map((module) => (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => router.push(`/quiz/${userCourse}/${module.id}`)}
                      className={`p-4 text-left rounded-lg border-2 transition-all hover:shadow-md ${
                        courseColor === 'yellow'
                          ? 'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50'
                          : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${
                          courseColor === 'yellow' ? 'bg-yellow-100' : 'bg-blue-100'
                        }`}>
                          <PlayCircle className={`w-5 h-5 ${
                            courseColor === 'yellow' ? 'text-yellow-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{module.name}</h3>
                          <p className="text-xs text-gray-600">{module.description}</p>
                          <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                            <FileText className="w-3 h-3" />
                            <span>5 questions • AI-generated</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Quiz History */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <h3 className="font-semibold">Recent Quizzes</h3>
                </div>
              </CardHeader>
              <CardContent>
                {quizHistory.length > 0 ? (
                  <div className="space-y-3">
                    {quizHistory.slice(0, 5).map((quiz) => (
                      <div key={quiz.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900">{quiz.module}</p>
                          <span className={`text-lg font-bold ${
                            quiz.percentage >= 80 ? 'text-green-600' :
                            quiz.percentage >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {quiz.percentage}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{quiz.score}/{quiz.totalQuestions} correct</span>
                          <span>{formatDate(new Date(quiz.completedAt))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No quizzes taken yet</p>
                    <p className="text-xs mt-1">Start your first quiz!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Learning Resources */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Brain className="w-5 h-5" />
                  <h3 className="font-semibold">Resources</h3>
                </div>
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
                      <span className="text-sm font-medium">Bharat Skills</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Official NSQF resources</p>
                  </a>
                  
                  <button
                    type="button"
                    onClick={() => router.push('/leaderboard')}
                    className="w-full p-3 border border-gray-200 rounded-lg hover:border-green-300 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">View Leaderboard</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">See top performers</p>
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
