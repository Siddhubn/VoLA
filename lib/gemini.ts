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
 * RAG Context for quiz generation
 */
export interface RAGContext {
  retrievedChunks: Array<{
    content: string;
    module: string;
    section?: string;
    type: string;
    priority: number;
    similarity: number;
  }>;
  chunkCount: number;
  avgSimilarity: number;
}

/**
 * Quiz generation options
 */
export interface QuizOptions {
  numQuestions?: number;
  focusArea?: string;
  tradeType?: 'TT' | 'TP';
  moduleId?: string;
}

/**
 * Generate quiz with RAG context from knowledge base
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */
export async function generateQuizWithRAG(
  ragContext: RAGContext,
  difficulty: string = 'medium',
  options: QuizOptions = {}
): Promise<{
  questions: QuizQuestion[];
  sources: string[];
  usedFallback: boolean;
}> {
  const { numQuestions = 5, focusArea, tradeType = 'TT', moduleId } = options
  
  // Check if we have sufficient content
  const hasContent = ragContext.chunkCount > 0 && ragContext.retrievedChunks.length > 0
  const usedFallback = !hasContent

  // Build context text from chunks
  const contextText = ragContext.retrievedChunks
    .map(chunk => {
      const moduleInfo = `[Module: ${chunk.module}]`;
      const typeInfo = `[Type: ${chunk.type}]`;
      const sectionInfo = chunk.section ? `[Section: ${chunk.section}]` : '';
      return `${moduleInfo} ${typeInfo} ${sectionInfo}\n${chunk.content}`;
    })
    .join('\n\n---\n\n');

  // Extract sources
  const sources = ragContext.retrievedChunks.map(chunk => 
    `${chunk.module}${chunk.section ? ` - ${chunk.section}` : ''}`
  );

  let prompt: string

  if (hasContent) {
    const tradeTypeText = tradeType === 'TP' ? 'Trade Practical' : 'Trade Theory';
    const focusAreaText = focusArea ? ` with focus on ${focusArea}` : '';
    const moduleText = moduleId ? ` from ${moduleId}` : '';

    // Use RAG context for quiz generation
    prompt = `You are an expert ITI (Industrial Training Institute) instructor creating a quiz for electrician students.

Trade Type: ${tradeTypeText}${moduleText}
Difficulty: ${difficulty}
Number of Questions: ${numQuestions}${focusAreaText}

IMPORTANT: Base your questions ONLY on the following course content retrieved from official ITI materials:

--- COURSE CONTENT ---
${contextText}
--- END COURSE CONTENT ---

Generate ${numQuestions} multiple-choice questions that:
1. Are based DIRECTLY on the content provided above
2. Test practical knowledge and understanding
3. Are clear and unambiguous
4. Have 4 options (A, B, C, D)
5. Have exactly ONE correct answer
6. Include a brief explanation referencing the content
7. Focus on ${tradeTypeText} content${focusAreaText}

Question Distribution Guidelines:
- If focus area is "safety": Prioritize safety procedures, hazards, and PPE
- If focus area is "theory": Focus on concepts, principles, and calculations
- If focus area is "practical": Emphasize procedures, applications, and troubleshooting
- If focus area is "tools": Focus on tool usage, selection, and maintenance
- If no focus area: Create balanced mix of theory, safety, and practical questions

Return ONLY a valid JSON array with this exact structure (no markdown, no code blocks):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct and why other options are wrong"
  }
]

Important:
- Return only valid JSON, no additional text
- Ensure questions are challenging but fair
- Make distractors plausible but clearly incorrect
- Include units in calculations where appropriate
- Reference specific safety standards when relevant

The correctAnswer should be the index (0-3) of the correct option in the options array.`
  } else {
    // Fallback to general knowledge
    console.warn(`⚠️ Insufficient content. Using fallback to general knowledge.`)

    prompt = `You are an expert ITI (Industrial Training Institute) instructor creating a quiz for electrician students.

⚠️ WARNING: Limited course content available. Generate questions based on general ITI electrical knowledge.

Difficulty: ${difficulty}
Number of Questions: ${numQuestions}

Generate ${numQuestions} multiple-choice questions that test practical electrical knowledge and understanding. Each question should:
1. Be clear and unambiguous
2. Have 4 options (A, B, C, D)
3. Have exactly ONE correct answer
4. Include a brief explanation of the correct answer
5. Be relevant to real-world ITI electrical training and industry practices

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
      sources,
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

/**
 * Generate chat response using Gemini with conversation history
 */
export async function generateChatResponse(
  userMessage: string,
  conversationHistory: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemPrompt: string
): Promise<string> {
  try {
    console.log('🤖 Calling Gemini API...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    
    // Start chat with history
    const chat = model.startChat({
      history: conversationHistory,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    })

    // Send message with system prompt prepended
    const fullMessage = `${systemPrompt}\n\nUser Question: ${userMessage}`
    
    console.log('📤 Sending message to Gemini...');
    const result = await chat.sendMessage(fullMessage)
    const response = await result.response
    
    console.log('✅ Received response from Gemini');
    return response.text().trim()
  } catch (error: any) {
    console.error('❌ Error generating chat response:', error);
    
    // Provide a helpful fallback response
    if (error.message?.includes('API key')) {
      throw new Error('Gemini API key is not configured. Please check your environment variables.');
    }
    
    throw new Error(`Failed to generate response: ${error.message || 'Unknown error'}`);
  }
}
