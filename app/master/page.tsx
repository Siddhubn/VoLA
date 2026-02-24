'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Eye, EyeOff, Shield } from 'lucide-react'

interface AdminLoginForm {
  username: string
  password: string
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<AdminLoginForm>()

  const onSubmit = async (data: AdminLoginForm) => {
    setIsLoading(true)
    setError('')

    try {
      console.log('Attempting admin login...')
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      const result = await response.json()
      console.log('Admin login response:', response.status, result)

      if (response.ok && result.user) {
        console.log('✅ Admin login successful, redirecting...')
        // Redirect to simple admin dashboard that works
        window.location.href = '/admin-simple'
      } else {
        console.error('❌ Admin login failed:', result.error)
        setError(result.error || 'Login failed')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('❌ Admin login error:', error)
      setError('Network error. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">
            Admin Access
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Restricted area - Authorized personnel only
          </p>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl text-white">Administrator Login</CardTitle>
            <CardDescription className="text-gray-400">
              Enter your admin credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Username"
                type="text"
                placeholder="Enter admin username"
                error={errors.username?.message}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                {...register('username', {
                  required: 'Username is required'
                })}
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter admin password"
                  error={errors.password?.message}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  {...register('password', {
                    required: 'Password is required'
                  })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                loading={isLoading}
              >
                <Shield className="w-4 h-4 mr-2" />
                Access Admin Panel
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                This is a secure area. All access attempts are logged.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}