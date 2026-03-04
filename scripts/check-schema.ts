#!/usr/bin/env tsx
import { config } from 'dotenv'
import path from 'path'

config({ path: path.join(process.cwd(), '.env.local') })

async function checkSchema() {
  const { query } = await import('../lib/postgresql')
  
  console.log('📋 Checking knowledge_chunks schema...\n')
  
  const result = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'knowledge_chunks' 
    ORDER BY ordinal_position
  `)
  
  console.log('Columns:')
  result.rows.forEach(row => {
    console.log(`  - ${row.column_name}: ${row.data_type}`)
  })
  
  process.exit(0)
}

checkSchema()
