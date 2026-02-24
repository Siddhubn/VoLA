'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Trophy, Medal, Award, Wrench, Zap, TrendingUp } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  userId: number
  name: string
  course: string
  totalScore: number
  totalQuizzes: number
  averageScore: number
  bestScore: number
  lastQuizAt: string
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [filter, setFilter] = useState<'all' | 'fitter' | 'electrician'>('all')

  useEffect(() => {
    async function loadData() {
      try {
        const authResponse = await fetch('/api/auth/me')
        if (authResponse.ok) {
          const authData = await authResponse.json()
          setUser(authData.user)
        } else {
          router.push('/auth/login')
          return
        }

        await fetchLeaderboard()
      } catch (err) {
        console.error('Error loading data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const fetchLeaderboard = async (courseFilter?: string) => {
    try {
      const url = courseFilter 
        ? `/api/leaderboard?course=${courseFilter}`
        : '/api/leaderboard'
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setLeaderboard(data.leaderboard)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    }
  }

  const handleFilterChange = (newFilter: 'all' | 'fitter' | 'electrician') => {
    setFilter(newFilter)
    fetchLeaderboard(newFilter === 'all' ? undefined : newFilter)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />
    if (rank === 3) return <Award className="w-6 h-6 text-orange-600" />
    return <span className="text-lg font-bold text-gray-600">#{rank}</span>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <main className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Global Leaderboard</h1>
          <p className="text-gray-600">Top performers across all ITI quizzes</p>
        </div>

        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          <button
            type="button"
            onClick={() => handleFilterChange('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Courses
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('fitter')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              filter === 'fitter'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Fitter</span>
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('electrician')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              filter === 'electrician'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Electrician</span>
          </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Top Performers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length > 0 ? (
              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      entry.userId === user.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 flex justify-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{entry.name}</p>
                          {entry.userId === user.id && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">You</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                          {entry.course === 'fitter' ? (
                            <span className="flex items-center space-x-1">
                              <Wrench className="w-3 h-3" />
                              <span>Fitter</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1">
                              <Zap className="w-3 h-3" />
                              <span>Electrician</span>
                            </span>
                          )}
                          <span>•</span>
                          <span>{entry.totalQuizzes} quizzes</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{entry.totalScore}</p>
                      <p className="text-xs text-gray-500">total points</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No leaderboard entries yet</p>
                <p className="text-sm mt-2">Be the first to take a quiz!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
