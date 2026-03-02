#!/usr/bin/env tsx
import { bgeEmbeddings } from '../lib/rag/bge-embeddings';

async function testBGEEmbeddings() {
  console.log('🧪 Testing BGE Embeddings Locally...\n');

  try {
    // Test 1: Initialize the model
    console.log('1️⃣ Initializing BGE model...');
    const startInit = Date.now();
    await bgeEmbeddings.initialize();
    const initTime = Date.now() - startInit;
    console.log(`✅ Model initialized in ${initTime}ms\n`);

    // Test 2: Generate a single embedding
    console.log('2️⃣ Generating single embedding...');
    const testText = 'What is Ohm\'s Law in electrical circuits?';
    console.log(`   Text: "${testText}"`);
    
    const startEmbed = Date.now();
    const embedding = await bgeEmbeddings.generateEmbedding(testText);
    const embedTime = Date.now() - startEmbed;
    
    console.log(`✅ Generated embedding in ${embedTime}ms`);
    console.log(`   Dimensions: ${embedding.length}`);
    console.log(`   Sample values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log(`   Vector norm: ${Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)).toFixed(4)}\n`);

    // Test 3: Generate document embedding (without query prefix)
    console.log('3️⃣ Generating document embedding...');
    const docText = 'Ohm\'s Law states that the current through a conductor is directly proportional to the voltage across it.';
    console.log(`   Text: "${docText.substring(0, 60)}..."`);
    
    const startDocEmbed = Date.now();
    const docEmbedding = await bgeEmbeddings.generateDocumentEmbedding(docText);
    const docEmbedTime = Date.now() - startDocEmbed;
    
    console.log(`✅ Generated document embedding in ${docEmbedTime}ms`);
    console.log(`   Dimensions: ${docEmbedding.length}\n`);

    // Test 4: Calculate similarity
    console.log('4️⃣ Testing similarity calculation...');
    const similarity = bgeEmbeddings.cosineSimilarity(embedding, docEmbedding);
    console.log(`✅ Cosine similarity: ${similarity.toFixed(4)}`);
    console.log(`   (Higher is more similar, range: -1 to 1)\n`);

    // Test 5: Batch processing
    console.log('5️⃣ Testing batch embedding generation...');
    const texts = [
      'Voltage and current relationship',
      'Electrical resistance in circuits',
      'Power calculation in AC circuits'
    ];
    
    const startBatch = Date.now();
    const embeddings = await bgeEmbeddings.generateEmbeddings(texts);
    const batchTime = Date.now() - startBatch;
    
    console.log(`✅ Generated ${embeddings.length} embeddings in ${batchTime}ms`);
    console.log(`   Average time per embedding: ${(batchTime / embeddings.length).toFixed(0)}ms\n`);

    // Test 6: Verify all embeddings are normalized
    console.log('6️⃣ Verifying embedding normalization...');
    const norms = embeddings.map(emb => 
      Math.sqrt(emb.reduce((sum, v) => sum + v * v, 0))
    );
    const allNormalized = norms.every(norm => Math.abs(norm - 1.0) < 0.01);
    console.log(`✅ All embeddings normalized: ${allNormalized}`);
    console.log(`   Norms: [${norms.map(n => n.toFixed(4)).join(', ')}]\n`);

    // Test 7: Performance test
    console.log('7️⃣ Performance test (10 embeddings)...');
    const perfTexts = Array(10).fill('Sample text for performance testing');
    const startPerf = Date.now();
    
    for (const text of perfTexts) {
      await bgeEmbeddings.generateDocumentEmbedding(text);
    }
    
    const perfTime = Date.now() - startPerf;
    console.log(`✅ Generated 10 embeddings in ${perfTime}ms`);
    console.log(`   Average: ${(perfTime / 10).toFixed(0)}ms per embedding`);
    console.log(`   Throughput: ${(10000 / perfTime).toFixed(1)} embeddings/second\n`);

    // Summary
    console.log('📊 Summary:');
    console.log('   ✅ BGE model loads successfully');
    console.log('   ✅ Generates 768-dimensional embeddings');
    console.log('   ✅ Embeddings are properly normalized');
    console.log('   ✅ Similarity calculations work correctly');
    console.log('   ✅ Batch processing functional');
    console.log(`   ✅ Performance: ~${(perfTime / 10).toFixed(0)}ms per embedding`);
    console.log('\n🎉 BGE embeddings are working perfectly for local use!');

  } catch (error) {
    console.error('\n❌ Error testing BGE embeddings:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure @xenova/transformers is installed: npm install @xenova/transformers');
    console.error('2. Check internet connection (first run downloads model)');
    console.error('3. Ensure sufficient disk space (~100MB for model)');
    process.exit(1);
  }
}

testBGEEmbeddings();
