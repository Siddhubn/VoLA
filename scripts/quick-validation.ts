#!/usr/bin/env tsx

/**
 * Quick Validation Script
 * Tests core RAG system functionality without requiring full PDF processing
 */

import { config } from 'dotenv';
import path from 'path';

// Load .env.local from the project root
config({ path: path.join(process.cwd(), '.env.local') });

import { Pool } from 'pg';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
} as const;

async function quickValidation() {
  console.log(`${colors.bright}${colors.blue}⚡ Quick RAG System Validation${colors.reset}\n`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
    password: 'admin',
  });

  let allPassed = true;

  try {
    // 1. Database connectivity
    console.log(`${colors.cyan}1. Database Connectivity${colors.reset}`);
    try {
      await pool.query('SELECT 1');
      console.log(`   ${colors.green}✅ Connected to PostgreSQL${colors.reset}\n`);
    } catch (error) {
      console.log(`   ${colors.red}❌ Database connection failed${colors.reset}\n`);
      allPassed = false;
    }

    // 2. pgvector extension
    console.log(`${colors.cyan}2. pgvector Extension${colors.reset}`);
    try {
      const result = await pool.query(`SELECT * FROM pg_extension WHERE extname = 'vector'`);
      if (result.rows.length > 0) {
        console.log(`   ${colors.green}✅ pgvector extension installed${colors.reset}\n`);
      } else {
        console.log(`   ${colors.red}❌ pgvector extension not found${colors.reset}\n`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`   ${colors.red}❌ Error checking pgvector${colors.reset}\n`);
      allPassed = false;
    }

    // 3. Required tables
    console.log(`${colors.cyan}3. Database Tables${colors.reset}`);
    const tables = ['knowledge_chunks', 'pdf_documents', 'module_mapping', 'chat_history'];
    for (const table of tables) {
      try {
        await pool.query(`SELECT 1 FROM ${table} LIMIT 1`);
        console.log(`   ${colors.green}✅ ${table}${colors.reset}`);
      } catch (error) {
        console.log(`   ${colors.red}❌ ${table} - not found${colors.reset}`);
        allPassed = false;
      }
    }
    console.log();

    // 4. Module mappings
    console.log(`${colors.cyan}4. Module Mappings${colors.reset}`);
    try {
      const result = await pool.query(`
        SELECT course, COUNT(*) as count
        FROM module_mapping
        GROUP BY course
      `);
      
      if (result.rows.length > 0) {
        for (const row of result.rows) {
          console.log(`   ${colors.green}✅ ${row.course}: ${row.count} modules${colors.reset}`);
        }
      } else {
        console.log(`   ${colors.yellow}⚠️ No module mappings found${colors.reset}`);
      }
    } catch (error) {
      console.log(`   ${colors.red}❌ Error checking modules${colors.reset}`);
      allPassed = false;
    }
    console.log();

    // 5. PDF files
    console.log(`${colors.cyan}5. PDF Files${colors.reset}`);
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const pdfFiles = [
      'fitter/Fitter - 1st Year - TP (NSQF 2022).pdf',
      'fitter/Fitter - 1st Year - TT (NSQF 2022).pdf',
      'electrician/Electrician - 1st year - TP (NSQF 2022).pdf',
      'electrician/Electrician - 1st year - TT (NSQF 2022).pdf',
    ];

    let pdfCount = 0;
    for (const file of pdfFiles) {
      try {
        await fs.access(path.join(process.cwd(), file));
        pdfCount++;
      } catch (error) {
        // File doesn't exist
      }
    }
    
    if (pdfCount === 4) {
      console.log(`   ${colors.green}✅ All 4 ITI PDFs present${colors.reset}\n`);
    } else {
      console.log(`   ${colors.yellow}⚠️ Only ${pdfCount}/4 PDFs found${colors.reset}\n`);
    }

    // 6. Environment variables
    console.log(`${colors.cyan}6. Environment Configuration${colors.reset}`);
    const requiredEnvVars = ['DATABASE_URL', 'GEMINI_API_KEY'];
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`   ${colors.green}✅ ${envVar} set${colors.reset}`);
      } else {
        console.log(`   ${colors.red}❌ ${envVar} not set${colors.reset}`);
        allPassed = false;
      }
    }
    console.log();

    // 7. Processing status
    console.log(`${colors.cyan}7. PDF Processing Status${colors.reset}`);
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE processing_status = 'completed') as completed
        FROM pdf_documents
      `);
      
      const { total, completed } = result.rows[0];
      
      if (parseInt(total) === 0) {
        console.log(`   ${colors.yellow}⚠️ No PDFs processed yet${colors.reset}`);
        console.log(`   ${colors.cyan}→ Run: npm run process-pdfs${colors.reset}\n`);
      } else if (parseInt(completed) < 4) {
        console.log(`   ${colors.yellow}⚠️ ${completed}/${total} PDFs processed${colors.reset}`);
        console.log(`   ${colors.cyan}→ Need to process ITI PDFs${colors.reset}\n`);
      } else {
        console.log(`   ${colors.green}✅ ${completed} PDFs processed${colors.reset}\n`);
      }
    } catch (error) {
      console.log(`   ${colors.red}❌ Error checking processing status${colors.reset}\n`);
    }

    // Summary
    console.log(`${colors.bright}${'='.repeat(50)}${colors.reset}`);
    if (allPassed) {
      console.log(`${colors.green}${colors.bright}✅ System Ready${colors.reset}`);
      console.log(`\n${colors.cyan}Next step: Process PDFs${colors.reset}`);
      console.log(`${colors.cyan}Command: npm run process-pdfs${colors.reset}`);
    } else {
      console.log(`${colors.red}${colors.bright}❌ System Issues Detected${colors.reset}`);
      console.log(`\n${colors.cyan}Fix the issues above before processing PDFs${colors.reset}`);
    }
    console.log(`${colors.bright}${'='.repeat(50)}${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}Fatal error: ${(error as Error).message}${colors.reset}`);
    allPassed = false;
  } finally {
    await pool.end();
  }

  process.exit(allPassed ? 0 : 1);
}

quickValidation();
