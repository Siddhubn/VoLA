'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { SyllabusExplorer } from '@/components/SyllabusExplorer'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Wrench, Zap } from 'lucide-react'

interface User {
  id: number
  name: string
  email: string
  role: string
  course?: string
}

export default function SyllabusPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<'fitter' | 'electrician' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          // Set default course from user profile
          if (data.user.course) {
            setSelectedCourse(data.user.course as 'fitter' | 'electrician')
          } else {
            setSelectedCourse('fitter') // Default to fitter
          }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !selectedCourse) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Course Selector */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Select Course
                </h2>
                <p className="text-sm text-gray-600">
                  Choose which course syllabus to explore
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant={selectedCourse === 'fitter' ? 'default' : 'outline'}
                  onClick={() => setSelectedCourse('fitter')}
                  className="flex items-center"
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Fitter
                </Button>
                <Button
                  variant={selectedCourse === 'electrician' ? 'default' : 'outline'}
                  onClick={() => setSelectedCourse('electrician')}
                  className="flex items-center"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Electrician
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Syllabus Explorer */}
        <SyllabusExplorer course={selectedCourse} />
      </main>
    </div>
  )
}
