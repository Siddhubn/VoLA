#!/usr/bin/env tsx

/**
 * Clear RAG Data Script
 * Clears all PDF processing data to start fresh
 */

import { config } from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
} as const;

async function clearRagData() {
  console.log(`${colors.bright}${colors.blue}🧹 Clear RAG Data${colors.reset}\n`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
    password: 'admin',
  });

  try {
    console.log(`${colors.cyan}Connecting to database...${colors.reset}`);
    await pool.query('SELECT 1');
    console.log(`${colors.green}✅ Connected${colors.reset}\n`);

    // Get current counts
    console.log(`${colors.cyan}Current data:${colors.reset}`);
    
    const pdfCount = await pool.query('SELECT COUNT(*) as count FROM pdf_documents');
    const chunkCount = await pool.query('SELECT COUNT(*) as count FROM knowledge_chunks');
    const chatCount = await pool.query('SELECT COUNT(*) as count FROM chat_history');
    
    console.log(`  PDFs: ${pdfCount.rows[0].count}`);
    console.log(`  Chunks: ${chunkCount.rows[0].count}`);
    console.log(`  Chat history: ${chatCount.rows[0].count}\n`);

    if (parseInt(pdfCount.rows[0].count) === 0 && parseInt(chunkCount.rows[0].count) === 0) {
      console.log(`${colors.green}✅ Database is already clean!${colors.reset}`);
      return;
    }

    // Clear data
    console.log(`${colors.yellow}⚠️  Clearing all RAG data...${colors.reset}`);
    
    // Delete in correct order (respecting foreign keys)
    await pool.query('DELETE FROM chat_history');
    console.log(`${colors.green}✅ Cleared chat_history (all chat messages)${colors.reset}`);
    
    await pool.query('DELETE FROM knowledge_chunks');
    console.log(`${colors.green}✅ Cleared knowledge_chunks (all embeddings and content)${colors.reset}`);
    
    await pool.query('DELETE FROM pdf_documents');
    console.log(`${colors.green}✅ Cleared pdf_documents (all PDF records)${colors.reset}`);

    // Reset sequences
    await pool.query('ALTER SEQUENCE pdf_documents_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE knowledge_chunks_id_seq RESTART WITH 1');
    await pool.query('ALTER SEQUENCE chat_history_id_seq RESTART WITH 1');
    console.log(`${colors.green}✅ Reset ID sequences${colors.reset}\n`);

    console.log(`${colors.bright}${colors.green}🎉 Database cleared successfully!${colors.reset}`);
    console.log(`${colors.cyan}All knowledge chunks and embeddings have been removed.${colors.reset}`);
    console.log(`\n${colors.cyan}Ready to process PDFs:${colors.reset}`);
    console.log(`${colors.cyan}npm run process-pdfs${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}❌ Error: ${(error as Error).message}${colors.reset}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

clearRagData();
