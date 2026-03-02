import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/simple-auth'
import { Pool } from 'pg'
import { bgeEmbeddings } from '@/lib/rag/bge-embeddings'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
  password: 'admin',
})

/**
 * POST /api/quiz/generate-topic
 * Generate quiz questions for a specific topic using BGE embeddings and Gemini AI
 * 
 * Body:
 * {
 *   course: string,
 *   module: string,
 *   topic: string,
 *   tradeType: 'trade_theory' | 'trade_practical',
 *   questionCount?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { course, module, topic, tradeType, questionCount = 5 } = body

    if (!course || !module || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields: course, module, topic' },
        { status: 400 }
      )
    }

    console.log(`🎯 Generating quiz for: ${course}/${module}/${topic} (${tradeType})`)

    // Step 1: Generate embedding for the topic
    console.log('  🔄 Generating topic embedding...')
    await bgeEmbeddings.initialize()
    const topicEmbedding = await bgeEmbeddings.generateEmbedding(topic)

    // Step 2: Search for relevant content using BGE embeddings
    console.log('  🔍 Searching for relevant content...')
    const searchResult = await pool.query(`
      SELECT 
        content,
        module_name,
        page_number,
        1 - (embedding <=> $1::vector) as similarity
      FROM knowledge_chunks
      WHERE course = $2 
        AND trade_type = $3
      ORDER BY embedding <=> $1::vector
      LIMIT 10
    `, [`[${topicEmbedding.join(',')}]`, course, tradeType])

    if (searchResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No content found for this topic' },
        { status: 404 }
      )
    }

    console.log(`  ✓ Found ${searchResult.rows.length} relevant content chunks`)
    console.log(`  📊 Top similarity: ${(searchResult.rows[0].similarity * 100).toFixed(1)}%`)

    // Step 3: Combine relevant content
    const relevantContent = searchResult.rows
      .slice(0, 5) // Use top 5 most relevant chunks
      .map(row => row.content)
      .join('\n\n')

    // Step 4: Generate quiz questions using Gemini AI
    console.log('  🤖 Generating quiz with Gemini AI...')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are an expert ITI (Industrial Training Institute) instructor creating quiz questions for ${course} students.

Topic: ${topic}
Trade Type: ${tradeType === 'trade_theory' ? 'Theory' : 'Practical'}

Based on the following educational content, create ${questionCount} multiple-choice questions:

---
${relevantContent}
---

Requirements:
1. Create exactly ${questionCount} questions
2. Each question should have 4 options (A, B, C, D)
3. Questions should test understanding, not just memorization
4. Include a mix of difficulty levels
5. Make questions clear and unambiguous
6. Ensure one correct answer per question
7. Base questions ONLY on the provided content

Return ONLY a JSON array (no markdown, no code blocks):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

The correctAnswer should be the index (0-3) of the correct option.`

    const result = await model.generateContent(prompt)
    const response = result.response
    let text = response.text().trim()

    // Clean markdown code blocks
    if (text.startsWith('```json')) {
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (text.startsWith('```')) {
      text = text.replace(/```\n?/g, '')
    }

    const questions = JSON.parse(text)

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format from Gemini')
    }

    console.log(`  ✅ Generated ${questions.length} questions`)

    return NextResponse.json({
      success: true,
      quiz: {
        course,
        module,
        topic,
        tradeType,
        questions,
        totalQuestions: questions.length,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Quiz generation error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred while generating quiz' },
      { status: 500 }
    )
  }
}
