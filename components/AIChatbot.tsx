'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
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
  userId: number
  module?: string
  sessionId?: string | null
  onCourseChange?: (course: 'fitter' | 'electrician') => void
  onSessionCreated?: (sessionId: string) => void
}

// Function to process markdown and format text
function processMarkdown(text: string): string {
  // Remove bold markers (*** or **)
  let processed = text.replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '$1')
  
  // Remove italic markers (*)
  processed = processed.replace(/\*([^*]+)\*/g, '$1')
  
  // Remove underscores used for emphasis
  processed = processed.replace(/_([^_]+)_/g, '$1')
  
  return processed
}

// Component to render formatted message
function FormattedMessage({ content }: { content: string }) {
  const processed = processMarkdown(content)
  
  // Split by newlines and render with proper spacing
  const lines = processed.split('\n')
  
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        // Check if line is a bullet point
        if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          return (
            <div key={index} className="flex items-start space-x-2">
              <span className="text-current mt-1">•</span>
              <span className="flex-1">{line.replace(/^[•\-]\s*/, '')}</span>
            </div>
          )
        }
        
        // Check if line is numbered
        if (/^\d+\./.test(line.trim())) {
          return (
            <div key={index} className="flex items-start space-x-2">
              <span className="font-medium">{line.match(/^\d+\./)?.[0]}</span>
              <span className="flex-1">{line.replace(/^\d+\.\s*/, '')}</span>
            </div>
          )
        }
        
        // Regular line
        if (line.trim()) {
          return <p key={index} className="leading-relaxed">{line}</p>
        }
        
        // Empty line for spacing
        return <div key={index} className="h-2" />
      })}
    </div>
  )
}

export function AIChatbot({ course, userId, module, sessionId: initialSessionId, onCourseChange, onSessionCreated }: AIChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null)
  const [selectedCourse, setSelectedCourse] = useState<'fitter' | 'electrician'>(course)
  const [loadingHistory, setLoadingHistory] = useState(true)
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

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory()
  }, [userId, selectedCourse])

  async function loadChatHistory() {
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/chat/history?course=${selectedCourse}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.messages) {
          setMessages(data.messages)
          if (data.sessionId) {
            setSessionId(data.sessionId)
          }
        }
      }
    } catch (err) {
      console.error('Error loading chat history:', err)
    } finally {
      setLoadingHistory(false)
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
          userId,
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
          // Notify parent component
          if (onSessionCreated) {
            onSessionCreated(data.sessionId)
          }
        }

        // Add assistant response to UI
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          sources: data.sources
        }
        setMessages(prev => [...prev, assistantMessage])
        
        // Notify parent to refresh sessions list
        if (onSessionCreated && data.sessionId) {
          onSessionCreated(data.sessionId)
        }
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

  async function clearChat() {
    if (!confirm('Are you sure you want to clear the chat history?')) {
      return
    }

    try {
      // Clear from database
      await fetch('/api/chat/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          course: selectedCourse
        })
      })

      // Clear local state
      setMessages([])
      setSessionId(null)
      setError(null)
      inputRef.current?.focus()
    } catch (err) {
      console.error('Error clearing chat:', err)
    }
  }

  function handleCourseChange(newCourse: 'fitter' | 'electrician') {
    setSelectedCourse(newCourse)
    if (onCourseChange) {
      onCourseChange(newCourse)
    }
    // Load history for new course
    loadChatHistory()
  }

  const courseTitle = selectedCourse === 'electrician' ? 'Electrician' : 'Fitter'

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
              <p className="text-xs text-gray-600">
                {courseTitle} Course
              </p>
            </div>
          </div>
          
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="flex items-center space-x-1 text-xs"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>

        {/* Course Selection */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600">Course:</span>
          <div className="flex space-x-2">
            <Button
              variant={selectedCourse === 'fitter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCourseChange('fitter')}
              disabled={loading}
              className="text-xs px-3 py-1"
            >
              Fitter
            </Button>
            <Button
              variant={selectedCourse === 'electrician' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCourseChange('electrician')}
              disabled={loading}
              className="text-xs px-3 py-1"
            >
              Electrician
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading chat history...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="p-4 bg-blue-100 rounded-full mb-4">
              <BookOpen className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Start a Conversation
            </h3>
            <p className="text-sm text-gray-600 max-w-md mb-6">
              Ask me anything about the {courseTitle} course. I'll provide answers based on the course materials with source citations.
            </p>
            <div className="bg-white rounded-lg p-4 border border-gray-200 max-w-md">
              <p className="text-xs font-medium text-gray-700 mb-2">Example questions:</p>
              <ul className="space-y-2 text-xs text-gray-600 text-left">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>What are the safety precautions for {selectedCourse === 'fitter' ? 'using hand tools' : 'electrical wiring'}?</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Explain {selectedCourse === 'fitter' ? 'the types of files' : 'Ohm\'s law'}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>What topics are covered in Module 1?</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-lg p-3 sm:p-4 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <FormattedMessage content={message.content} />

                  {/* Source Citations */}
                  {message.role === 'assistant' && message.sources && message.sources.citations && message.sources.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-start space-x-2">
                        <BookOpen className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="text-xs">
                          <p className="font-medium text-gray-700 mb-1">Sources:</p>
                          <ul className="space-y-1 text-gray-600">
                            {message.sources.citations.map((citation, citIndex) => (
                              <li key={citIndex} className="flex items-start space-x-1">
                                <span>•</span>
                                <span>{citation}</span>
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
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md shadow-sm">
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
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 p-3 sm:p-4 bg-white">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Ask a question..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading}
            className="flex-1 text-sm"
            maxLength={1000}
          />
          <Button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="flex items-center space-x-2 px-3 sm:px-4"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-sm">Send</span>
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          {inputMessage.length}/1000 characters
        </p>
      </div>
    </div>
  )
}
