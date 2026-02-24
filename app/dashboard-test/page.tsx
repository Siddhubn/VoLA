'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface User {
  id: number
  name: string
  email: string
  role: string
}

export default function DashboardTestPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          setError('Not authenticated')
        }
      } catch (err) {
        setError('Failed to check authentication')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
            <div className="mt-4">
              <a 
                href="/auth/login" 
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Go to Login
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Test - Authentication Working!</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <strong>User ID:</strong> {user?.id}
              </div>
              <div>
                <strong>Name:</strong> {user?.name}
              </div>
              <div>
                <strong>Email:</strong> {user?.email}
              </div>
              <div>
                <strong>Role:</strong> {user?.role}
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <p className="text-green-600 font-medium">
                ✅ Authentication is working correctly!
              </p>
              <p className="text-sm text-gray-600 mt-2">
                If you can see this page with your user data, the login system is functioning properly.
              </p>
            </div>

            <div className="mt-6 space-x-4">
              <a 
                href="/dashboard" 
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Go to Main Dashboard
              </a>
              <a 
                href="/api/auth/logout" 
                className="inline-block bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Logout
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}