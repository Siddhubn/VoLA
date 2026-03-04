#!/usr/bin/env tsx
/**
 * Quick RAG Test - Test basic functionality
 */

import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

// Import our helper functions
import { generateEmbedding } from '../lib/rag-helper';
import { getQuizContent } from '../lib/quiz-helper';

async function quickTest() {
  console.log('🧪 Quick RAG Test\n');
  
  try {
    // Test 1: Embedding generation
    console.log('1. Testing embedding generation...');
    const embedding = await generateEmbedding('electrical safety');
    console.log(`   ✅ Generated embedding with ${embedding.length} dimensions`);
    
    // Test 2: Quiz content retrieval
    console.log('\n2. Testing quiz content retrieval...');
    const quizContent = await getQuizContent('module-1', 'TT', 3);
    console.log(`   ✅ Retrieved ${quizContent.length} quiz content chunks`);
    
    if (quizContent.length > 0) {
      console.log(`   Sample: "${quizContent[0].content.substring(0, 100)}..."`);
      console.log(`   Content type: ${quizContent[0].content_type}`);
      console.log(`   Priority: ${quizContent[0].priority}`);
    }
    
    console.log('\n🎉 Quick test completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

quickTest();