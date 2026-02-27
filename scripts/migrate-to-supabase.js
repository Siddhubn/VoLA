const { Pool } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Intern@Xcelerator53@db.hilxnhmexnqxgiuzrbze.supabase.co:5432/postgres'

async function migrateToSupabase() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🚀 Starting Supabase migration...\n')

    // 1. Enable pgvector extension
    console.log('📦 Enabling pgvector extension...')
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector')
    console.log('✅ pgvector extension enabled\n')

    // 2. Create users table
    console.log('👥 Creating users table...')
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

    // 3. Create quiz_history table
    console.log('📝 Creating quiz_history table...')
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
        answers JSONB,
        CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)
    console.log('✅ Quiz history table created\n')

    // 4. Create knowledge_base table with vector support
    console.log('🧠 Creating knowledge_base table with vector support...')
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
    console.log('✅ Knowledge base table created with vector support\n')

    // 5. Create indexes
    console.log('🔍 Creating indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_course ON users(course)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_quiz_history_user_id ON quiz_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_quiz_history_course ON quiz_history(course)',
      'CREATE INDEX IF NOT EXISTS idx_quiz_history_module ON quiz_history(module)',
      'CREATE INDEX IF NOT EXISTS idx_knowledge_base_course ON knowledge_base(course)',
      'CREATE INDEX IF NOT EXISTS idx_knowledge_base_module ON knowledge_base(module)',
      'CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)'
    ]

    for (const indexQuery of indexes) {
      await pool.query(indexQuery)
    }
    console.log('✅ All indexes created\n')

    // 6. Create triggers
    console.log('⚡ Creating triggers...')
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `)

    await pool.query(`
      DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
      CREATE TRIGGER update_knowledge_base_updated_at
        BEFORE UPDATE ON knowledge_base
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `)
    console.log('✅ Triggers created\n')

    // 7. Create admin user
    console.log('👤 Creating admin user...')
    const bcrypt = require('bcryptjs')
    const adminPassword = await bcrypt.hash('Admin@1234', 10)
    
    await pool.query(`
      INSERT INTO users (name, email, password, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE
      SET password = EXCLUDED.password,
          role = EXCLUDED.role,
          is_active = EXCLUDED.is_active
    `, ['Admin', 'admin@vola.com', adminPassword, 'admin', true])
    console.log('✅ Admin user created (email: admin@vola.com, password: Admin@1234)\n')

    // 8. Verify setup
    console.log('🔍 Verifying setup...')
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    
    console.log('📋 Tables created:')
    tables.rows.forEach(row => console.log(`   - ${row.table_name}`))
    
    const extensions = await pool.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector'
    `)
    
    if (extensions.rows.length > 0) {
      console.log(`\n✅ pgvector extension: v${extensions.rows[0].extversion}`)
    }

    const userCount = await pool.query('SELECT COUNT(*) FROM users')
    console.log(`\n👥 Total users: ${userCount.rows[0].count}`)

    console.log('\n🎉 Migration to Supabase completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Your app is now connected to Supabase')
    console.log('   2. pgvector is enabled for AI-powered search')
    console.log('   3. All tables and indexes are created')
    console.log('   4. Admin user is ready (admin@vola.com / Admin@1234)')
    console.log('\n🌐 Access your Supabase dashboard at:')
    console.log('   https://supabase.com/dashboard/project/hilxnhmexnqxgiuzrbze')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Details:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrateToSupabase()
