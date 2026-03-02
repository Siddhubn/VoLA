-- ============================================
-- Supabase Import Verification Script
-- Run this after importing all data
-- ============================================

-- 1. Check row counts
SELECT '=== ROW COUNTS ===' as section;

SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'pdf_documents', COUNT(*) FROM pdf_documents
UNION ALL
SELECT 'module_mapping', COUNT(*) FROM module_mapping
UNION ALL
SELECT 'knowledge_chunks', COUNT(*) FROM knowledge_chunks
UNION ALL
SELECT 'chunks with embeddings', COUNT(*) FROM knowledge_chunks WHERE embedding IS NOT NULL
UNION ALL
SELECT 'chat_history', COUNT(*) FROM chat_history
UNION ALL
SELECT 'quiz_history', COUNT(*) FROM quiz_history;

-- Expected:
-- users: 1
-- pdf_documents: 3
-- module_mapping: 6
-- knowledge_chunks: 551
-- chunks with embeddings: 551
-- chat_history: 40
-- quiz_history: 0 (unless you have quiz data)

-- 2. Check knowledge chunks by course
SELECT '=== CHUNKS BY COURSE ===' as section;

SELECT 
  course,
  COUNT(*) as total_chunks,
  COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings,
  COUNT(DISTINCT module) as unique_modules
FROM knowledge_chunks
GROUP BY course;

-- Expected:
-- electrician: 551 chunks, 551 with embeddings

-- 3. Check module distribution
SELECT '=== MODULE DISTRIBUTION ===' as section;

SELECT 
  course,
  module,
  module_name,
  COUNT(*) as chunk_count
FROM knowledge_chunks
GROUP BY course, module, module_name
ORDER BY course, module;

-- 4. Sample knowledge chunks
SELECT '=== SAMPLE CHUNKS ===' as section;

SELECT 
  id,
  course,
  module_name,
  page_number,
  LEFT(content, 100) as content_preview,
  CASE WHEN embedding IS NOT NULL THEN '✅ Has embedding' ELSE '❌ No embedding' END as embedding_status
FROM knowledge_chunks
ORDER BY id
LIMIT 5;

-- 5. Test vector search functionality
SELECT '=== VECTOR SEARCH TEST ===' as section;

-- This tests if vector operations work
-- Using the first chunk's embedding to find similar chunks
WITH first_embedding AS (
  SELECT embedding FROM knowledge_chunks WHERE embedding IS NOT NULL LIMIT 1
)
SELECT 
  id,
  course,
  module_name,
  LEFT(content, 80) as preview,
  ROUND((1 - (embedding <=> (SELECT embedding FROM first_embedding)))::numeric, 4) as similarity
FROM knowledge_chunks
WHERE embedding IS NOT NULL
ORDER BY embedding <=> (SELECT embedding FROM first_embedding)
LIMIT 5;

-- If this returns 5 results, vector search is working!

-- 6. Check indexes
SELECT '=== INDEXES ===' as section;

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'pdf_documents', 'module_mapping', 'knowledge_chunks', 'chat_history')
ORDER BY tablename, indexname;

-- 7. Check pgvector extension
SELECT '=== PGVECTOR EXTENSION ===' as section;

SELECT 
  extname as extension_name,
  extversion as version,
  '✅ Installed' as status
FROM pg_extension
WHERE extname = 'vector';

-- 8. Database size
SELECT '=== DATABASE SIZE ===' as section;

SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- Verification Complete!
-- ============================================

SELECT '=== VERIFICATION SUMMARY ===' as section;

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM knowledge_chunks WHERE embedding IS NOT NULL) = 551 
    THEN '✅ All embeddings imported correctly'
    ELSE '❌ Some embeddings missing'
  END as embedding_check,
  CASE 
    WHEN (SELECT COUNT(*) FROM knowledge_chunks) = 551 
    THEN '✅ All chunks imported'
    ELSE '❌ Some chunks missing'
  END as chunk_check,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
    THEN '✅ pgvector enabled'
    ELSE '❌ pgvector not enabled'
  END as pgvector_check;
