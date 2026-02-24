import { query, testConnection } from './postgresql'

export async function checkDatabaseHealth(): Promise<{
  connected: boolean
  tablesExist: boolean
  userCount: number
  error?: string
}> {
  try {
    // Test basic connection
    const connected = await testConnection()
    if (!connected) {
      return { connected: false, tablesExist: false, userCount: 0, error: 'Connection failed' }
    }

    // Check if users table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `)
    
    const tablesExist = tableCheck.rows[0].exists

    if (!tablesExist) {
      return { connected: true, tablesExist: false, userCount: 0, error: 'Users table does not exist' }
    }

    // Get user count
    const userCountResult = await query('SELECT COUNT(*) as count FROM users')
    const userCount = parseInt(userCountResult.rows[0].count)

    return { connected: true, tablesExist: true, userCount }

  } catch (error: any) {
    return { 
      connected: false, 
      tablesExist: false, 
      userCount: 0, 
      error: error.message 
    }
  }
}

export async function ensureDatabaseReady(): Promise<void> {
  const health = await checkDatabaseHealth()
  
  if (!health.connected) {
    console.error('❌ Database connection failed:', health.error)
    throw new Error(`Database connection failed: ${health.error}`)
  }

  if (!health.tablesExist) {
    console.log('⚠️  Database tables do not exist, initializing...')
    const { initializeDatabase } = await import('./postgresql')
    await initializeDatabase()
    console.log('✅ Database tables initialized')
  }

  console.log(`✅ Database ready - ${health.userCount} users registered`)
}