const { Pool } = require('pg')

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Intern@Xcelerator53@db.hilxnhmexnqxgiuzrbze.supabase.co:5432/postgres'

async function testSupabaseConnection() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔍 Testing Supabase connection...\n')

    // Test basic connection
    const timeResult = await pool.query('SELECT NOW() as current_time')
    console.log('✅ Connection successful!')
    console.log(`⏰ Server time: ${timeResult.rows[0].current_time}\n`)

    // Check PostgreSQL version
    const versionResult = await pool.query('SELECT version()')
    console.log('📦 PostgreSQL version:')
    console.log(`   ${versionResult.rows[0].version.split(',')[0]}\n`)

    // Check if pgvector is enabled
    const vectorCheck = await pool.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector'
    `)

    if (vectorCheck.rows.length > 0) {
      console.log('✅ pgvector extension is enabled')
      console.log(`   Version: ${vectorCheck.rows[0].extversion}\n`)
    } else {
      console.log('⚠️  pgvector extension is NOT enabled')
      console.log('   Run this in Supabase SQL Editor:')
      console.log('   CREATE EXTENSION IF NOT EXISTS vector;\n')
    }

    // Check existing tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    if (tablesResult.rows.length > 0) {
      console.log('📋 Existing tables:')
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`)
      })
    } else {
      console.log('📋 No tables found. Run migration script:')
      console.log('   node scripts/migrate-to-supabase.js')
    }

    console.log('\n🎉 Supabase is ready to use!')

  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    console.error('\n🔧 Troubleshooting:')
    console.error('   1. Check if DATABASE_URL is correct in .env.local')
    console.error('   2. Verify your Supabase project is active')
    console.error('   3. Check if your IP is allowed in Supabase settings')
    process.exit(1)
  } finally {
    await pool.end()
  }
}

testSupabaseConnection()
