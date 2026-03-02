-- ============================================
-- Quick Import Status Check
-- Run this to see what's been imported so far
-- ============================================

-- Check if tables exist and have data
SELECT 
  'users' as table_name, 
  COUNT(*) as rows_imported,
  CASE 
    WHEN COUNT(*) = 0 THEN '⏳ Not imported yet'
    WHEN COUNT(*) >= 1 THEN '✅ Imported'
    ELSE '❓ Unknown'
  END as status
FROM users

UNION ALL

SELECT 
  'module_mapping', 
  COUNT(*),
  CASE 
    WHEN COUNT(*) = 0 THEN '⏳ Not imported yet'
    WHEN COUNT(*) >= 6 THEN '✅ Imported'
    ELSE '⚠️ Partially imported'
  END
FROM module_mapping

UNION ALL

SELECT 
  'pdf_documents', 
  COUNT(*),
  CASE 
    WHEN COUNT(*) = 0 THEN '⏳ Not imported yet'
    WHEN COUNT(*) >= 3 THEN '✅ Imported'
    ELSE '⚠️ Partially imported'
  END
FROM pdf_documents

UNION ALL

SELECT 
  'knowledge_chunks', 
  COUNT(*),
  CASE 
    WHEN COUNT(*) = 0 THEN '⏳ Not imported yet'
    WHEN COUNT(*) = 551 THEN '✅ All imported'
    WHEN COUNT(*) < 551 THEN '⚠️ Partially imported (' || COUNT(*) || '/551)'
    ELSE '❓ More than expected'
  END
FROM knowledge_chunks

UNION ALL

SELECT 
  'chunks with embeddings', 
  COUNT(*),
  CASE 
    WHEN COUNT(*) = 0 THEN '⏳ No embeddings yet'
    WHEN COUNT(*) = 551 THEN '✅ All have embeddings'
    WHEN COUNT(*) < 551 THEN '⚠️ Some missing (' || COUNT(*) || '/551)'
    ELSE '❓ More than expected'
  END
FROM knowledge_chunks
WHERE embedding IS NOT NULL

UNION ALL

SELECT 
  'chat_history', 
  COUNT(*),
  CASE 
    WHEN COUNT(*) = 0 THEN '⏳ Not imported yet'
    WHEN COUNT(*) >= 40 THEN '✅ Imported'
    ELSE '⚠️ Partially imported'
  END
FROM chat_history;

-- Expected final result:
-- users: 1 row - ✅ Imported
-- module_mapping: 6 rows - ✅ Imported
-- pdf_documents: 3 rows - ✅ Imported
-- knowledge_chunks: 551 rows - ✅ All imported
-- chunks with embeddings: 551 rows - ✅ All have embeddings
-- chat_history: 40 rows - ✅ Imported
