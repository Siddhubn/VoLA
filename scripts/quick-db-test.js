// Quick database connection test
require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

async function quickTest() {
  console.log('🔍 Testing database connection from .env.local...\n')
  
  const connectionString = process.env.DATABASE_URL
  console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@'))
  
  // Determine if this is a local or remote connection
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
  
  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  })

  try {
    console.log('\n⏳ Attempting to connect...')
    const client = await pool.connect()
    console.log('✅ Connected successfully!\n')
    
    // Test query
    const result = await client.query('SELECT NOW(), version()')
    console.log('📅 Server time:', result.rows[0].now)
    console.log('🗄️  PostgreSQL version:', result.rows[0].version.split(',')[0])
    
    // Check tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log('\n📊 Tables found:')
    tables.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`)
    })
    
    // Check pgvector
    const vectorCheck = await client.query(
      "SELECT * FROM pg_extension WHERE extname = 'vector'"
    )
    
    if (vectorCheck.rows.length > 0) {
      console.log('\n🎯 pgvector extension: ✅ ENABLED')
    } else {
      console.log('\n⚠️  pgvector extension: ❌ NOT ENABLED')
    }
    
    // Check users count
    const userCount = await client.query('SELECT COUNT(*) FROM users')
    console.log(`\n👥 Total users: ${userCount.rows[0].count}`)
    
    client.release()
    await pool.end()
    
    console.log('\n✨ All checks passed! Your Supabase database is ready.')
    
  } catch (error) {
    console.error('\n❌ Connection failed:', error.message)
    console.error('\nDetails:', error.code || error)
    await pool.end()
    process.exit(1)
  }
}

quickTest()
