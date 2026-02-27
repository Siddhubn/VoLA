// Gemini AI integration for quiz generation
import { GoogleGenerativeAI } from '@google/generative-ai'
import { QuizContext } from './rag/context-builder'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

if (!GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY not found in environment variables')
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

export interface QuizQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  sourceReference?: string  // Page number and section reference
}

export interface QuizGenerationParams {
  course: 'fitter' | 'electrician'
  module: string
  numQuestions?: number
  difficulty?: 'easy' | 'medium' | 'hard'
}

export interface RAGQuizGenerationParams extends QuizGenerationParams {
  context: QuizContext
}

export interface RAGQuizResult {
  questions: QuizQuestion[]
  sources: Array<{
    section: string | null
    pageNumber: number | null
    pdfSource: string
  }>
  usedFallback: boolean
}

// Module contexts for better quiz generation
const MODULE_CONTEXTS = {
  fitter: {
    'safety-signs': 'Industrial safety signs, hazard symbols, warning signs, mandatory signs, prohibition signs used in workshops and factories',
    'ppe': 'Personal Protective Equipment including safety helmets, goggles, gloves, safety shoes, ear protection, and their proper usage',
    'vernier-calipers': 'Vernier caliper parts, reading measurements, least count, main scale, vernier scale, accuracy, and measurement techniques',
    'micrometers': 'Micrometer parts, reading measurements, thimble, spindle, anvil, ratchet stop, accuracy, and precision measurement',
    'filing': 'Filing techniques, types of files (flat, round, square, triangular), file cuts, filing positions, and surface finishing',
    'drilling': 'Drilling machines, drill bits, drilling operations, speeds and feeds, safety precautions, and hole making processes',
    'marking-tools': 'Marking tools including scriber, divider, center punch, surface plate, height gauge, and layout techniques'
  },
  electrician: {
    'ohms-law': "Ohm's Law, voltage, current, resistance relationships, power calculations, series and parallel circuits",
    'wiring-circuits': 'Electrical wiring, circuit diagrams, series circuits, parallel circuits, house wiring, cable types, and connections',
    'transformers': 'Transformer principles, step-up and step-down transformers, turns ratio, efficiency, losses, and applications',
    'electrical-safety': 'Electrical safety rules, earthing, circuit breakers, fuses, insulation, shock prevention, and first aid',
    'hand-tools': 'Electrical hand tools including pliers, wire strippers, screwdrivers, testers, crimping tools, and their usage'
  }
}

