'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Clock, Trophy, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'

interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

interface UserAnswer {
  questionIndex: number
  selectedAnswer: number
  isCorrect: boolean
}

export default function QuizPage() {
  const router = useRouter()
  const params = useParams()
  const course = params.course as string
  const module = params.module as string

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)
  const [timeSpent, setTimeSpent] = useState(0)
  const [submitting, setSubmitting] = useState(false)

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
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (user && !generating && questions.length === 0) {
      generateQuiz()
    }
  }, [user])

  const generateQuiz = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course,
          module: module.replace(/-/g, ' '),
          difficulty: 'medium'
        })
      })

      const data = await response.json()
      if (data.success) {
        setQuestions(data.questions)
        setStartTime(Date.now())
      } else {
        alert('Failed to generate quiz: ' + data.error)
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error generating quiz:', error)
      alert('Failed to generate quiz')
      router.push('/dashboard')
    } finally {
      setGenerating(false)
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (!showResult) {
      setSelectedAnswer(answerIndex)
    }
  }

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return

    const isCorrect = selectedAnswer === questions[currentQuestion].correctAnswer
    const newAnswer: UserAnswer = {
      questionIndex: currentQuestion,
      selectedAnswer,
      isCorrect
    }

    setUserAnswers([...userAnswers, newAnswer])
    setShowResult(true)
  }

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    } else {
      completeQuiz()
    }
  }

  const completeQuiz = async () => {
    setSubmitting(true)
    const endTime = Date.now()
    const totalTime = Math.floor((endTime - startTime) / 1000) // in seconds

    const score = userAnswers.filter(a => a.isCorrect).length + 
                  (selectedAnswer === questions[currentQuestion].correctAnswer ? 1 : 0)

    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course,
          module: module.replace(/-/g, ' '),
          score,
          totalQuestions: questions.length,
          timeSpent: totalTime
        })
      })

      const data = await response.json()
      if (data.success) {
        setTimeSpent(totalTime)
        setQuizCompleted(true)
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || generating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">
            {generating ? 'Generating your quiz...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (!user || questions.length === 0) {
    return null
  }

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  const score = userAnswers.filter(a => a.isCorrect).length + 
                (showResult && selectedAnswer === currentQ.correctAnswer ? 1 : 0)

  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100)
    const passed = percentage >= 60

    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <main className="max-w-3xl mx-auto py-8 px-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Quiz Completed!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-6">
                <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center ${
                  passed ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  <Trophy className={`w-16 h-16 ${passed ? 'text-green-600' : 'text-orange-600'}`} />
                </div>

                <div>
                  <h2 className="text-4xl font-bold text-gray-900">{percentage}%</h2>
                  <p className="text-gray-600 mt-2">
                    You scored {score} out of {questions.length}
                  </p>
                </div>

                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <Clock className="w-5 h-5" />
                  <span>Time: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s</span>
                </div>

                <div className={`p-4 rounded-lg ${
                  passed ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
                }`}>
                  {passed ? '🎉 Great job! You passed the quiz!' : '📚 Keep practicing! You can retake the quiz.'}
                </div>

                <div className="flex space-x-4 justify-center">
                  <Button onClick={() => router.push('/dashboard')}>
                    Back to Dashboard
                  </Button>
                  <Button onClick={() => router.push('/leaderboard')} variant="outline">
                    View Leaderboard
                  </Button>
                </div>
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
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>Score: {score}/{questions.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{currentQ.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQ.options.map((option, index) => {
                const isSelected = selectedAnswer === index
                const isCorrect = index === currentQ.correctAnswer
                const showCorrect = showResult && isCorrect
                const showIncorrect = showResult && isSelected && !isCorrect

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showResult}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      showCorrect
                        ? 'border-green-500 bg-green-50'
                        : showIncorrect
                        ? 'border-red-500 bg-red-50'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex-1">{option}</span>
                      {showCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
                      {showIncorrect && <XCircle className="w-5 h-5 text-red-600" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {showResult && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">Explanation:</p>
                <p className="text-sm text-blue-800">{currentQ.explanation}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              {!showResult ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                >
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNextQuestion} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : currentQuestion < questions.length - 1 ? (
                    <>
                      Next Question
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    'Complete Quiz'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
