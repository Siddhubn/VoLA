'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GoDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Immediately redirect to dashboard
    console.log('Redirecting to dashboard...')
    router.push('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}