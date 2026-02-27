const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const SUPABASE_URL = 'postgresql://postgres:InternXcelerator@db.swnlggxbfjapndekvlgr.supabase.co:5432/postgres'

async function migrateToSupabase() {
  const pool = new Pool({
    connectionString: SUPABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🚀 Starting Supabase migration...\n')

    // 1. Test connection
    console.log('1️⃣ Testing connection...')
    const testResult = await pool.query('SELECT NOW(), version()')
    console.log('✅ Connected to Supabase PostgreSQL')
    console.log(`   Time: ${testResult.rows[0].now}`)
    console.log(`   Version: ${testResult.rows[0].version.split(',')[0]}\n`)

    // 2. Enable pgvector
    console.log('2️⃣ Enabling pgvector extension...')
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector')
    const vectorCheck = await pool.query(
      "SELECT * FROM pg_extension WHERE extname = 'vector'"
    )
    if (vectorCheck.rows.length > 0) {
      console.log('✅ pgvector extension enabled\n')
    } else {
      console.log('❌ Failed to enable pgvector\n')
      return
    }

    // 3. Create users table
    console.log('3️⃣ Creating users table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
        course VARCHAR(50) CHECK (course IN ('fitter', 'electrician')),
        avatar TEXT DEFAULT '',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP WITH TIME ZONE,
        bio TEXT DEFAULT '',
        skills TEXT[] DEFAULT '{}',
        learning_goals TEXT[] DEFAULT '{}',
        completed_courses INTEGER DEFAULT 0,
        total_study_time INTEGER DEFAULT 0
      )
    `)
    console.log('✅ Users table created\n')

    // 4. Create quiz_history table
    console.log('4️⃣ Creating quiz_history table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quiz_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course VARCHAR(50) NOT NULL,
        module VARCHAR(100) NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage DECIMAL(5,2) NOT NULL,
        time_spent INTEGER NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        answers JSONB
      )
    `)
    console.log('✅ Quiz history table created\n')

    // 5. Create knowledge_base table
    console.log('5️⃣ Creating knowledge_base table with vector support...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id SERIAL PRIMARY KEY,
        course VARCHAR(50) NOT NULL,
        module VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB,
        embedding vector(384),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Knowledge base table created with vector column\n')

    // 6. Create indexes
    console.log('6️⃣ Creating indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_course ON users(course)',
      'CREATE INDEX IF NOT EXISTS idx_quiz_history_user_id ON quiz_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_quiz_history_course ON quiz_history(course)',
      'CREATE INDEX IF NOT EXISTS idx_knowledge_base_course ON knowledge_base(course)',
      'CREATE INDEX IF NOT EXISTS idx_knowledge_base_module ON knowledge_base(module)',
      'CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)'
    ]

    for (const indexQuery of indexes) {
      await pool.query(indexQuery)
    }
    console.log('✅ All indexes created\n')

    // 7. Create triggers
    console.log('7️⃣ Creating triggers...')
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
      CREATE TRIGGER update_knowledge_base_updated_at
        BEFORE UPDATE ON knowledge_base
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `)
    console.log('✅ Triggers created\n')

    // 8. Create vector search function
    console.log('8️⃣ Creating vector search function...')
    await pool.query(`
      CREATE OR REPLACE FUNCTION search_knowledge_base(
        query_embedding vector(384),
        match_threshold float DEFAULT 0.5,
        match_count int DEFAULT 5,
        filter_course text DEFAULT NULL,
        filter_module text DEFAULT NULL
      )
      RETURNS TABLE (
        id int,
        course text,
        module text,
        content text,
        metadata jsonb,
        similarity float
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          kb.id,
          kb.course::text,
          kb.module::text,
          kb.content,
          kb.metadata,
          1 - (kb.embedding <=> query_embedding) as similarity
        FROM knowledge_base kb
        WHERE 
          (filter_course IS NULL OR kb.course = filter_course)
          AND (filter_module IS NULL OR kb.module = filter_module)
          AND 1 - (kb.embedding <=> query_embedding) > match_threshold
        ORDER BY kb.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$
    `)
    console.log('✅ Vector search function created\n')

    // 9. Create admin user
    console.log('9️⃣ Creating admin user...')
    const hashedPassword = await bcrypt.hash('Admin@1234', 10)
    
    try {
      await pool.query(`
        INSERT INTO users (name, email, password, role, is_active)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
      `, ['Admin', 'admin@vola.com', hashedPassword, 'admin', true])
      console.log('✅ Admin user created (email: admin@vola.com, password: Admin@1234)\n')
    } catch (err) {
      console.log('ℹ️  Admin user already exists\n')
    }

    // 10. Verify setup
    console.log('🔍 Verifying setup...\n')
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'quiz_history', 'knowledge_base')
      ORDER BY table_name
    `)
    
    console.log('📊 Tables created:')
    tables.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`)
    })

    const userCount = await pool.query('SELECT COUNT(*) FROM users')
    console.log(`\n👥 Total users: ${userCount.rows[0].count}`)

    console.log('\n✨ Migration completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Update your .env.local with the Supabase DATABASE_URL (already done)')
    console.log('   2. Restart your Next.js development server')
    console.log('   3. Test the connection by logging in')
    console.log('   4. Your pgvector RAG system is ready to use!')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Details:', error)
  } finally {
    await pool.end()
  }
}

// Run migration
migrateToSupabase()
