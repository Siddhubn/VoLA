import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { POST, GET } from '../route'
import { NextRequest } from 'next/server'
import { query } from '@/lib/postgresql'
import { v4 as uuidv4 } from 'uuid'
import { generateToken } from '@/lib/simple-auth'

// Mock Gemini API
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: vi.fn().mockReturnValue('This is a test response about safety equipment. [Safety Equipment, Page 5]')
        }
      })
    })
  }))
}))

describe('POST /api/rag/chat', () => {
  const testSessionId = uuidv4()
  const testUserId = '1'
  let authToken: string

  beforeAll(async () => {
    // Generate auth token for testing
    authToken = generateToken({ userId: testUserId, email: 'test@example.com', role: 'student' })

    // Clean up any existing test data - no need to clean up since we're using proper UUIDs
  })

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM chat_history WHERE session_id::text = $1', [testSessionId])
  })

  // Helper function to create authenticated request
  const createAuthRequest = (url: string, body: any) => {
    const request = new NextRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${authToken}`
      }
    })
    return request
  }

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM chat_history WHERE session_id = $1', [testSessionId])
  })

  it('should reject unauthenticated requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/rag/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What is safety equipment?',
        course: 'fitter'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toContain('authenticated')
  })

  it('should reject requests without message', async () => {
    const request = createAuthRequest('http://localhost:3000/api/rag/chat', {
      course: 'fitter'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Message is required')
  })

  it('should reject requests without course', async () => {
    const request = createAuthRequest('http://localhost:3000/api/rag/chat', {
      message: 'What is safety equipment?'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Course is required')
  })

  it('should reject requests with invalid course', async () => {
    const request = createAuthRequest('http://localhost:3000/api/rag/chat', {
      message: 'What is safety equipment?',
      course: 'invalid'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Invalid course')
  })

  it('should reject messages that are too long', async () => {
    const longMessage = 'a'.repeat(1001)

    const request = createAuthRequest('http://localhost:3000/api/rag/chat', {
      message: longMessage,
      course: 'fitter'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Message too long')
  })

  it('should generate response with RAG context', async () => {
    const request = createAuthRequest('http://localhost:3000/api/rag/chat', {
      message: 'What is safety equipment?',
      course: 'fitter',
      sessionId: testSessionId
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.response).toBeDefined()
    expect(typeof data.response).toBe('string')
    expect(data.response.length).toBeGreaterThan(0)
    expect(data.sessionId).toBe(testSessionId)
    expect(data.sources).toBeDefined()
    expect(data.sources.chunks).toBeDefined()
    expect(Array.isArray(data.sources.chunks)).toBe(true)
    expect(data.sources.citations).toBeDefined()
    expect(Array.isArray(data.sources.citations)).toBe(true)
  })

  it('should include source citations in response', async () => {
    const request = createAuthRequest('http://localhost:3000/api/rag/chat', {
      message: 'Tell me about safety signs',
      course: 'fitter',
      module: 'safety-signs',
      sessionId: testSessionId
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.sources).toBeDefined()
    expect(data.sources.citations).toBeDefined()
    
    // Should have citations if content was found
    if (data.sources.chunks.length > 0) {
      expect(data.sources.citations.length).toBeGreaterThan(0)
    }
  })

  it('should store conversation in chat_history table', async () => {
    const newSessionId = uuidv4()

    const request = createAuthRequest('http://localhost:3000/api/rag/chat', {
      message: 'What are the types of files?',
      course: 'fitter',
      sessionId: newSessionId
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)

    // Check that messages were stored in database
    const historyResult = await query(
      'SELECT * FROM chat_history WHERE session_id::text = $1 ORDER BY created_at',
      [newSessionId]
    )

    expect(historyResult.rows.length).toBeGreaterThanOrEqual(2) // User message + assistant response
    
    const userMessage = historyResult.rows.find(row => row.message_type === 'user')
    const assistantMessage = historyResult.rows.find(row => row.message_type === 'assistant')

    expect(userMessage).toBeDefined()
    expect(userMessage.message).toBe('What are the types of files?')
    expect(userMessage.course).toBe('fitter')

    expect(assistantMessage).toBeDefined()
    expect(assistantMessage.message).toBeDefined()
    expect(assistantMessage.sources).toBeDefined()

    // Clean up
    await query('DELETE FROM chat_history WHERE session_id::text = $1', [newSessionId])
  })

  it('should handle session management with conversation history', async () => {
    const sessionId = uuidv4()

    // First message
    const request1 = createAuthRequest('http://localhost:3000/api/rag/chat', {
      message: 'What is a vernier caliper?',
      course: 'fitter',
      sessionId
    })

    const response1 = await POST(request1)
    const data1 = await response1.json()

    expect(response1.status).toBe(200)
    expect(data1.success).toBe(true)
    expect(data1.sessionId).toBe(sessionId)

    // Second message in same session
    const request2 = createAuthRequest('http://localhost:3000/api/rag/chat', {
      message: 'How do you read it?',
      course: 'fitter',
      sessionId
    })

    const response2 = await POST(request2)
    const data2 = await response2.json()

    expect(response2.status).toBe(200)
    expect(data2.success).toBe(true)
    expect(data2.sessionId).toBe(sessionId)

    // Verify conversation history was maintained
    const historyResult = await query(
      'SELECT * FROM chat_history WHERE session_id::text = $1 ORDER BY created_at',
      [sessionId]
    )

    expect(historyResult.rows.length).toBeGreaterThanOrEqual(4) // 2 user + 2 assistant messages

    // Clean up
    await query('DELETE FROM chat_history WHERE session_id::text = $1', [sessionId])
  })

  it('should generate new session ID if not provided', async () => {
    const request = createAuthRequest('http://localhost:3000/api/rag/chat', {
      message: 'What is drilling?',
      course: 'fitter'
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.sessionId).toBeDefined()
    expect(typeof data.sessionId).toBe('string')
    expect(data.sessionId.length).toBeGreaterThan(0)

    // Clean up
    await query('DELETE FROM chat_history WHERE session_id::text = $1', [data.sessionId])
  })

  it('should handle module-specific queries', async () => {
    const request = createAuthRequest('http://localhost:3000/api/rag/chat', {
      message: 'What are the safety precautions?',
      course: 'fitter',
      module: 'drilling',
      sessionId: testSessionId
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.response).toBeDefined()
  })
})

describe('GET /api/rag/chat', () => {
  const testSessionId = uuidv4()
  const testUserId = '1'
  let authToken: string

  beforeAll(async () => {
    // Generate auth token for testing
    authToken = generateToken({ userId: testUserId, email: 'test@example.com', role: 'student' })

    // Create some test chat history
    await query(
      `INSERT INTO chat_history (user_id, course, session_id, message_type, message, sources)
       VALUES ($1, $2, $3::uuid, $4, $5, $6)`,
      [parseInt(testUserId), 'fitter', testSessionId, 'user', 'Test question', '[]']
    )

    await query(
      `INSERT INTO chat_history (user_id, course, session_id, message_type, message, sources)
       VALUES ($1, $2, $3::uuid, $4, $5, $6)`,
      [parseInt(testUserId), 'fitter', testSessionId, 'assistant', 'Test answer', '[]']
    )
  })

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM chat_history WHERE session_id::text = $1', [testSessionId])
  })

  it('should reject unauthenticated requests', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/rag/chat?sessionId=${testSessionId}`,
      { method: 'GET' }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toContain('authenticated')
  })

  it('should reject requests without session ID', async () => {
    const request = new NextRequest('http://localhost:3000/api/rag/chat', {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${authToken}`
      }
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Session ID is required')
  })

  it('should retrieve chat history for a session', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/rag/chat?sessionId=${testSessionId}`,
      {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`
        }
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.history).toBeDefined()
    expect(Array.isArray(data.history)).toBe(true)
    expect(data.history.length).toBeGreaterThanOrEqual(2)
    expect(data.sessionId).toBe(testSessionId)

    // Verify message structure
    const userMessage = data.history.find((msg: any) => msg.role === 'user')
    const assistantMessage = data.history.find((msg: any) => msg.role === 'assistant')

    expect(userMessage).toBeDefined()
    expect(userMessage.content).toBe('Test question')
    expect(userMessage.timestamp).toBeDefined()

    expect(assistantMessage).toBeDefined()
    expect(assistantMessage.content).toBe('Test answer')
    expect(assistantMessage.sources).toBeDefined()
  })

  it('should return empty history for non-existent session', async () => {
    const nonExistentSessionId = uuidv4()

    const request = new NextRequest(
      `http://localhost:3000/api/rag/chat?sessionId=${nonExistentSessionId}`,
      {
        method: 'GET',
        headers: {
          'Cookie': `auth-token=${authToken}`
        }
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.history).toBeDefined()
    expect(Array.isArray(data.history)).toBe(true)
    expect(data.history.length).toBe(0)
  })
})
