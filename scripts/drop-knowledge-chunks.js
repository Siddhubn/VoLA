#!/usr/bin/env node

const { Pool } = require('pg')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const DATABASE_URL = process.env.DATABASE_URL

console.log('🔄 Dropping knowledge_chunks table...\n')

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local')
  process.exit(1)
}

async function dropTable() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    await pool.query('DROP TABLE IF EXISTS knowledge_chunks CASCADE')
    console.log('✅ knowledge_chunks table dropped successfully')
  } catch (error) {
    console.error('❌ Error dropping table:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

dropTable()
