#!/usr/bin/env tsx
import { config } from 'dotenv'
import path from 'path'

config({ path: path.join(process.cwd(), '.env.local') })

async function checkChunks() {
  const { query } = await import('../lib/postgresql')
  
  console.log('📊 Checking knowledge chunks...\n')
  
  // Total count
  const total = await query('SELECT COUNT(*) as count FROM knowledge_chunks')
  console.log(`Total chunks: ${total.rows[0].count}`)
  
  // By trade
  const byTrade = await query(`
    SELECT trade, COUNT(*) as count 
    FROM knowledge_chunks 
    GROUP BY trade
  `)
  console.log('\nBy trade:')
  byTrade.rows.forEach(r => console.log(`  ${r.trade}: ${r.count}`))
  
  // By trade_type
  const byType = await query(`
    SELECT trade, trade_type, COUNT(*) as count 
    FROM knowledge_chunks 
    GROUP BY trade, trade_type
    ORDER BY trade, trade_type
  `)
  console.log('\nBy trade and type:')
  byType.rows.forEach(r => console.log(`  ${r.trade} - ${r.trade_type}: ${r.count}`))
  
  // Sample data
  const sample = await query(`
    SELECT id, trade, trade_type, module_id, module_name, 
           LEFT(content, 50) as content_preview
    FROM knowledge_chunks 
    LIMIT 3
  `)
  console.log('\nSample chunks:')
  sample.rows.forEach(r => {
    console.log(`  ID: ${r.id}`)
    console.log(`  Trade: ${r.trade}`)
    console.log(`  Type: ${r.trade_type}`)
    console.log(`  Module: ${r.module_id} - ${r.module_name}`)
    console.log(`  Content: ${r.content_preview}...`)
    console.log()
  })
  
  process.exit(0)
}

checkChunks()
