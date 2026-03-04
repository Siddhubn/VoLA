#!/usr/bin/env tsx
import { config } from 'dotenv'
import path from 'path'

config({ path: path.join(process.cwd(), '.env.local') })

async function testRagChat() {
  console.log('🧪 Testing RAG Chat System\n')

  try {
    // Test 1: Check database connection
    console.log('1️⃣ Testing database connection...')
    const { query } = await import('../lib/postgresql')
    const result = await query('SELECT COUNT(*) as count FROM knowledge_chunks')
    const chunkCount = parseInt(result.rows[0].count)
    console.log(`✅ Database connected: ${chunkCount} chunks found\n`)

    if (chunkCount === 0) {
      console.log('⚠️ No knowledge chunks found. Please run PDF processing first.')
      console.log('   Run: npm run process-pdfs\n')
      return
    }

    // Test 2: Check embedding service
    console.log('2️⃣ Testing local embedding service...')
    const { LocalEmbeddingService } = await import('../lib/rag/local-embedding-service')
    const embeddingService = new LocalEmbeddingService()
    
    const testQuery = 'What is electrical safety?'
    console.log(`   Query: "${testQuery}"`)
    
    const embedding = await embeddingService.embedQuery(testQuery)
    console.log(`✅ Embedding generated: ${embedding.length} dimensions\n`)

    // Test 3: Test vector search
    console.log('3️⃣ Testing vector search...')
    const { VectorSearchService } = await import('../lib/rag/vector-search')
    const searchService = new VectorSearchService()
    
    const searchResults = await searchService.search({
      query: testQuery,
      course: 'electrician',
      topK: 3,
      minSimilarity: 0.5
    })
    
    console.log(`✅ Search completed: ${searchResults.length} results found`)
    searchResults.forEach((result, i) => {
      console.log(`   ${i + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}% - ${result.source.module}`)
    })
    console.log()

    // Test 4: Test context builder
    console.log('4️⃣ Testing context builder...')
    const { ContextBuilder } = await import('../lib/rag/context-builder')
    const contextBuilder = new ContextBuilder()
    
    const chatContext = await contextBuilder.buildChatContext(testQuery, {
      course: 'electrician',
      topK: 3,
      minSimilarity: 0.5
    })
    
    console.log(`✅ Context built: ${chatContext.chunkCount} chunks, ${chatContext.relevantContent.length} characters`)
    console.log(`   Preview: ${chatContext.relevantContent.substring(0, 100)}...\n`)

    // Test 5: Test Gemini API
    console.log('5️⃣ Testing Gemini API...')
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    
    if (!process.env.GEMINI_API_KEY) {
      console.log('❌ GEMINI_API_KEY not found in environment variables\n')
      return
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    const prompt = `You are an ITI instructor. Answer this question briefly: ${testQuery}

Context: ${chatContext.relevantContent.substring(0, 500)}

Answer:`
    
    const result2 = await model.generateContent(prompt)
    const response = result2.response.text()
    
    console.log(`✅ Gemini response generated (${response.length} characters)`)
    console.log(`   Response: ${response.substring(0, 150)}...\n`)

    console.log('🎉 All tests passed! RAG chat system is working correctly.\n')
    console.log('Next steps:')
    console.log('1. Start the dev server: npm run dev')
    console.log('2. Navigate to /chatbot')
    console.log('3. Try asking questions about the course material')

  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('   Error:', error.message)
      console.error('   Stack:', error.stack)
    }
  }
}

testRagChat()
