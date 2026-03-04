import { NextRequest, NextResponse } from 'next/server';
import { 
  optimizedContextAwareSearch as contextualSearch, 
  optimizedGenerateEmbedding as generateEmbedding
} from '@/lib/rag-helper';
import { verifyToken } from '@/lib/simple-auth';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatRequest {
  message: string;
  course?: 'fitter' | 'electrician';
  context?: {
    currentModule?: string;
    tradeType?: 'TT' | 'TP';
    userLevel?: 'beginner' | 'intermediate' | 'advanced';
    focusArea?: 'theory' | 'practical' | 'safety' | 'tools';
  };
  history?: ChatMessage[];
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body: ChatRequest = await request.json();
    const { message, course = 'electrician', context = {}, history = [] } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('💬 Chat request:', {
      message: message.substring(0, 100),
      context,
      historyLength: history.length
    });

    let contextText = '';
    let sources: any[] = [];

    // Try to get RAG context, but don't fail if it doesn't work
    try {
      console.log('🔄 Attempting RAG search...');
      
      // Generate embedding
      const embedding = await Promise.race([
        generateEmbedding(message),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Embedding timeout')), 10000))
      ]) as number[];
      
      console.log(`✅ Generated embedding (${embedding.length} dimensions)`);

      // Search knowledge base
      const relevantChunks = await Promise.race([
        contextualSearch(
          embedding,
          {
            preferredModule: context.currentModule,
            preferredContentType: context.focusArea,
            tradeType: context.tradeType || 'TT',
            userLevel: context.userLevel || 'intermediate'
          },
          5
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Search timeout')), 10000))
      ]) as any[];

      console.log(`📚 Found ${relevantChunks.length} chunks`);

      if (relevantChunks.length > 0) {
        contextText = relevantChunks
          .map(chunk => {
            const moduleInfo = `[Module ${chunk.module_number}: ${chunk.module_name}]`;
            const typeInfo = `[${chunk.content_type?.toUpperCase() || 'CONTENT'}]`;
            const sectionInfo = chunk.section_title ? `[${chunk.section_title}]` : '';
            return `${moduleInfo} ${typeInfo} ${sectionInfo}\n${chunk.content}`;
          })
          .join('\n\n---\n\n');
        
        sources = relevantChunks.map(chunk => ({
          module: chunk.module_name,
          moduleNumber: chunk.module_number,
          type: chunk.content_type,
          section: chunk.section_title
        }));
      }
    } catch (ragError: any) {
      console.warn('⚠️ RAG search failed:', ragError.message);
      console.log('📝 Will use general knowledge instead');
    }

    // If no context from RAG, use a helpful default
    if (!contextText) {
      contextText = `You are an ITI Electrician instructor. The knowledge base is currently empty, but you can still help with general electrical concepts, safety, and practical skills based on your training.`;
    }

    // Generate AI response with timeout
    console.log('🤖 Generating AI response...');
    const aiResponse = await Promise.race([
      generateAIResponse({
        userMessage: message,
        context: contextText,
        conversationHistory: history,
        userContext: context
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('AI generation timeout')), 30000))
    ]) as string;
    
    console.log('✅ Generated response');

    console.log('✅ Generated response');

    // Save chat history
    const userId = decoded.userId || 1;
    const newSessionId = `session_${Date.now()}_${userId}`;
    
    try {
      const { query } = await import('@/lib/postgresql');
      
      // Save user message
      await query(`
        INSERT INTO chat_history (user_id, course, session_id, message_type, message, sources)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, course, newSessionId, 'user', message, JSON.stringify([])]);
      
      // Save assistant response
      await query(`
        INSERT INTO chat_history (user_id, course, session_id, message_type, message, sources)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, course, newSessionId, 'assistant', aiResponse, JSON.stringify(sources)]);
      
      console.log('💾 Saved chat history');
    } catch (saveError) {
      console.error('Failed to save chat history:', saveError);
    }

    return NextResponse.json({
      response: aiResponse,
      sources,
      sessionId: newSessionId,
      metadata: {
        chunksUsed: sources.length,
        context: context,
        responseTime: Date.now()
      }
    });

  } catch (error: any) {
    console.error('❌ Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate AI response using Gemini with RAG context
 */
async function generateAIResponse({
  userMessage,
  context,
  conversationHistory,
  userContext
}: {
  userMessage: string;
  context: string;
  conversationHistory: ChatMessage[];
  userContext: any;
}): Promise<string> {
  const { generateChatResponse } = await import('@/lib/gemini');
  
  // Build system prompt with context
  const systemPrompt = `You are an expert ITI Electrician instructor helping students learn electrical concepts, safety practices, and practical skills.

**Course Context:**
${context || 'No specific course content available for this query.'}

**Student Profile:**
- Level: ${userContext.userLevel || 'intermediate'}
- Trade Type: ${userContext.tradeType === 'TP' ? 'Trade Practical' : 'Trade Theory'}
- Focus Area: ${userContext.focusArea || 'general'}
- Current Module: ${userContext.currentModule || 'not specified'}

**Instructions:**
1. Use the course context above to provide accurate, relevant answers
2. Adapt your language to the student's level:
   - Beginner: Use simple terms, avoid jargon, provide more context
   - Intermediate: Balance technical terms with clear explanations
   - Advanced: Use technical terminology, focus on complex concepts
3. Always prioritize safety when relevant
4. Provide practical examples when helpful
5. If the context doesn't contain the answer, use your general knowledge but mention this
6. Be concise but thorough
7. Use formatting (bullet points, numbered lists) for clarity

Answer the student's question based on the context and your expertise.`;

  // Build conversation history for Gemini
  const history = conversationHistory.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  // Generate response using Gemini
  const response = await generateChatResponse(
    userMessage,
    history,
    systemPrompt
  );

  return response;
}