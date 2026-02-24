'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function DebugAuthPage() {
  const [authData, setAuthData] = useState<any>(null)
  const [cookieData, setCookieData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function testAuth() {
      try {
        // Test auth endpoint
        const authResponse = await fetch('/api/auth/me')
        if (authResponse.ok) {
          const authResult = await authResponse.json()
          setAuthData(authResult)
        } else {
          const errorResult = await authResponse.json()
          setAuthData({ error: errorResult.error, status: authResponse.status })
        }

        // Test cookie endpoint
        const cookieResponse = await fetch('/api/test-cookie')
        const cookieResult = await cookieResponse.json()
        setCookieData(cookieResult)
      } catch (error) {
        setAuthData({ error: 'Network error', details: error })
      } finally {
        setLoading(false)
      }
    }

    testAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Testing authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Authentication Debug</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Cookie Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(cookieData, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auth API Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(authData, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="flex space-x-4">
            <a 
              href="/auth/login" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Login
            </a>
            <a 
              href="/dashboard" 
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Try Dashboard
            </a>
            <a 
              href="/master" 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Admin Login
            </a>
            <button 
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Refresh Test
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}