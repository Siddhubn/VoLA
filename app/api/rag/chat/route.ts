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
  tradeType?: 'trade_theory' | 'trade_practical'
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
      tradeType: body.tradeType,
      conversationHistory,
      topK: 8, // Increased from 5 to get more context
      minSimilarity: 0.5 // Lowered from 0.7 to be more inclusive
    })

    // Check if relevant content was found
    const hasContent = chatContext.chunkCount > 0 && chatContext.relevantContent.length > 50

    // Build system prompt
    let systemPrompt: string
    
    if (hasContent) {
      systemPrompt = `You are an expert ITI (Industrial Training Institute) instructor for ${body.course} students. You are knowledgeable, helpful, and educational.

Your role is to:
1. Answer questions clearly and comprehensively
2. Use the provided course content as your PRIMARY source
3. If the course content doesn't fully cover the topic, supplement with your general knowledge about ${body.course} training
4. Cite sources when using course materials
5. Be practical and provide real-world examples

COURSE MATERIALS:
${chatContext.relevantContent}

When answering:
- Start with information from the course materials if available
- Supplement with general ${body.course} knowledge when needed
- Use simple, clear language appropriate for students
- Provide practical examples and applications
- Cite sources when referencing course materials: [Section Name, Page X]
- If explaining concepts not in the materials, clearly state you're providing general ${body.course} knowledge

Remember: You're here to help students learn. Be thorough, accurate, and encouraging.`
    } else {
      // No relevant content found - provide general knowledge
      systemPrompt = `You are an expert ITI (Industrial Training Institute) instructor for ${body.course} students.

I couldn't find specific content in the course materials for your question: "${body.message}"

However, I can still help you! I'll provide general ${body.course} knowledge and principles to answer your question.

Your role is to:
1. Answer the question using your expertise in ${body.course} training
2. Provide clear, educational explanations
3. Use practical examples relevant to ${body.course} work
4. Mention that this is general knowledge, not from specific course materials
5. Encourage the student to verify with their course materials or instructor

Be helpful, thorough, and educational. Students need to learn, even if the specific content isn't in the indexed materials.`
    }

    // Build conversation context
    let conversationContext = ''
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n' + 
        contextBuilder.formatConversationHistory(conversationHistory, 5)
    }

    // Generate response using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    const prompt = `${systemPrompt}${conversationContext}

Student Question: ${body.message}

Your Response:`

    let responseText: string
    
    try {
      const result = await model.generateContent(prompt)
      const response = result.response
      responseText = response.text().trim()
    } catch (error: any) {
      // Handle rate limit errors gracefully
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        console.warn('⚠️ Gemini API rate limit reached')
        
        // Provide a helpful fallback response
        responseText = `I apologize, but I'm currently experiencing high demand and have reached my API quota limit. 

However, I can still help! Based on your question about "${body.message}", here's what I can tell you:

${hasContent ? `I found relevant information in the course materials:\n\n${chatContext.relevantContent.substring(0, 500)}...\n\nPlease try again in a few moments for a more detailed AI-generated response.` : 'Please try again in about 30 seconds, or contact your instructor for immediate assistance.'}

Tip: You can also browse the course syllabus directly from the dashboard.`
      } else {
        throw error // Re-throw other errors
      }
    }

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
            pdfSource: s.pdfSource,
            tradeType: s.tradeType
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
