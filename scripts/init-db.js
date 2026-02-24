#!/usr/bin/env node

const { Pool } = require('pg')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const DATABASE_URL = process.env.DATABASE_URL

console.log('🔍 VoLA Database Initializer\n')

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local')
  console.log('\n💡 Please set DATABASE_URL in your .env.local file:')
  console.log('DATABASE_URL=postgresql://username:password@localhost:5432/vola_db')
  console.log('\n📋 Example configurations:')
  console.log('- Local: postgresql://postgres:password@localhost:5432/vola_db')
  console.log('- With custom user: postgresql://vola_user:password@localhost:5432/vola_db')
  process.exit(1)
}

async function testConnection(pool) {
  try {
    console.log('🔄 Testing PostgreSQL connection...')
    const client = await pool.connect()
    const result = await client.query('SELECT NOW() as current_time, version() as version')
    console.log('✅ Connected to PostgreSQL successfully!')
    console.log(`📅 Server time: ${result.rows[0].current_time}`)
    console.log(`🐘 PostgreSQL version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`)
    client.release()
    return true
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    return false
  }
}

async function createTables(pool) {
  try {
    console.log('\n🔄 Creating database tables...')
    
    // Create users table with all necessary columns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
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
    console.log('✅ Users table created/verified')

    // Create indexes for better performance
    console.log('🔄 Creating indexes...')
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)'
    ]

    for (const indexQuery of indexes) {
      await pool.query(indexQuery)
    }
    console.log('✅ Indexes created/verified')

    // Create updated_at trigger function
    console.log('🔄 Creating triggers...')
    
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
    console.log('✅ Triggers created/verified')

    return true
  } catch (error) {
    console.error('❌ Error creating tables:', error.message)
    return false
  }
}

async function checkExistingData(pool) {
  try {
    console.log('\n📊 Checking existing data...')
    
    // Check if users table exists and get count
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `)
    
    if (tableCheck.rows[0].exists) {
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users')
      console.log(`📈 Users in database: ${userCount.rows[0].count}`)
      
      if (parseInt(userCount.rows[0].count) > 0) {
        const recentUsers = await pool.query(`
          SELECT id, name, email, role, created_at 
          FROM users 
          ORDER BY created_at DESC 
          LIMIT 3
        `)
        console.log('👥 Recent users:')
        recentUsers.rows.forEach(user => {
          console.log(`   - ${user.name} (${user.email}) - ${user.role}`)
        })
      }
    } else {
      console.log('📋 Users table does not exist yet')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error checking data:', error.message)
    return false
  }
}

async function initializeDatabase() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })

  try {
    // Test connection first
    const connected = await testConnection(pool)
    if (!connected) {
      throw new Error('Failed to connect to database')
    }

    // Check existing data
    await checkExistingData(pool)

    // Create tables and indexes
    const tablesCreated = await createTables(pool)
    if (!tablesCreated) {
      throw new Error('Failed to create tables')
    }

    // Final verification
    await checkExistingData(pool)

    console.log('\n🎉 Database initialization completed successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Run: npm run dev')
    console.log('2. Open: http://localhost:3000')
    console.log('3. Register a new account to test the PostgreSQL integration')
    console.log('\n💡 Troubleshooting:')
    console.log('- If you get connection errors, make sure PostgreSQL is running')
    console.log('- Check your DATABASE_URL in .env.local')
    console.log('- Ensure the database "vola_db" exists')

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused - PostgreSQL troubleshooting:')
      console.log('1. Make sure PostgreSQL is running:')
      console.log('   - macOS: brew services start postgresql')
      console.log('   - Ubuntu: sudo systemctl start postgresql')
      console.log('   - Windows: Start PostgreSQL service')
      console.log('2. Check if PostgreSQL is listening on port 5432:')
      console.log('   - Run: netstat -an | grep 5432')
      console.log('3. Verify your DATABASE_URL format:')
      console.log('   - postgresql://username:password@localhost:5432/database_name')
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Host not found - Check your DATABASE_URL:')
      console.log('- Make sure the hostname is correct (usually "localhost" for local)')
      console.log('- Verify the port number (usually 5432 for PostgreSQL)')
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication failed:')
      console.log('- Check your username and password in DATABASE_URL')
      console.log('- Make sure the user exists in PostgreSQL')
      console.log('- Try: CREATE USER your_username WITH PASSWORD \'your_password\';')
    } else if (error.code === '3D000') {
      console.log('\n💡 Database does not exist:')
      console.log('- Create the database: CREATE DATABASE vola_db;')
      console.log('- Or change the database name in your DATABASE_URL')
    }
    
    process.exit(1)
  } finally {
    await pool.end()
    console.log('\n🔌 Database connection closed')
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message)
  process.exit(1)
})

initializeDatabase()