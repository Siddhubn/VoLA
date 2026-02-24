'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { User as UserIcon, Mail, Save, AlertCircle, CheckCircle, Wrench, Zap } from 'lucide-react'

interface User {
  id: number
  name: string
  email: string
  role: string
  course?: string
  avatar?: string
  created_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    course: 'fitter'
  })

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setFormData({
            name: data.user.name,
            email: data.user.email,
            course: data.user.course || 'fitter'
          })
        } else {
          router.push('/auth/login')
        }
      } catch (err) {
        console.error('Failed to load user:', err)
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        setUser(data.user)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred while updating profile' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="text-gray-600">Update your personal information and course selection</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Make changes to your profile here. Click save when you're done.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {message && (
                <div className={`p-4 rounded-lg flex items-center space-x-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Course Selection
                </label>
                <div className="space-y-3">
                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50">
                    <input
                      type="radio"
                      name="course"
                      value="fitter"
                      checked={formData.course === 'fitter'}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Wrench className="w-5 h-5 text-blue-600 ml-3 mr-2" />
                    <div>
                      <span className="font-medium text-gray-900">Fitter</span>
                      <p className="text-sm text-gray-600">Mechanical fitting, assembly, and maintenance</p>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-yellow-50 has-[:checked]:border-yellow-600 has-[:checked]:bg-yellow-50">
                    <input
                      type="radio"
                      name="course"
                      value="electrician"
                      checked={formData.course === 'electrician'}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      className="w-4 h-4 text-yellow-600"
                    />
                    <Zap className="w-5 h-5 text-yellow-600 ml-3 mr-2" />
                    <div>
                      <span className="font-medium text-gray-900">Electrician</span>
                      <p className="text-sm text-gray-600">Electrical installation, wiring, and maintenance</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Account ID:</span>
                <span className="font-medium text-gray-900">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="font-medium text-gray-900 capitalize">{user.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member Since:</span>
                <span className="font-medium text-gray-900">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
