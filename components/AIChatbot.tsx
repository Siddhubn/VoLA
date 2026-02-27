'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Send, Loader2, BookOpen, AlertCircle, Trash2, MessageSquare } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: {
    chunks: Array<{
      content: string
      similarity: number
      source: {
        section: string | null
        pageNumber: number | null
        pdfSource: string
      }
    }>
    citations: string[]
  }
  timestamp?: string
}

interface AIChatbotProps {
  course: 'fitter' | 'electrician'
  module?: string
  onCourseChange?: (course: 'fitter' | 'electrician') => void
}

export function AIChatbot({ course, module, onCourseChange }: AIChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<'fitter' | 'electrician'>(course)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Load chat history if session exists
  useEffect(() => {
    if (sessionId) {
      loadChatHistory(sessionId)
    }
  }, [sessionId])

  async function loadChatHistory(sid: string) {
    try {
      const response = await fetch(`/api/rag/chat?sessionId=${sid}`)
      if (!response.ok) {
        throw new Error('Failed to load chat history')
      }
      
      const data = await response.json()
      if (data.success && data.history) {
        setMessages(data.history.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          sources: msg.sources,
          timestamp: msg.timestamp
        })))
      }
    } catch (err) {
      console.error('Error loading chat history:', err)
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    
    if (!inputMessage.trim() || loading) {
      return
    }

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setError(null)

    // Add user message to UI immediately
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage
    }
    setMessages(prev => [...prev, newUserMessage])
    setLoading(true)

    try {
      const response = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          course: selectedCourse,
          module,
          sessionId,
          history: messages.slice(-10) // Send last 10 messages for context
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      
      if (data.success) {
        // Update session ID if new
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId)
        }

        // Add assistant response to UI
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          sources: data.sources
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      
      // Remove the user message if request failed
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function clearChat() {
    setMessages([])
    setSessionId(null)
    setError(null)
    inputRef.current?.focus()
  }

  function handleCourseChange(newCourse: 'fitter' | 'electrician') {
    setSelectedCourse(newCourse)
    if (onCourseChange) {
      onCourseChange(newCourse)
    }
    // Clear chat when switching courses
    clearChat()
  }

  const courseTitle = selectedCourse === 'electrician' ? 'Electrician' : 'Fitter'

  return (
    <div className="flex flex-col h-full max-h-[800px]">
      <Card className="flex-1 flex flex-col">
        {/* Header */}
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle className="text-xl">AI Course Assistant</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Ask questions about {courseTitle} course content
                </p>
              </div>
            </div>
            
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear</span>
              </Button>
            )}
          </div>

          {/* Course Selection */}
          <div className="flex items-center space-x-2 mt-4">
            <span className="text-sm text-gray-600">Course:</span>
            <div className="flex space-x-2">
              <Button
                variant={selectedCourse === 'fitter' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCourseChange('fitter')}
                disabled={loading}
              >
                Fitter
              </Button>
              <Button
                variant={selectedCourse === 'electrician' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCourseChange('electrician')}
                disabled={loading}
              >
                Electrician
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Messages Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Start a Conversation
              </h3>
              <p className="text-gray-500 max-w-md">
                Ask me anything about the {courseTitle} course. I'll provide answers based on the course materials with source citations.
              </p>
              <div className="mt-6 space-y-2 text-sm text-gray-600">
                <p className="font-medium">Example questions:</p>
                <ul className="space-y-1">
                  <li>• What are the safety precautions for {selectedCourse === 'fitter' ? 'using hand tools' : 'electrical wiring'}?</li>
                  <li>• Explain {selectedCourse === 'fitter' ? 'the types of files' : 'Ohm\'s law'}</li>
                  <li>• What topics are covered in Module 1?</li>
                </ul>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>

                {/* Source Citations */}
                {message.role === 'assistant' && message.sources && message.sources.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="flex items-start space-x-2">
                      <BookOpen className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-gray-700 mb-1">Sources:</p>
                        <ul className="space-y-1 text-gray-600">
                          {message.sources.citations.map((citation, citIndex) => (
                            <li key={citIndex} className="text-xs">
                              • {citation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Area */}
        <div className="border-t p-4">
          <form onSubmit={sendMessage} className="flex space-x-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Ask a question about the course..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading}
              className="flex-1"
              maxLength={1000}
            />
            <Button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Send</span>
            </Button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            {inputMessage.length}/1000 characters
          </p>
        </div>
      </Card>
    </div>
  )
}
