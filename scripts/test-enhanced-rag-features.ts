#!/usr/bin/env tsx
/**
 * Test Enhanced RAG Features
 * 
 * This script tests all the enhanced RAG and Quiz features:
 * 1. RAG Helper functions
 * 2. Quiz Helper functions  
 * 3. Content classification
 * 4. Advanced search filtering
 * 5. Context-aware search
 */

import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });

// Import our helper functions
import {
  searchKnowledgeBase,
  contextAwareSearch,
  getModuleContent,
  getSafetyContent,
  getRelatedContent,
  generateEmbedding,
  type RAGChunk,
  type SearchOptions
} from '../lib/rag-helper';

import {
  getQuizContent,
  getBalancedQuizContent,
  getSafetyQuestions,
  getToolsQuestions,
  calculateQuizDifficulty,
  estimateQuizTime,
  type QuizContent
} from '../lib/quiz-helper';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
  duration?: number;
}

class EnhancedRAGTester {
  private results: TestResult[] = [];

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    console.log(`\n🧪 Testing: ${name}`);
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        passed: true,
        duration
      });
      console.log(`   ✅ PASSED (${duration}ms)`);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.results.push({
        name,
        passed: false,
        error: error.message,
        duration
      });
      console.log(`   ❌ FAILED (${duration}ms): ${error.message}`);
    }
  }

  async testRAGHelperFunctions(): Promise<void> {
    console.log('\n🔍 Testing RAG Helper Functions');
    console.log('═'.repeat(50));

    // Test 1: Basic search functionality
    await this.runTest('Basic Knowledge Base Search', async () => {
      const embedding = await generateEmbedding('electrical safety procedures');
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        limit: 5
      });
      
      if (results.length === 0) {
        throw new Error('No results returned from basic search');
      }
      
      console.log(`   Found ${results.length} results`);
      console.log(`   Sample: "${results[0].content.substring(0, 100)}..."`);
    });

    // Test 2: Content type filtering
    await this.runTest('Content Type Filtering', async () => {
      const embedding = await generateEmbedding('safety equipment');
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        contentType: 'safety',
        limit: 3
      });
      
      if (results.length === 0) {
        throw new Error('No safety content found');
      }
      
      // Verify all results are safety content
      const nonSafetyResults = results.filter(r => r.content_type !== 'safety');
      if (nonSafetyResults.length > 0) {
        throw new Error(`Found ${nonSafetyResults.length} non-safety results in safety filter`);
      }
      
      console.log(`   Found ${results.length} safety-specific results`);
    });

    // Test 3: Trade type filtering
    await this.runTest('Trade Type Filtering', async () => {
      const embedding = await generateEmbedding('electrical theory');
      const ttResults = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TT',
        limit: 3
      });
      
      const tpResults = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TP',
        limit: 3
      });
      
      if (ttResults.length === 0 && tpResults.length === 0) {
        throw new Error('No results found for either TT or TP');
      }
      
      console.log(`   TT results: ${ttResults.length}, TP results: ${tpResults.length}`);
    });

    // Test 4: Module-specific content
    await this.runTest('Module Content Retrieval', async () => {
      const results = await getModuleContent('module-1', 'TT');
      
      if (results.length === 0) {
        throw new Error('No module content found');
      }
      
      // Verify all results are from module-1
      const wrongModule = results.filter(r => !r.module_name.includes('1'));
      if (wrongModule.length > 0) {
        console.log(`   Warning: ${wrongModule.length} results may not be from module 1`);
      }
      
      console.log(`   Found ${results.length} chunks from module 1`);
    });

    // Test 5: Safety content retrieval
    await this.runTest('Safety Content Retrieval', async () => {
      const results = await getSafetyContent('TT', 5);
      
      if (results.length === 0) {
        throw new Error('No safety content found');
      }
      
      // Verify high priority
      const lowPriority = results.filter(r => r.priority < 6);
      if (lowPriority.length > results.length * 0.5) {
        console.log(`   Warning: ${lowPriority.length} results have low priority`);
      }
      
      console.log(`   Found ${results.length} high-priority safety chunks`);
      console.log(`   Avg priority: ${(results.reduce((sum, r) => sum + r.priority, 0) / results.length).toFixed(1)}`);
    });

    // Test 6: Context-aware search
    await this.runTest('Context-Aware Search', async () => {
      const embedding = await generateEmbedding('electrical tools');
      const results = await contextAwareSearch(embedding, {
        preferredContentType: 'tools',
        userLevel: 'beginner',
        tradeType: 'TT'
      });
      
      if (results.length === 0) {
        throw new Error('No context-aware results found');
      }
      
      console.log(`   Found ${results.length} context-aware results`);
      console.log(`   Content types: ${[...new Set(results.map(r => r.content_type))].join(', ')}`);
    });

    // Test 7: Related content discovery
    await this.runTest('Related Content Discovery', async () => {
      const results = await getRelatedContent('module-1', 'TT', undefined, 3);
      
      if (results.length === 0) {
        throw new Error('No related content found');
      }
      
      console.log(`   Found ${results.length} related content chunks`);
    });
  }

  async testQuizHelperFunctions(): Promise<void> {
    console.log('\n🎯 Testing Quiz Helper Functions');
    console.log('═'.repeat(50));

    // Test 1: Basic quiz content retrieval
    await this.runTest('Basic Quiz Content', async () => {
      const results = await getQuizContent('module-1', 'TT', 5);
      
      if (results.length === 0) {
        throw new Error('No quiz content found');
      }
      
      console.log(`   Found ${results.length} quiz content chunks`);
      console.log(`   Content types: ${[...new Set(results.map(r => r.content_type))].join(', ')}`);
    });

    // Test 2: Balanced quiz content
    await this.runTest('Balanced Quiz Content', async () => {
      const result = await getBalancedQuizContent('module-1', 'TT', 10);
      const { content, distribution } = result;
      
      if (content.length === 0) {
        throw new Error('No balanced content found');
      }
      
      console.log(`   Found ${content.length} balanced content chunks`);
      console.log(`   Distribution:`, distribution);
      
      // Verify we have multiple content types
      const uniqueTypes = new Set(content.map(c => c.content_type));
      if (uniqueTypes.size < 2) {
        console.log(`   Warning: Only ${uniqueTypes.size} content types found`);
      }
    });

    // Test 3: Safety questions
    await this.runTest('Safety Questions', async () => {
      const results = await getSafetyQuestions('TT', 3);
      
      if (results.length === 0) {
        throw new Error('No safety questions found');
      }
      
      // Verify all are safety content
      const nonSafety = results.filter(r => r.content_type !== 'safety');
      if (nonSafety.length > 0) {
        throw new Error(`Found ${nonSafety.length} non-safety results in safety questions`);
      }
      
      console.log(`   Found ${results.length} safety question content`);
      console.log(`   Avg priority: ${(results.reduce((sum, r) => sum + r.priority, 0) / results.length).toFixed(1)}`);
    });

    // Test 4: Tools questions
    await this.runTest('Tools Questions', async () => {
      const results = await getToolsQuestions('module-1', 'TT', 3);
      
      if (results.length === 0) {
        console.log('   No tools content found for module-1 (this may be normal)');
        return;
      }
      
      console.log(`   Found ${results.length} tools question content`);
    });

    // Test 5: Difficulty calculation
    await this.runTest('Difficulty Calculation', async () => {
      const content = await getQuizContent('module-1', 'TT', 5);
      
      if (content.length === 0) {
        throw new Error('No content for difficulty calculation');
      }
      
      const difficulty = calculateQuizDifficulty(content);
      
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        throw new Error(`Invalid difficulty: ${difficulty}`);
      }
      
      console.log(`   Calculated difficulty: ${difficulty}`);
      console.log(`   Avg priority: ${(content.reduce((sum, c) => sum + c.priority, 0) / content.length).toFixed(1)}`);
    });

    // Test 6: Time estimation
    await this.runTest('Time Estimation', async () => {
      const time1 = estimateQuizTime(10, 'easy');
      const time2 = estimateQuizTime(10, 'medium');
      const time3 = estimateQuizTime(10, 'hard');
      
      if (time1 >= time2 || time2 >= time3) {
        throw new Error('Time estimation not increasing with difficulty');
      }
      
      console.log(`   Easy (10q): ${time1}s, Medium: ${time2}s, Hard: ${time3}s`);
    });
  }

  async testContentClassification(): Promise<void> {
    console.log('\n🏷️  Testing Content Classification');
    console.log('═'.repeat(50));

    // Test 1: Content type distribution
    await this.runTest('Content Type Distribution', async () => {
      const embedding = await generateEmbedding('test query');
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        limit: 20
      });
      
      if (results.length === 0) {
        throw new Error('No results for content type analysis');
      }
      
      const typeDistribution = results.reduce((acc, r) => {
        acc[r.content_type] = (acc[r.content_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`   Content types found:`, typeDistribution);
      
      // Verify we have classified content
      if (Object.keys(typeDistribution).length < 2) {
        throw new Error('Insufficient content type diversity');
      }
    });

    // Test 2: Priority distribution
    await this.runTest('Priority Distribution', async () => {
      const embedding = await generateEmbedding('electrical safety');
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        limit: 15
      });
      
      if (results.length === 0) {
        throw new Error('No results for priority analysis');
      }
      
      const priorities = results.map(r => r.priority);
      const avgPriority = priorities.reduce((sum, p) => sum + p, 0) / priorities.length;
      const minPriority = Math.min(...priorities);
      const maxPriority = Math.max(...priorities);
      
      console.log(`   Priority range: ${minPriority}-${maxPriority}, avg: ${avgPriority.toFixed(1)}`);
      
      if (minPriority < 1 || maxPriority > 10) {
        throw new Error(`Invalid priority range: ${minPriority}-${maxPriority}`);
      }
    });

    // Test 3: Topic keywords
    await this.runTest('Topic Keywords', async () => {
      const results = await getModuleContent('module-1', 'TT', undefined, 5);
      
      if (results.length === 0) {
        throw new Error('No content for keyword analysis');
      }
      
      const withKeywords = results.filter(r => r.topic_keywords && r.topic_keywords.length > 0);
      const keywordCoverage = withKeywords.length / results.length;
      
      console.log(`   Keyword coverage: ${(keywordCoverage * 100).toFixed(1)}% (${withKeywords.length}/${results.length})`);
      
      if (keywordCoverage < 0.5) {
        console.log('   Warning: Low keyword coverage');
      }
      
      // Show sample keywords
      if (withKeywords.length > 0) {
        const sampleKeywords = withKeywords[0].topic_keywords.slice(0, 5);
        console.log(`   Sample keywords: ${sampleKeywords.join(', ')}`);
      }
    });
  }

  async testAdvancedFiltering(): Promise<void> {
    console.log('\n🔧 Testing Advanced Search Filtering');
    console.log('═'.repeat(50));

    // Test 1: Priority filtering
    await this.runTest('Priority Filtering', async () => {
      const embedding = await generateEmbedding('electrical concepts');
      
      const lowPriorityResults = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        minPriority: 1,
        limit: 10
      });
      
      const highPriorityResults = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        minPriority: 7,
        limit: 10
      });
      
      console.log(`   Low priority (>=1): ${lowPriorityResults.length} results`);
      console.log(`   High priority (>=7): ${highPriorityResults.length} results`);
      
      // Verify priority filtering works
      const invalidHighPriority = highPriorityResults.filter(r => r.priority < 7);
      if (invalidHighPriority.length > 0) {
        throw new Error(`Found ${invalidHighPriority.length} results with priority < 7 in high priority search`);
      }
    });

    // Test 2: Distance threshold filtering
    await this.runTest('Distance Threshold Filtering', async () => {
      const embedding = await generateEmbedding('electrical safety equipment');
      
      const strictResults = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        maxDistance: 0.3,
        limit: 10
      });
      
      const relaxedResults = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        maxDistance: 0.7,
        limit: 10
      });
      
      console.log(`   Strict (≤0.3): ${strictResults.length} results`);
      console.log(`   Relaxed (≤0.7): ${relaxedResults.length} results`);
      
      if (strictResults.length > relaxedResults.length) {
        throw new Error('Strict search returned more results than relaxed search');
      }
    });

    // Test 3: Combined filtering
    await this.runTest('Combined Filtering', async () => {
      const embedding = await generateEmbedding('safety procedures');
      
      const results = await searchKnowledgeBase(embedding, {
        trade: 'electrician',
        tradeType: 'TT',
        contentType: 'safety',
        minPriority: 6,
        maxDistance: 0.5,
        limit: 5
      });
      
      console.log(`   Combined filter results: ${results.length}`);
      
      if (results.length > 0) {
        // Verify all filters applied correctly
        const violations = results.filter(r => 
          r.trade_type !== 'TT' || 
          r.content_type !== 'safety' || 
          r.priority < 6 ||
          r.distance > 0.5
        );
        
        if (violations.length > 0) {
          throw new Error(`${violations.length} results violated filter criteria`);
        }
        
        console.log(`   All ${results.length} results match filter criteria`);
      }
    });
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Enhanced RAG Features Test Suite');
    console.log('═'.repeat(60));
    
    try {
      await this.testRAGHelperFunctions();
      await this.testQuizHelperFunctions();
      await this.testContentClassification();
      await this.testAdvancedFiltering();
      
      this.printSummary();
      
    } catch (error: any) {
      console.error('\n❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  private printSummary(): void {
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 Test Summary');
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalTime = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
    
    console.log(`\n✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total time: ${totalTime}ms`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`   • ${r.name}: ${r.error}`);
      });
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed! Enhanced RAG features are working correctly.');
    }
  }
}

// Run tests
async function main() {
  const tester = new EnhancedRAGTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { EnhancedRAGTester };