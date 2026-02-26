#!/usr/bin/env node

const { Pool } = require('pg')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const DATABASE_URL = process.env.DATABASE_URL

async function testPgVector() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    console.log('Testing pgvector detection...')
    
    // Test 1: Check if extension exists
    const checkExtension = await pool.query(`
      SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'
    `)
    
    console.log('Extension query result:', checkExtension.rows)
    console.log('Row count:', checkExtension.rows.length)
    
    if (checkExtension.rows.length > 0) {
      console.log('✅ pgvector extension found!')
      console.log('Version:', checkExtension.rows[0].extversion)
      
      // Test 2: Try to create a vector column
      try {
        await pool.query('DROP TABLE IF EXISTS test_vector')
        await pool.query('CREATE TABLE test_vector (id SERIAL, embedding vector(3))')
        await pool.query("INSERT INTO test_vector (embedding) VALUES ('[1,2,3]')")
        
        const testResult = await pool.query('SELECT * FROM test_vector')
        console.log('✅ Vector operations work!')
        console.log('Test data:', testResult.rows)
        
        await pool.query('DROP TABLE test_vector')
      } catch (vectorError) {
        console.error('❌ Vector operations failed:', vectorError.message)
      }
    } else {
      console.log('❌ pgvector extension not found')
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

testPgVector()