export async function generateQuiz(params: QuizGenerationParams): Promise<QuizQuestion[]> {
  const { course, module, numQuestions = 5, difficulty = 'medium' } = params
  
  const moduleKey = module.toLowerCase().replace(/\s+/g, '-')
  const courseContexts = MODULE_CONTEXTS[course] as Record<string, string>
  const context = courseContexts?.[moduleKey] || module

  const prompt = `You are an expert ITI (Industrial Training Institute) instructor creating a quiz for ${course} students.

Topic: ${module}
Context: ${context}
Difficulty: ${difficulty}
Number of Questions: ${numQuestions}

Generate ${numQuestions} multiple-choice questions that test practical knowledge and understanding. Each question should:
1. Be clear and unambiguous
2. Have 4 options (A, B, C, D)
3. Have exactly ONE correct answer
4. Include a brief explanation of the correct answer
5. Be relevant to real-world ITI training and industry practices

Return ONLY a valid JSON array with this exact structure (no markdown, no code blocks):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

The correctAnswer should be the index (0-3) of the correct option in the options array.`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Clean the response - remove markdown code blocks if present
    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '')
    }
    
    const questions: QuizQuestion[] = JSON.parse(cleanedText)
    
    // Validate the response
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid quiz format received from AI')
    }
    
    // Validate each question
    questions.forEach((q, index) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Invalid question format at index ${index}`)
      }
      if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
        throw new Error(`Invalid correctAnswer at index ${index}`)
      }
    })
    
    return questions
  } catch (error) {
    console.error('Error generating quiz:', error)
    throw new Error('Failed to generate quiz. Please try again.')
  }
}

/**
 * Generate quiz with RAG context from knowledge base
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export async function generateQuizWithRAG(params: RAGQuizGenerationParams): Promise<RAGQuizResult> {
  const { course, module, numQuestions = 5, difficulty = 'medium', context } = params
  
  // Check if we have sufficient content
  const hasContent = context.chunkCount > 0 && context.relevantContent.length > 100
  const usedFallback = !hasContent

  let prompt: string

  if (hasContent) {
    // Use RAG context for quiz generation
    prompt = `You are an expert ITI (Industrial Training Institute) instructor creating a quiz for ${course} students.

Topic: ${module}
Difficulty: ${difficulty}
Number of Questions: ${numQuestions}

IMPORTANT: Base your questions ONLY on the following course content retrieved from official ITI materials:

--- COURSE CONTENT ---
${context.relevantContent}
--- END COURSE CONTENT ---

Generate ${numQuestions} multiple-choice questions that:
1. Are based DIRECTLY on the content provided above
2. Test practical knowledge and understanding
3. Are clear and unambiguous
4. Have 4 options (A, B, C, D)
5. Have exactly ONE correct answer
6. Include a brief explanation referencing the content
7. Include a source reference (section/page) where applicable

Return ONLY a valid JSON array with this exact structure (no markdown, no code blocks):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct",
    "sourceReference": "Section name or Page X"
  }
]

The correctAnswer should be the index (0-3) of the correct option in the options array.`
  } else {
    // Fallback to general knowledge
    console.warn(`⚠️ Insufficient content for ${course}/${module}. Using fallback to general knowledge.`)
    
    const moduleKey = module.toLowerCase().replace(/\s+/g, '-')
    const courseContexts = MODULE_CONTEXTS[course] as Record<string, string>
    const fallbackContext = courseContexts?.[moduleKey] || module

    prompt = `You are an expert ITI (Industrial Training Institute) instructor creating a quiz for ${course} students.

⚠️ WARNING: Limited course content available. Generate questions based on general ITI knowledge.

Topic: ${module}
Context: ${fallbackContext}
Difficulty: ${difficulty}
Number of Questions: ${numQuestions}

Generate ${numQuestions} multiple-choice questions that test practical knowledge and understanding. Each question should:
1. Be clear and unambiguous
2. Have 4 options (A, B, C, D)
3. Have exactly ONE correct answer
4. Include a brief explanation of the correct answer
5. Be relevant to real-world ITI training and industry practices

Return ONLY a valid JSON array with this exact structure (no markdown, no code blocks):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

The correctAnswer should be the index (0-3) of the correct option in the options array.`
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Clean the response - remove markdown code blocks if present
    let cleanedText = text.trim()
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\n?/g, '')
    }
    
    const questions: QuizQuestion[] = JSON.parse(cleanedText)
    
    // Validate the response
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid quiz format received from AI')
    }
    
    // Validate each question
    questions.forEach((q, index) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Invalid question format at index ${index}`)
      }
      if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3) {
        throw new Error(`Invalid correctAnswer at index ${index}`)
      }
    })
    
    return {
      questions,
      sources: context.sources,
      usedFallback
    }
  } catch (error) {
    console.error('Error generating RAG quiz:', error)
    throw new Error('Failed to generate quiz. Please try again.')
  }
}

export async function getHint(question: string, userAnswer: string): Promise<string> {
  const prompt = `A student answered a quiz question incorrectly. Provide a helpful hint (2-3 sentences) without giving away the answer directly.

Question: ${question}
Student's Answer: ${userAnswer}

Provide a hint that guides them toward the correct answer:`

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text().trim()
  } catch (error) {
    console.error('Error generating hint:', error)
    return 'Try reviewing the fundamental concepts related to this topic.'
  }
}
