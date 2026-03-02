import { Pool, PoolClient } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL!

if (!DATABASE_URL) {
  throw new Error('Please define the DATABASE_URL environment variable inside .env.local')
}

// Create a connection pool
let pool: Pool | null = null

function createPool(): Pool {
  // Determine if we need SSL based on the connection string
  // Local databases (localhost/127.0.0.1) don't need SSL
  // Cloud databases (Supabase, etc.) need SSL with rejectUnauthorized: false
  const isLocalDatabase = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
  
  return new Pool({
    connectionString: DATABASE_URL,
    ssl: isLocalDatabase ? false : {
      rejectUnauthorized: false // Required for Supabase and other cloud databases with self-signed certificates
    },
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  })
}

export async function getPool(): Promise<Pool> {
  if (!pool) {
    pool = createPool()
    
    // Test the connection
    try {
      const client = await pool.connect()
      await client.query('SELECT NOW()')
      client.release()
      console.log('✅ PostgreSQL connection pool established')
    } catch (error: any) {
      console.error('❌ PostgreSQL connection failed:', error.message)
      throw error
    }
  }
  return pool
}

export async function query(text: string, params?: any[]): Promise<any> {
  const pool = await getPool()
  const client = await pool.connect()
  
  try {
    const start = Date.now()
    const result = await client.query(text, params)
    const duration = Date.now() - start
    
    // Log slow queries (> 100ms)
    if (duration > 100) {
      console.log('🐌 Slow query detected:', { text: text.substring(0, 100), duration, rows: result.rowCount })
    }
    
    // Log successful queries in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query executed:', { 
        query: text.substring(0, 50) + (text.length > 50 ? '...' : ''), 
        params: params?.length || 0, 
        rows: result.rowCount,
        duration: `${duration}ms`
      })
    }
    
    return result
  } catch (error: any) {
    console.error('❌ Database query error:', { 
      query: text.substring(0, 100), 
      params, 
      error: error.message,
      code: error.code 
    })
    throw error
  } finally {
    client.release()
  }
}

export async function getClient(): Promise<PoolClient> {
  const pool = await getPool()
  return pool.connect()
}

// Initialize database tables
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔄 Initializing database tables...')
    
    // Create users table with proper constraints
    await query(`
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

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)'
    ]

    for (const indexQuery of indexes) {
      await query(indexQuery)
    }

    // Create updated_at trigger function
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `)

    // Create trigger
    await query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `)

    console.log('✅ Database tables initialized successfully')
    
    // Verify table structure
    const tableInfo = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `)
    
    console.log(`📋 Users table has ${tableInfo.rows.length} columns`)
    
  } catch (error: any) {
    console.error('❌ Error initializing database:', error.message)
    throw error
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version')
    console.log('✅ PostgreSQL connection successful:', result.rows[0].current_time)
    return true
  } catch (error: any) {
    console.error('❌ PostgreSQL connection failed:', error.message)
    return false
  }
}

// Track if we're already closing to prevent multiple close attempts
let isClosing = false

// Close all connections (useful for cleanup)
export async function closePool(): Promise<void> {
  if (pool && !isClosing) {
    isClosing = true
    try {
      await pool.end()
      pool = null
      console.log('✅ PostgreSQL pool closed')
    } catch (error) {
      console.error('Error closing pool:', error)
    } finally {
      isClosing = false
    }
  }
}

// Track if cleanup handlers are registered to prevent duplicates
let cleanupRegistered = false

// Handle process termination - only register once
if (!cleanupRegistered) {
  cleanupRegistered = true
  
  const cleanup = async (signal: string) => {
    if (!isClosing) {
      console.log(`🔄 Closing PostgreSQL connections (${signal})...`)
      await closePool()
      process.exit(0)
    }
  }

  process.once('SIGINT', () => cleanup('SIGINT'))
  process.once('SIGTERM', () => cleanup('SIGTERM'))
}