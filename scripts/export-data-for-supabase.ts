#!/usr/bin/env tsx
/**
 * Export local database data to SQL INSERT statements
 * These can be run directly in Supabase SQL Editor
 */

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import fs from 'fs/promises';

config({ path: path.join(process.cwd(), '.env.local') });

const localPool = new Pool({
  connectionString: 'postgresql://postgres:admin@localhost:5433/vola_db',
});

async function exportData() {
  try {
    console.log('📦 Exporting data from local database...\n');

    // Create export directory
    await fs.mkdir('supabase-export', { recursive: true });

    // 1. Export users
    console.log('👥 Exporting users...');
    const users = await localPool.query('SELECT * FROM users ORDER BY id');
    await exportToSQL('users', users.rows, 'supabase-export/01-users.sql');
    console.log(`✅ Exported ${users.rows.length} users\n`);

    // 2. Export module_mapping
    console.log('📚 Exporting module mappings...');
    const modules = await localPool.query('SELECT * FROM module_mapping ORDER BY id');
    await exportToSQL('module_mapping', modules.rows, 'supabase-export/02-module-mapping.sql');
    console.log(`✅ Exported ${modules.rows.length} module mappings\n`);

    // 3. Export pdf_documents
    console.log('📄 Exporting PDF documents...');
    const pdfs = await localPool.query('SELECT * FROM pdf_documents ORDER BY id');
    await exportToSQL('pdf_documents', pdfs.rows, 'supabase-export/03-pdf-documents.sql');
    console.log(`✅ Exported ${pdfs.rows.length} PDF documents\n`);

    // 4. Export knowledge_chunks (in batches)
    console.log('🧠 Exporting knowledge chunks with embeddings...');
    const countResult = await localPool.query('SELECT COUNT(*) FROM knowledge_chunks');
    const totalChunks = parseInt(countResult.rows[0].count);
    console.log(`   Total chunks to export: ${totalChunks}`);

    const batchSize = 50; // Smaller batches for SQL Editor
    let exportedCount = 0;
    let fileIndex = 1;

    for (let offset = 0; offset < totalChunks; offset += batchSize) {
      const chunks = await localPool.query(
        'SELECT * FROM knowledge_chunks ORDER BY id LIMIT $1 OFFSET $2',
        [batchSize, offset]
      );

      await exportToSQL(
        'knowledge_chunks',
        chunks.rows,
        `supabase-export/04-knowledge-chunks-${String(fileIndex).padStart(3, '0')}.sql`
      );

      exportedCount += chunks.rows.length;
      fileIndex++;
      console.log(`   Progress: ${exportedCount}/${totalChunks} chunks exported`);
    }
    console.log(`✅ Exported ${exportedCount} knowledge chunks in ${fileIndex - 1} files\n`);

    // 5. Export chat_history (if any)
    console.log('💬 Exporting chat history...');
    const chats = await localPool.query('SELECT * FROM chat_history ORDER BY id');
    if (chats.rows.length > 0) {
      await exportToSQL('chat_history', chats.rows, 'supabase-export/05-chat-history.sql');
      console.log(`✅ Exported ${chats.rows.length} chat messages\n`);
    } else {
      console.log('   No chat history to export\n');
    }

    // Create import instructions
    await createImportInstructions(fileIndex - 1);

    console.log('🎉 Export complete!');
    console.log('\n📁 Files created in: supabase-export/');
    console.log('📋 Next: Follow instructions in supabase-export/IMPORT-INSTRUCTIONS.md\n');

  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  } finally {
    await localPool.end();
  }
}

