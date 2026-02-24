const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function initQuizTables() {
  const client = await pool.connect()
  
  try {
    console.log('🔧 Creating quiz and leaderboard tables...')

    // Quiz attempts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course VARCHAR(50) NOT NULL,
        module VARCHAR(100) NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        time_spent INTEGER NOT NULL,
        answers JSONB NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_score CHECK (score >= 0 AND score <= total_questions)
      )
    `)
    console.log('✅ quiz_attempts table created')

    // Leaderboard table (aggregated scores)
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        total_score INTEGER DEFAULT 0,
        total_quizzes INTEGER DEFAULT 0,
        average_score DECIMAL(5,2) DEFAULT 0,
        best_score INTEGER DEFAULT 0,
        total_time_spent INTEGER DEFAULT 0,
        last_quiz_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ leaderboard table created')

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
      CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course ON quiz_attempts(course);
      CREATE INDEX IF NOT EXISTS idx_quiz_attempts_module ON quiz_attempts(module);
      CREATE INDEX IF NOT EXISTS idx_leaderboard_total_score ON leaderboard(total_score DESC);
    `)
    console.log('✅ Indexes created')

    // Create trigger to update leaderboard automatically
    await client.query(`
      CREATE OR REPLACE FUNCTION update_leaderboard()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO leaderboard (user_id, total_score, total_quizzes, average_score, best_score, total_time_spent, last_quiz_at)
        VALUES (
          NEW.user_id,
          NEW.score,
          1,
          NEW.score,
          NEW.score,
          NEW.time_spent,
          NEW.completed_at
        )
        ON CONFLICT (user_id) DO UPDATE SET
          total_score = leaderboard.total_score + NEW.score,
          total_quizzes = leaderboard.total_quizzes + 1,
          average_score = (leaderboard.total_score + NEW.score) / (leaderboard.total_quizzes + 1),
          best_score = GREATEST(leaderboard.best_score, NEW.score),
          total_time_spent = leaderboard.total_time_spent + NEW.time_spent,
          last_quiz_at = NEW.completed_at,
          updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `)
    console.log('✅ Leaderboard update function created')

    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_leaderboard ON quiz_attempts;
      CREATE TRIGGER trigger_update_leaderboard
      AFTER INSERT ON quiz_attempts
      FOR EACH ROW
      EXECUTE FUNCTION update_leaderboard();
    `)
    console.log('✅ Leaderboard trigger created')

    console.log('\n🎉 Quiz tables initialized successfully!')
    console.log('\nTables created:')
    console.log('  - quiz_attempts (stores all quiz attempts)')
    console.log('  - leaderboard (aggregated user scores)')
    console.log('\nFeatures:')
    console.log('  - Automatic leaderboard updates via trigger')
    console.log('  - Performance indexes')
    console.log('  - Data integrity constraints')

  } catch (error) {
    console.error('❌ Error creating quiz tables:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

initQuizTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
