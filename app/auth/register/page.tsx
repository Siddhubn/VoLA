'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Eye, EyeOff, UserPlus } from 'lucide-react'

interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: 'student' | 'instructor'
  course: 'Fitter' | 'Electrician'
}

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<RegisterForm>({
    // No default values - user must select both role and course
  })

  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('Attempting registration...')
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          course: data.course
        }),
      })

      const result = await response.json()
      console.log('Registration response:', response.status, result)

      if (response.ok && result.success) {
        console.log('✅ Registration successful, redirecting...')
        window.location.href = '/dashboard'
      } else {
        console.error('❌ Registration failed:', result.error)
        setError(result.error || 'Registration failed')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('❌ Registration error:', error)
      setError('Network error. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Join VoLA Today
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account and start your learning journey
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create Account</CardTitle>
            <CardDescription>
              Fill in your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Full Name"
                type="text"
                placeholder="Enter your full name"
                error={errors.name?.message}
                {...register('name', {
                  required: 'Name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters'
                  },
                  maxLength: {
                    value: 50,
                    message: 'Name cannot exceed 50 characters'
                  }
                })}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                error={errors.email?.message}
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email address'
                  }
                })}
              />

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Account Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="student"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      {...register('role', { required: 'Please select an account type' })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Student</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="instructor"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      {...register('role', { required: 'Please select an account type' })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Instructor</span>
                  </label>
                </div>
                {errors.role && (
                  <p className="text-sm text-red-600">{errors.role.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Select Course
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="Fitter"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      {...register('course', { required: 'Please select a course' })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Fitter</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="Electrician"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                      {...register('course', { required: 'Please select a course' })}
                    />
                    <span className="ml-2 text-sm text-gray-700">Electrician</span>
                  </label>
                </div>
                {errors.course && (
                  <p className="text-sm text-red-600">{errors.course.message}</p>
                )}
              </div>

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  error={errors.password?.message}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
                    }
                  })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === password || 'Passwords do not match'
                  })}
                />
                <button
                  type="button"
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Already have an account?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">
                    Sign In Instead
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}