# Import Data to Supabase

## Step-by-Step Instructions

### 1. Setup Schema First

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of `scripts/supabase-setup.sql`
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Wait for completion - you should see a verification table showing all tables created

### 2. Import Data Files

Import the files in this order:

#### A. Import Users (Optional - if you have users)
1. Open `01-users.sql`
2. Copy all contents
3. In Supabase SQL Editor, create a new query
4. Paste and run

#### B. Import Module Mappings
1. Open `02-module-mapping.sql`
2. Copy all contents
3. In Supabase SQL Editor, create a new query
4. Paste and run

#### C. Import PDF Documents
1. Open `03-pdf-documents.sql`
2. Copy all contents
3. In Supabase SQL Editor, create a new query
4. Paste and run

#### D. Import Knowledge Chunks (This is the big one!)

You have **12 chunk files** to import.

**Important:** Import them one at a time in order:

1. Open `04-knowledge-chunks-001.sql`
2. Copy all contents
3. In Supabase SQL Editor, create a new query
4. Paste and run
5. Wait for completion
6. Repeat for `04-knowledge-chunks-002.sql`, `003.sql`, etc.

**Tips:**
- Each file contains ~50 chunks
- Each import takes 5-10 seconds
- If you get a timeout, the batch size is too large - let me know
- You can run multiple queries in parallel if you want to speed up

#### E. Import Chat History (Optional)
1. If `05-chat-history.sql` exists, import it
2. Copy contents and run in SQL Editor

### 3. Verify Import

After importing all files, run this query in SQL Editor:

```sql
-- Check row counts
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'pdf_documents', COUNT(*) FROM pdf_documents
UNION ALL
SELECT 'module_mapping', COUNT(*) FROM module_mapping
UNION ALL
SELECT 'knowledge_chunks', COUNT(*) FROM knowledge_chunks
UNION ALL
SELECT 'knowledge_chunks with embeddings', COUNT(*) FROM knowledge_chunks WHERE embedding IS NOT NULL
UNION ALL
SELECT 'chat_history', COUNT(*) FROM chat_history;
```

Expected results:
- knowledge_chunks: 551 rows
- knowledge_chunks with embeddings: 551 rows
- module_mapping: ~20-30 rows
- pdf_documents: ~1-5 rows

### 4. Test Vector Search

Run this test query to verify embeddings work:

```sql
-- Test vector search (using a dummy embedding)
SELECT 
  id, 
  course, 
  module_name, 
  content_preview,
  1 - (embedding <=> '[0.1,0.2,0.3,...]'::vector(384)) as similarity
FROM knowledge_chunks
WHERE embedding IS NOT NULL
LIMIT 5;
```

If this returns results, your vector embeddings are working!

### 5. Update Your Application

Update your `.env.local` or Vercel environment variables:

```bash
DATABASE_URL=postgresql://postgres:InternXcelerator@db.inuxbdcxpmucqtsgqthz.supabase.co:5432/postgres
```

## Troubleshooting

### "Statement timeout" error
- The batch is too large
- Try importing fewer chunks at a time
- Contact me to regenerate with smaller batches

### "Duplicate key" error
- Data already exists
- Either skip that file or delete existing data first:
  ```sql
  TRUNCATE TABLE knowledge_chunks CASCADE;
  ```

### "Invalid vector" error
- Embedding format is wrong
- Make sure pgvector extension is enabled
- Check that vector dimension is 384

## Need Help?

If you encounter any issues:
1. Check which file/line caused the error
2. Share the error message
3. I can help debug or regenerate the export

## Progress Tracking

Keep track of which files you've imported:

- [ ] 01-users.sql
- [ ] 02-module-mapping.sql
- [ ] 03-pdf-documents.sql
- [ ] 04-knowledge-chunks-001.sql
- [ ] 04-knowledge-chunks-002.sql
- [ ] ... (continue for all 12 files)
- [ ] 05-chat-history.sql (if exists)

---

**Estimated Time:** 10-15 minutes for all imports
