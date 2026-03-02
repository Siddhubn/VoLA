'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { AIChatbot } from '@/components/AIChatbot'
import { MessageSquare, Plus, Clock, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'

interface User {
  id: number
  name: string
  email: string
  role: string
  course?: string
}

interface ChatSession {
  sessionId: string
  course: string
  startedAt: string
  lastMessageAt: string
  messageCount: number
  preview: string
}

export default function ChatbotPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<'fitter' | 'electrician'>('electrician')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          // Set course from user data
          if (data.user.course) {
            setCourse(data.user.course as 'fitter' | 'electrician')
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

  useEffect(() => {
    if (user) {
      loadSessions()
    }
  }, [user, course])

  async function loadSessions() {
    try {
      const response = await fetch(`/api/chat/sessions?course=${course}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSessions(data.sessions)
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  function handleNewChat() {
    setCurrentSessionId(null)
    // Force reload of chatbot component
    window.location.reload()
  }

  function handleSessionSelect(sessionId: string) {
    setCurrentSessionId(sessionId)
    // Reload page with session
    window.location.href = `/chatbot?session=${sessionId}`
  }

  async function handleDeleteSession(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation() // Prevent session selection when clicking delete
    
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return
    }

    try {
      const response = await fetch('/api/chat/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId
        })
      })

      if (response.ok) {
        // Reload sessions
        await loadSessions()
        
        // If deleted session was current, clear it
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null)
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete conversation')
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

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

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navigation user={user} />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Chat History */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}>
          {sidebarOpen && (
            <>
              {/* Sidebar Header */}
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="font-medium">New Chat</span>
                </button>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                  {sessions.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No chat history yet</p>
                      <p className="text-xs text-gray-400 mt-1">Start a new conversation!</p>
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.sessionId}
                        className={`relative group rounded-lg transition-colors ${
                          currentSessionId === session.sessionId
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSessionSelect(session.sessionId)}
                          className="w-full text-left p-3"
                        >
                          <div className="flex items-start space-x-2">
                            <MessageSquare className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0 pr-8">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {session.preview}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {formatDate(session.lastMessageAt)}
                                </span>
                                <span className="text-xs text-gray-400">
                                  • {session.messageCount} messages
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(session.sessionId, e)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute left-0 top-20 z-10 bg-white border border-gray-200 rounded-r-lg p-2 hover:bg-gray-50 transition-all shadow-sm ${
            sidebarOpen ? 'ml-80' : 'ml-0'
          }`}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="container mx-auto px-4 py-4 sm:py-6 max-w-5xl flex flex-col h-full">
            {/* Header - Fixed */}
            <div className="mb-4 flex-shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                AI Course Assistant
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Get instant answers to your questions about ITI course content
              </p>
            </div>

            {/* Chatbot - Fills remaining space */}
            <div className="flex-1 min-h-0">
              <AIChatbot 
                course={course}
                userId={user.id}
                sessionId={currentSessionId}
                onCourseChange={setCourse}
                onSessionCreated={(sessionId) => {
                  setCurrentSessionId(sessionId)
                  loadSessions()
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