async function exportToSQL(tableName: string, rows: any[], filename: string): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const lines: string[] = [];
  lines.push(`-- Import data for ${tableName}`);
  lines.push(`-- Total rows: ${rows.length}`);
  lines.push('');

  for (const row of rows) {
    const columns = Object.keys(row);
    const values = columns.map(col => {
      const value = row[col];
      
      if (value === null || value === undefined) {
        return 'NULL';
      }
      
      if (typeof value === 'string') {
        // Escape single quotes
        return `'${value.replace(/'/g, "''")}'`;
      }
      
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
      
      if (value instanceof Date) {
        return `'${value.toISOString()}'`;
      }
      
      if (Array.isArray(value)) {
        // Handle arrays (for keywords, skills, etc.)
        if (value.length === 0) {
          return "'{}'";
        }
        const arrayValues = value.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(',');
        return `'{${arrayValues}}'`;
      }
      
      if (typeof value === 'object') {
        // Handle JSONB
        return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
      }
      
      // Handle vector embeddings
      if (col === 'embedding' && typeof value === 'string') {
        return `'${value}'::vector`;
      }
      
      return value;
    });

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
    lines.push(sql);
  }

  lines.push('');
  await fs.writeFile(filename, lines.join('\n'), 'utf-8');
}

async function createImportInstructions(numChunkFiles: number): Promise<void> {
  const instructions = `# Import Data to Supabase

## Step-by-Step Instructions

### 1. Setup Schema First

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the contents of \`scripts/supabase-setup.sql\`
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)
8. Wait for completion - you should see a verification table showing all tables created

### 2. Import Data Files

Import the files in this order:

#### A. Import Users (Optional - if you have users)
1. Open \`01-users.sql\`
2. Copy all contents
3. In Supabase SQL Editor, create a new query
4. Paste and run

#### B. Import Module Mappings
1. Open \`02-module-mapping.sql\`
2. Copy all contents
3. In Supabase SQL Editor, create a new query
4. Paste and run

#### C. Import PDF Documents
1. Open \`03-pdf-documents.sql\`
2. Copy all contents
3. In Supabase SQL Editor, create a new query
4. Paste and run

#### D. Import Knowledge Chunks (This is the big one!)

You have **${numChunkFiles} chunk files** to import.

**Important:** Import them one at a time in order:

1. Open \`04-knowledge-chunks-001.sql\`
2. Copy all contents
3. In Supabase SQL Editor, create a new query
4. Paste and run
5. Wait for completion
6. Repeat for \`04-knowledge-chunks-002.sql\`, \`003.sql\`, etc.

**Tips:**
- Each file contains ~50 chunks
- Each import takes 5-10 seconds
- If you get a timeout, the batch size is too large - let me know
- You can run multiple queries in parallel if you want to speed up

#### E. Import Chat History (Optional)
1. If \`05-chat-history.sql\` exists, import it
2. Copy contents and run in SQL Editor

### 3. Verify Import

After importing all files, run this query in SQL Editor:

\`\`\`sql
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
\`\`\`

Expected results:
- knowledge_chunks: 551 rows
- knowledge_chunks with embeddings: 551 rows
- module_mapping: ~20-30 rows
- pdf_documents: ~1-5 rows

### 4. Test Vector Search

Run this test query to verify embeddings work:

\`\`\`sql
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
\`\`\`

If this returns results, your vector embeddings are working!

### 5. Update Your Application

Update your \`.env.local\` or Vercel environment variables:

\`\`\`bash
DATABASE_URL=postgresql://postgres:InternXcelerator@db.inuxbdcxpmucqtsgqthz.supabase.co:5432/postgres
\`\`\`

## Troubleshooting

### "Statement timeout" error
- The batch is too large
- Try importing fewer chunks at a time
- Contact me to regenerate with smaller batches

### "Duplicate key" error
- Data already exists
- Either skip that file or delete existing data first:
  \`\`\`sql
  TRUNCATE TABLE knowledge_chunks CASCADE;
  \`\`\`

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
- [ ] ... (continue for all ${numChunkFiles} files)
- [ ] 05-chat-history.sql (if exists)

---

**Estimated Time:** 10-15 minutes for all imports
`;

  await fs.writeFile('supabase-export/IMPORT-INSTRUCTIONS.md', instructions, 'utf-8');
}

// Run export
exportData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
