'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trophy,
  ArrowLeft,
  Loader2,
  Brain,
  Target
} from 'lucide-react'

interface User {
  id: number
  name: string
  email: string
  role: string
  course?: string
}

interface Question {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

interface Quiz {
  course: string
  module: string
  topic: string
  tradeType: string
  questions: Question[]
  totalQuestions: number
}

export default function QuizPage({ params }: { params: Promise<{ course: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showResults, setShowResults] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)
  const [timeSpent, setTimeSpent] = useState(0)
  const [course, setCourse] = useState<string>('')
  const [quizParams, setQuizParams] = useState<{
    module: string
    topic: string
    tradeType: string
  } | null>(null)

  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = await params
      setCourse(resolvedParams.course)
      
      // Get quiz data from sessionStorage
      const pendingQuiz = sessionStorage.getItem('pendingQuiz')
      if (pendingQuiz) {
        const data = JSON.parse(pendingQuiz)
        setQuizParams({
          module: data.moduleId,
          topic: data.topic,
          tradeType: data.tradeType
        })
        // Clear after reading
        sessionStorage.removeItem('pendingQuiz')
      }
    }
    resolveParams()
  }, [params])

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          router.push('/auth/login')
        }
      } catch (err) {
        console.error('Error loading user:', err)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  useEffect(() => {
    if (user && quizParams && course && !quiz && !generating) {
      generateQuiz()
    }
  }, [user, quizParams, course])

  async function generateQuiz() {
    if (!quizParams || !course) return

    setGenerating(true)
    try {
      const response = await fetch('/api/quiz/generate-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: course,
          module: quizParams.module,
          topic: quizParams.topic,
          tradeType: quizParams.tradeType,
          questionCount: 5
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setQuiz(data.quiz)
          setStartTime(Date.now())
          setSelectedAnswers(new Array(data.quiz.questions.length).fill(-1))
        }
      } else {
        const error = await response.json()
        alert(`Error generating quiz: ${error.error}`)
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error generating quiz:', error)
      alert('Failed to generate quiz. Please try again.')
      router.push('/dashboard')
    } finally {
      setGenerating(false)
    }
  }

  function handleAnswerSelect(answerIndex: number) {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestion] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  function handleNext() {
    if (currentQuestion < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  function handlePrevious() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  async function handleSubmit() {
    if (!quiz) return

    const endTime = Date.now()
    const timeSpentSeconds = Math.floor((endTime - startTime) / 1000)
    setTimeSpent(timeSpentSeconds)

    // Calculate score
    const correctCount = quiz.questions.reduce((count, question, index) => {
      return count + (selectedAnswers[index] === question.correctAnswer ? 1 : 0)
    }, 0)

    const percentage = Math.round((correctCount / quiz.questions.length) * 100)

    // Save quiz result
    try {
      await fetch('/api/quiz/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course: quiz.course,
          module: quiz.topic, // Use topic as module name for display
          score: correctCount,
          totalQuestions: quiz.questions.length,
          percentage,
          timeSpent: timeSpentSeconds
        })
      })
    } catch (error) {
      console.error('Error saving quiz result:', error)
    }

    setShowResults(true)
  }

  if (loading || generating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {generating ? 'Generating your AI-powered quiz...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user || !quiz) {
    return null
  }

  // Safety check for current question
  if (!quiz.questions || !quiz.questions[currentQuestion]) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Error loading quiz questions</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const currentQ = quiz.questions[currentQuestion]
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100

  if (showResults) {
    const correctCount = quiz.questions.reduce((count, question, index) => {
      return count + (selectedAnswers[index] === question.correctAnswer ? 1 : 0)
    }, 0)
    const percentage = Math.round((correctCount / quiz.questions.length) * 100)

    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        
        <main className="max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardHeader>
              <div className="text-center">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h1>
                <p className="text-gray-600">{quiz.topic}</p>
              </div>
            </CardHeader>
            <CardContent>
              {/* Score Summary */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Score</p>
                  <p className="text-3xl font-bold text-blue-600">{percentage}%</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Correct</p>
                  <p className="text-3xl font-bold text-green-600">{correctCount}/{quiz.questions.length}</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Time</p>
                  <p className="text-3xl font-bold text-purple-600">{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</p>
                </div>
              </div>

              {/* Question Review */}
              <div className="space-y-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900">Review Your Answers</h3>
                {quiz.questions.map((question, index) => {
                  const isCorrect = selectedAnswers[index] === question.correctAnswer
                  const userAnswer = selectedAnswers[index]
                  const correctAnswerText = question.options[question.correctAnswer]

                  return (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start space-x-3 mb-3">
                        {isCorrect ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-2">
                            {index + 1}. {question.question}
                          </p>
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => {
                              const isUserAnswer = userAnswer === optIndex
                              const isCorrectAnswer = question.correctAnswer === optIndex

                              return (
                                <div
                                  key={optIndex}
                                  className={`p-2 rounded text-sm ${
                                    isCorrectAnswer
                                      ? 'bg-green-100 text-green-900 font-medium'
                                      : isUserAnswer
                                      ? 'bg-red-100 text-red-900'
                                      : 'bg-gray-50 text-gray-700'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {option}
                                  {isCorrectAnswer && ' ✓ Correct Answer'}
                                  {isUserAnswer && !isCorrectAnswer && ' ✗ Your Answer'}
                                </div>
                              )
                            })}
                          </div>
                          <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-900">
                            <p className="font-medium mb-1">
                              {isCorrect ? '✓ Correct!' : `✗ Incorrect - The correct answer is: ${correctAnswerText}`}
                            </p>
                            <p className="font-medium mb-1">Explanation:</p>
                            <p>{question.explanation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Actions */}
              <div className="flex space-x-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={() => {
                    setQuiz(null)
                    setCurrentQuestion(0)
                    setSelectedAnswers([])
                    setShowResults(false)
                    generateQuiz()
                  }}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Try Another Quiz
                </button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <main className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{quiz.topic}</h1>
              <p className="text-gray-600">
                Question {currentQuestion + 1} of {quiz.questions.length}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Brain className="w-5 h-5" />
              <span className="text-sm">AI-Generated Quiz</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {currentQ.question}
            </h2>

            <div className="space-y-3">
              {currentQ.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    selectedAnswers[currentQuestion] === index
                      ? 'border-blue-500 bg-blue-50 text-gray-900'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                      selectedAnswers[currentQuestion] === index
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="flex-1 text-gray-900">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          {currentQuestion === quiz.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={selectedAnswers.includes(-1)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Target className="w-5 h-5" />
              <span>Submit Quiz</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={selectedAnswers[currentQuestion] === -1}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next Question
            </button>
          )}
        </div>

        {/* Answer Status */}
        <div className="mt-6 flex justify-center space-x-2">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                index === currentQuestion
                  ? 'bg-blue-600 text-white'
                  : selectedAnswers[index] !== -1
                  ? 'bg-green-200 text-green-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
