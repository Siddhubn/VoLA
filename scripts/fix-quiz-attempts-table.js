require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
})

async function fixQuizAttemptsTable() {
  try {
    console.log('🔍 Checking quiz_attempts table structure...\n')
    
    // Check current columns
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'quiz_attempts' 
      ORDER BY ordinal_position
    `)
    
    console.log('Current columns:')
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`)
    })
    
    const columnNames = columns.rows.map(c => c.column_name)
    
    // Add missing columns
    const columnsToAdd = []
    
    if (!columnNames.includes('percentage')) {
      columnsToAdd.push({
        name: 'percentage',
        sql: 'ALTER TABLE quiz_attempts ADD COLUMN percentage DECIMAL(5,2)'
      })
    }
    
    if (!columnNames.includes('time_spent')) {
      columnsToAdd.push({
        name: 'time_spent',
        sql: 'ALTER TABLE quiz_attempts ADD COLUMN time_spent INTEGER DEFAULT 0'
      })
    }
    
    if (!columnNames.includes('answers')) {
      columnsToAdd.push({
        name: 'answers',
        sql: 'ALTER TABLE quiz_attempts ADD COLUMN answers JSONB'
      })
    }
    
    if (columnsToAdd.length > 0) {
      console.log(`\n📝 Adding ${columnsToAdd.length} missing columns...`)
      
      for (const col of columnsToAdd) {
        try {
          await pool.query(col.sql)
          console.log(`   ✅ Added: ${col.name}`)
        } catch (err) {
          console.log(`   ❌ Failed to add ${col.name}:`, err.message)
        }
      }
      
      // If percentage was added, calculate it from existing data
      if (columnsToAdd.some(c => c.name === 'percentage')) {
        console.log('\n🔄 Calculating percentage for existing records...')
        await pool.query(`
          UPDATE quiz_attempts 
          SET percentage = ROUND((score::decimal / NULLIF(total_questions, 0)) * 100, 2)
          WHERE percentage IS NULL AND total_questions > 0
        `)
        console.log('   ✅ Percentages calculated')
      }
    } else {
      console.log('\n✅ All required columns exist')
    }
    
    // Verify final structure
    console.log('\n📊 Final table structure:')
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'quiz_attempts' 
      ORDER BY ordinal_position
    `)
    
    finalColumns.rows.forEach(col => {
      console.log(`   ✅ ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`)
    })
    
    console.log('\n✨ quiz_attempts table is now ready!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

fixQuizAttemptsTable()
