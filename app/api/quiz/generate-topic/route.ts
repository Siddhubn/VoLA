import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/simple-auth';
import { getMixedQuizContent, calculateQuizDifficulty, estimateQuizTime } from '@/lib/quiz-helper';
import { generateQuizWithRAG } from '@/lib/gemini';

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

    const body = await request.json();
    const { course, module, topic, tradeType, questionCount = 5 } = body;

    if (!course || !module || !topic) {
      return NextResponse.json(
        { error: 'Missing required parameters: course, module, topic' },
        { status: 400 }
      );
    }

    console.log('🎯 Generating quiz:', { course, module, topic, tradeType, questionCount });

    // Convert tradeType to TT/TP format
    const ttType = tradeType === 'trade_theory' ? 'TT' : 'TP';

    // Get balanced content from RAG system
    const { content, distribution } = await getMixedQuizContent(
      module,
      ttType,
      questionCount
    );

    if (!content || content.length === 0) {
      return NextResponse.json(
        { error: 'No content found for this module and topic' },
        { status: 404 }
      );
    }

    console.log(`📚 Retrieved ${content.length} content chunks with distribution:`, distribution);

    // Calculate difficulty
    const difficulty = calculateQuizDifficulty(content);
    const estimatedTime = estimateQuizTime(questionCount, difficulty);

    console.log(`📊 Quiz difficulty: ${difficulty}, estimated time: ${estimatedTime}s`);

    // Prepare RAG context for Gemini
    const ragContext = {
      retrievedChunks: content.map(chunk => ({
        content: chunk.content,
        module: chunk.module_name,
        section: chunk.section_title || undefined,
        type: chunk.content_type,
        priority: chunk.priority,
        similarity: 0.9 // High similarity since these are targeted chunks
      })),
      chunkCount: content.length,
      avgSimilarity: 0.9
    };

    // Generate questions using Gemini with RAG context
    console.log('🤖 Generating questions with Gemini AI...');
    const geminiQuiz = await generateQuizWithRAG(ragContext, difficulty, {
      numQuestions: questionCount,
      focusArea: undefined, // Let it be balanced based on content distribution
      tradeType: ttType,
      moduleId: module
    });

    if (!geminiQuiz.questions || geminiQuiz.questions.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate questions from content' },
        { status: 500 }
      );
    }

    console.log(`✅ Generated ${geminiQuiz.questions.length} questions`);

    // Format quiz response
    const quiz = {
      course,
      module,
      topic,
      tradeType: ttType,
      questions: geminiQuiz.questions.map(q => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      })),
      totalQuestions: geminiQuiz.questions.length,
      difficulty,
      estimatedTime,
      contentDistribution: distribution,
      sources: geminiQuiz.sources
    };

    return NextResponse.json({
      success: true,
      quiz
    });

  } catch (error: any) {
    console.error('❌ Quiz generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate quiz', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
