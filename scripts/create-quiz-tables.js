require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function createQuizTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    console.log('🔄 Creating quiz tables...\n');
    const client = await pool.connect();
    
    // Create quiz_questions table
    console.log('📝 Creating quiz_questions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id SERIAL PRIMARY KEY,
        attempt_id INTEGER REFERENCES quiz_attempts(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_answer TEXT NOT NULL,
        user_answer TEXT,
        is_correct BOOLEAN,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ quiz_questions table created');
    
    // Create indexes
    console.log('📝 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quiz_questions_attempt_id 
      ON quiz_questions(attempt_id)
    `);
    console.log('✅ Indexes created');
    
    // Verify tables
    console.log('\n📋 Verifying tables:');
    const tables = ['quiz_attempts', 'quiz_questions'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (result.rows[0].exists) {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ✅ ${table} (${countResult.rows[0].count} rows)`);
      } else {
        console.log(`   ❌ ${table} (MISSING)`);
      }
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Quiz tables are ready!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createQuizTables();
