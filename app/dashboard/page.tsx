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
  PlayCircle,
  ChevronRight,
  ArrowLeft,
  Loader2
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
  moduleNumber?: number
  topics: string[]
  chunkCount: number
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
  const [modules, setModules] = useState<Module[]>([])
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [generatingQuiz, setGeneratingQuiz] = useState(false)
  const [tradeType, setTradeType] = useState<'trade_theory' | 'trade_practical'>('trade_theory')
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([])
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    averageScore: 0,
    totalStudyTime: 0,
    completedModules: 0
  })

  useEffect(() => {
    async function loadData() {
      try {
        // Get user data
        const authResponse = await fetch('/api/auth/me')
        if (authResponse.ok) {
          const authData = await authResponse.json()
          setUser(authData.user)

          // Load modules for user's course
          const userCourse = authData.user.course || 'electrician'
          await loadModules(userCourse, tradeType)

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
                  totalStudyTime: Math.floor(totalTime / 60),
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

  async function loadModules(course: string, type: 'trade_theory' | 'trade_practical') {
    try {
      const response = await fetch(`/api/rag/syllabus/${course}?tradeType=${type}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.modules) {
          setModules(data.modules)
        }
      }
    } catch (error) {
      console.error('Error loading modules:', error)
    }
  }

  async function handleTradeTypeChange(type: 'trade_theory' | 'trade_practical') {
    setTradeType(type)
    setSelectedModule(null)
    setSelectedTopic(null)
    if (user?.course) {
      await loadModules(user.course, type)
    }
  }

  async function handleGenerateQuiz() {
    if (!selectedModule || !selectedTopic || !user) return

    setGeneratingQuiz(true)
    
    // Store quiz data in sessionStorage to avoid long URLs
    const quizData = {
      moduleId: selectedModule.id,
      moduleName: selectedModule.name,
      topic: selectedTopic,
      tradeType: tradeType
    }
    sessionStorage.setItem('pendingQuiz', JSON.stringify(quizData))
    
    try {
      // Navigate with clean URL
      const userCourse = user.course || 'electrician'
      const quizUrl = `/quiz/${userCourse}`
      console.log('Navigating to:', quizUrl)
      router.push(quizUrl)
    } catch (error) {
      console.error('Error generating quiz:', error)
      setGeneratingQuiz(false)
    }
  }

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

  const userCourse = user.course || 'electrician'
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
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <CourseIcon className={`w-5 h-5 ${courseColor === 'yellow' ? 'text-yellow-600' : 'text-blue-600'}`} />
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedModule ? selectedModule.name : `${userCourse === 'electrician' ? 'Electrician' : 'Fitter'} Modules`}
                      </h2>
                    </div>
                    <p className="text-sm text-gray-600">
                      {selectedModule 
                        ? 'Select a topic to generate an AI-powered quiz'
                        : 'Select a module to view topics and start learning'}
                    </p>
                  </div>
                  {selectedModule && (
                    <button
                      onClick={() => {
                        setSelectedModule(null)
                        setSelectedTopic(null)
                      }}
                      className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                  )}
                </div>

                {/* Trade Type Toggle */}
                {!selectedModule && (
                  <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg w-fit">
                    <button
                      onClick={() => handleTradeTypeChange('trade_theory')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        tradeType === 'trade_theory'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Theory
                    </button>
                    <button
                      onClick={() => handleTradeTypeChange('trade_practical')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        tradeType === 'trade_practical'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Practical
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!selectedModule ? (
                  /* Module List */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {modules.map((module) => (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => setSelectedModule(module)}
                        className={`p-4 text-left rounded-lg border-2 transition-all hover:shadow-md ${
                          courseColor === 'yellow'
                            ? 'border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50'
                            : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {module.moduleNumber && (
                                <span className={`px-2 py-1 text-xs font-bold rounded ${
                                  courseColor === 'yellow' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  Module {module.moduleNumber}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">{module.name}</h3>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <FileText className="w-3 h-3" />
                              <span>{module.topics.length} topics</span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Topic List */
                  <div className="space-y-3">
                    {selectedModule.topics.map((topic, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedTopic(topic)}
                        className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                          selectedTopic === topic
                            ? courseColor === 'yellow'
                              ? 'border-yellow-400 bg-yellow-50'
                              : 'border-blue-400 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              selectedTopic === topic
                                ? courseColor === 'yellow'
                                  ? 'bg-yellow-200 text-yellow-700'
                                  : 'bg-blue-200 text-blue-700'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <p className="text-sm text-gray-900 flex-1">{topic}</p>
                          </div>
                          {selectedTopic === topic && (
                            <PlayCircle className={`w-5 h-5 ${
                              courseColor === 'yellow' ? 'text-yellow-600' : 'text-blue-600'
                            }`} />
                          )}
                        </div>
                      </button>
                    ))}

                    {/* Generate Quiz Button */}
                    {selectedTopic && (
                      <div className="pt-4 border-t">
                        <button
                          onClick={handleGenerateQuiz}
                          disabled={generatingQuiz}
                          className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all ${
                            generatingQuiz
                              ? 'bg-gray-400 cursor-not-allowed'
                              : courseColor === 'yellow'
                              ? 'bg-yellow-500 hover:bg-yellow-600'
                              : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                        >
                          {generatingQuiz ? (
                            <span className="flex items-center justify-center space-x-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Generating Quiz...</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center space-x-2">
                              <Brain className="w-5 h-5" />
                              <span>Generate AI Quiz on "{selectedTopic}"</span>
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Quiz History */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-gray-900" />
                  <h3 className="font-semibold text-gray-900">Recent Quizzes</h3>
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
                  <Brain className="w-5 h-5 text-gray-900" />
                  <h3 className="font-semibold text-gray-900">Resources</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => router.push('/chatbot')}
                    className="w-full p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <Brain className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">AI Chatbot</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Ask questions and get instant answers</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/syllabus')}
                    className="w-full p-3 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium">Explore Syllabus</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Browse course modules and topics</p>
                  </button>
                  
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
