#!/usr/bin/env node

const { Pool } = require('pg')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

console.log('🔍 VoLA Database Debug Tool\n')

const DATABASE_URL = process.env.DATABASE_URL

console.log('Environment check:')
console.log(`DATABASE_URL: ${DATABASE_URL ? '✅ Set' : '❌ Missing'}`)
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`)

if (!DATABASE_URL) {
  console.error('\n❌ DATABASE_URL not found in .env.local')
  console.log('Please add this to your .env.local file:')
  console.log('DATABASE_URL=postgresql://postgres:your_password@localhost:5432/vola_db')
  process.exit(1)
}

async function debugDatabase() {
  console.log('\n🔄 Creating connection pool...')
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: false, // Disable SSL for local development
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 3000,
  })

  try {
    // Step 1: Test basic connection
    console.log('1️⃣ Testing basic connection...')
    const client = await pool.connect()
    console.log('✅ Connection established')
    
    // Step 2: Test simple query
    console.log('\n2️⃣ Testing simple query...')
    const timeResult = await client.query('SELECT NOW() as current_time')
    console.log(`✅ Query successful: ${timeResult.rows[0].current_time}`)
    
    // Step 3: Check database info
    console.log('\n3️⃣ Getting database info...')
    const dbInfo = await client.query('SELECT current_database(), current_user, version()')
    const info = dbInfo.rows[0]
    console.log(`✅ Database: ${info.current_database}`)
    console.log(`✅ User: ${info.current_user}`)
    console.log(`✅ Version: ${info.version.split(' ')[0]} ${info.version.split(' ')[1]}`)
    
    // Step 4: Check if users table exists
    console.log('\n4️⃣ Checking users table...')
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Users table exists')
      
      // Get table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `)
      
      console.log('📋 Table structure:')
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`)
      })
      
      // Get user count
      const countResult = await client.query('SELECT COUNT(*) as count FROM users')
      console.log(`📊 Users in table: ${countResult.rows[0].count}`)
      
    } else {
      console.log('❌ Users table does not exist')
      console.log('💡 Run: npm run init-db to create tables')
    }
    
    // Step 5: Test insert operation
    console.log('\n5️⃣ Testing insert operation...')
    const testEmail = `debug_test_${Date.now()}@example.com`
    
    try {
      const insertResult = await client.query(`
        INSERT INTO users (name, email, password, role) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id, name, email, created_at
      `, ['Debug Test User', testEmail, 'test_password_hash', 'student'])
      
      const newUser = insertResult.rows[0]
      console.log('✅ Insert successful')
      console.log(`   Created user ID: ${newUser.id}`)
      console.log(`   Name: ${newUser.name}`)
      console.log(`   Email: ${newUser.email}`)
      
      // Clean up test user
      await client.query('DELETE FROM users WHERE id = $1', [newUser.id])
      console.log('✅ Test user cleaned up')
      
    } catch (insertError) {
      console.error('❌ Insert failed:', insertError.message)
      
      if (insertError.code === '42P01') {
        console.log('💡 Table does not exist. Run: npm run init-db')
      }
    }
    
    client.release()
    
    console.log('\n🎉 Database debug completed successfully!')
    console.log('✅ PostgreSQL is working correctly')
    
  } catch (error) {
    console.error('\n❌ Database debug failed:', error.message)
    console.error('Error code:', error.code)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused solutions:')
      console.log('1. Start PostgreSQL:')
      console.log('   - macOS: brew services start postgresql')
      console.log('   - Ubuntu: sudo systemctl start postgresql')
      console.log('   - Windows: Start PostgreSQL service')
      console.log('2. Check if PostgreSQL is running: pg_isready')
      console.log('3. Check port: netstat -an | grep 5432')
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication failed solutions:')
      console.log('1. Check your DATABASE_URL credentials')
      console.log('2. Reset postgres password: sudo -u postgres psql -c "ALTER USER postgres PASSWORD \'newpassword\';"')
      console.log('3. Create user: CREATE USER your_user WITH PASSWORD \'your_password\';')
    } else if (error.code === '3D000') {
      console.log('\n💡 Database does not exist solutions:')
      console.log('1. Create database: psql -U postgres -c "CREATE DATABASE vola_db;"')
      console.log('2. Or change database name in DATABASE_URL')
    }
    
    process.exit(1)
  } finally {
    await pool.end()
  }
}

debugDatabase()