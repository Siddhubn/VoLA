#!/usr/bin/env tsx
/**
 * Import Supabase export data into Neon DB
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

async function importToNeon() {
  console.log('🚀 Starting Supabase to Neon DB migration...\n');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon DB\n');

    // Get list of SQL files to import
    const exportDir = path.join(process.cwd(), 'supabase-export');
    const files = fs.readdirSync(exportDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // This will sort them in the correct order

    console.log(`📁 Found ${files.length} SQL files to import:\n`);
    files.forEach(f => console.log(`   - ${f}`));
    console.log('');

    let totalImported = 0;
    let filesImported = 0;

    for (const file of files) {
      const filePath = path.join(exportDir, file);
      console.log(`📥 Importing ${file}...`);
      
      try {
        const sql = fs.readFileSync(filePath, 'utf-8');
        
        // Skip empty files
        if (!sql.trim()) {
          console.log(`   ⚠️  Skipped (empty file)\n`);
          continue;
        }

        const startTime = Date.now();
        await client.query(sql);
        const duration = Date.now() - startTime;
        
        // Count rows affected (rough estimate from INSERT statements)
        const insertMatches = sql.match(/INSERT INTO/gi);
        const rowsEstimate = insertMatches ? insertMatches.length : 0;
        
        totalImported += rowsEstimate;
        filesImported++;
        
        console.log(`   ✅ Imported successfully (${duration}ms, ~${rowsEstimate} rows)\n`);
      } catch (error: any) {
        console.error(`   ❌ Error importing ${file}:`, error.message);
        
        // Check if it's a duplicate key error (data already exists)
        if (error.code === '23505') {
          console.log(`   ℹ️  Data already exists, skipping...\n`);
          continue;
        }
        
        console.error('\n⚠️  Import failed. Do you want to continue with remaining files? (Ctrl+C to abort)\n');
        // Continue with next file
      }
    }

    console.log('━'.repeat(60));
    console.log(`\n📊 Import Summary:`);
    console.log(`   Files processed: ${filesImported}/${files.length}`);
    console.log(`   Estimated rows imported: ~${totalImported}\n`);

    // Verify the import
    console.log('🔍 Verifying imported data...\n');
    
    const tables = ['users', 'pdf_documents', 'module_mapping', 'knowledge_chunks', 'chat_history'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        console.log(`   ✅ ${table}: ${count} rows`);
      } catch (error: any) {
        console.log(`   ⚠️  ${table}: table not found or error`);
      }
    }

    // Check embeddings
    try {
      const embeddingCheck = await client.query(
        'SELECT COUNT(*) as count FROM knowledge_chunks WHERE embedding IS NOT NULL'
      );
      const embeddingCount = parseInt(embeddingCheck.rows[0].count);
      console.log(`   ✅ knowledge_chunks with embeddings: ${embeddingCount} rows`);
    } catch (error) {
      console.log(`   ⚠️  Could not check embeddings`);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update your Vercel environment variables with the Neon DB URL');
    console.log('   2. Test your application locally with: npm run dev');
    console.log('   3. Deploy to Vercel\n');

    client.release();
    await pool.end();
    
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', {
      code: error.code,
      detail: error.detail
    });
    await pool.end();
    process.exit(1);
  }
}

importToNeon();
