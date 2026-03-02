import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
  password: 'admin',
})

async function createChatHistoryTable() {
  try {
    console.log('🔧 Creating chat_history table...')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        sources JSONB,
        course VARCHAR(50),
        module VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_user_session 
      ON chat_history(user_id, session_id)
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_created 
      ON chat_history(created_at DESC)
    `)

    console.log('✅ chat_history table created successfully')

    // Check if table exists and show structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'chat_history'
      ORDER BY ordinal_position
    `)

    console.log('\n📋 Table structure:')
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(required)' : '(optional)'}`)
    })

  } catch (error) {
    console.error('❌ Error creating chat_history table:', error)
    throw error
  } finally {
    await pool.end()
  }
}

createChatHistoryTable()
