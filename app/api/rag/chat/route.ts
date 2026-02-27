import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { ContextBuilder } from '@/lib/rag/context-builder'
import { createChatMessage, getChatHistory } from '@/lib/rag/rag-db'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { v4 as uuidv4 } from 'uuid'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

if (!GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY not found in environment variables')
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

interface ChatRequest {
  message: string
  course: 'fitter' | 'electrician'
  module?: string
  sessionId?: string
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

interface ChatResponse {
  success: boolean
  response?: string
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
  sessionId?: string
  error?: string
}

/**
 * POST /api/rag/chat
 * AI Chatbot endpoint with RAG context
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 */
export async function POST(request: NextRequest): Promise<NextResponse<ChatResponse>> {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user ID from token
    const userId = decoded.userId

    // Parse request body
    const body: ChatRequest = await request.json()

    // Validate required fields
    if (!body.message || body.message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!body.course) {
      return NextResponse.json(
        { success: false, error: 'Course is required' },
        { status: 400 }
      )
    }

    if (!['fitter', 'electrician'].includes(body.course)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course. Must be "fitter" or "electrician"' },
        { status: 400 }
      )
    }

    // Validate message length
    if (body.message.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Message too long. Maximum 1000 characters' },
        { status: 400 }
      )
    }

    // Generate or use existing session ID
    const sessionId = body.sessionId || uuidv4()

    // Parse user ID to integer for database
    const userIdInt = parseInt(userId)

    // Retrieve conversation history if session exists
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    
    if (body.sessionId) {
      // Load history from database
      const dbHistory = await getChatHistory(body.sessionId, 10) // Last 10 messages
      conversationHistory = dbHistory.map(msg => ({
        role: msg.message_type,
        content: msg.message
      }))
    } else if (body.history) {
      // Use provided history
      conversationHistory = body.history
    }

    // Build context using RAG
    const contextBuilder = new ContextBuilder()
    const chatContext = await contextBuilder.buildChatContext(body.message, {
      course: body.course,
      module: body.module,
      conversationHistory,
      topK: 5,
      minSimilarity: 0.7
    })

    // Check if relevant content was found
    const hasContent = chatContext.chunkCount > 0 && chatContext.relevantContent.length > 100

    // Build system prompt
    let systemPrompt: string
    
    if (hasContent) {
      systemPrompt = `You are an expert ITI (Industrial Training Institute) instructor assistant for ${body.course} students.

Your role is to:
1. Answer questions based ONLY on the provided course content
2. Cite sources with page numbers and sections when available
3. Be clear, concise, and educational
4. If the content doesn't contain the answer, say so and suggest related topics

IMPORTANT: Base your answers ONLY on the following course content:

--- COURSE CONTENT ---
${chatContext.relevantContent}
--- END COURSE CONTENT ---

When answering:
- Reference specific sections or page numbers from the content
- Use simple, clear language appropriate for students
- Provide practical examples when relevant
- If the question cannot be answered from the content, inform the user

Format your citations like: [Section Name, Page X]`
    } else {
      // No relevant content found
      systemPrompt = `You are an expert ITI (Industrial Training Institute) instructor assistant for ${body.course} students.

Unfortunately, I couldn't find specific content in the course materials to answer your question about "${body.message}".

Please:
1. Rephrase your question or ask about a different topic
2. Make sure your question is related to ${body.course} training
3. Try asking about specific modules or topics from the course

I can help with questions about ${body.course} course content, tools, techniques, safety, and practical applications.`
    }

    // Build conversation context
    let conversationContext = ''
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n' + 
        contextBuilder.formatConversationHistory(conversationHistory, 5)
    }

    // Generate response using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    
    const prompt = `${systemPrompt}${conversationContext}

Student Question: ${body.message}

Your Response:`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const responseText = response.text().trim()

    // Extract citations from response
    const citations: string[] = []
    const citationRegex = /\[(.*?),\s*Page\s*(\d+)\]/gi
    let match
    
    while ((match = citationRegex.exec(responseText)) !== null) {
      citations.push(`${match[1]}, Page ${match[2]}`)
    }

    // Add generic citations from sources if no specific citations found
    if (citations.length === 0 && hasContent) {
      chatContext.sources.forEach(source => {
        if (source.section && source.pageNumber) {
          citations.push(`${source.section}, Page ${source.pageNumber}`)
        } else if (source.pageNumber) {
          citations.push(`Page ${source.pageNumber}`)
        }
      })
    }

    // Store user message in database
    await createChatMessage({
      user_id: userIdInt,
      course: body.course,
      session_id: sessionId,
      message_type: 'user',
      message: body.message,
      sources: []
    })

    // Store assistant response in database
    await createChatMessage({
      user_id: userIdInt,
      course: body.course,
      session_id: sessionId,
      message_type: 'assistant',
      message: responseText,
      sources: chatContext.sources.map(s => ({
        section: s.section,
        pageNumber: s.pageNumber,
        pdfSource: s.pdfSource,
        similarity: s.similarity
      }))
    })

    // Return response
    return NextResponse.json({
      success: true,
      response: responseText,
      sources: {
        chunks: chatContext.sources.map(s => ({
          content: s.pdfSource,
          similarity: s.similarity,
          source: {
            section: s.section,
            pageNumber: s.pageNumber,
            pdfSource: s.pdfSource
          }
        })),
        citations: Array.from(new Set(citations)) // Remove duplicates
      },
      sessionId
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate response'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rag/chat?sessionId=xxx
 * Retrieve chat history for a session
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get session ID from query params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Retrieve chat history
    const history = await getChatHistory(sessionId, 50)

    return NextResponse.json({
      success: true,
      history: history.map(msg => ({
        role: msg.message_type,
        content: msg.message,
        sources: msg.sources,
        timestamp: msg.created_at
      })),
      sessionId
    })

  } catch (error) {
    console.error('Chat history retrieval error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve chat history'
      },
      { status: 500 }
    )
  }
}
