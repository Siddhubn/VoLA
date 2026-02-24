#!/usr/bin/env node

const { Pool } = require('pg')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const DATABASE_URL = process.env.DATABASE_URL

console.log('🧪 VoLA Database Test Suite\n')

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local')
  process.exit(1)
}

async function runTests() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    console.log('🔄 Running database tests...\n')

    // Test 1: Connection
    console.log('1️⃣ Testing connection...')
    const connectionResult = await pool.query('SELECT NOW() as time, version() as version')
    console.log('✅ Connection successful')
    console.log(`   Time: ${connectionResult.rows[0].time}`)
    console.log(`   Version: ${connectionResult.rows[0].version.split(' ')[0]} ${connectionResult.rows[0].version.split(' ')[1]}`)

    // Test 2: Check if tables exist
    console.log('\n2️⃣ Checking tables...')
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    if (tablesResult.rows.length > 0) {
      console.log('✅ Tables found:')
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`)
      })
    } else {
      console.log('⚠️  No tables found - run npm run init-db first')
    }

    // Test 3: Check users table structure
    console.log('\n3️⃣ Checking users table structure...')
    try {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `)
      
      if (columnsResult.rows.length > 0) {
        console.log('✅ Users table structure:')
        columnsResult.rows.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`)
        })
      } else {
        console.log('❌ Users table not found')
      }
    } catch (error) {
      console.log('❌ Users table does not exist')
    }

    // Test 4: Check indexes
    console.log('\n4️⃣ Checking indexes...')
    try {
      const indexesResult = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'users'
        ORDER BY indexname
      `)
      
      if (indexesResult.rows.length > 0) {
        console.log('✅ Indexes found:')
        indexesResult.rows.forEach(idx => {
          console.log(`   - ${idx.indexname}`)
        })
      } else {
        console.log('⚠️  No indexes found on users table')
      }
    } catch (error) {
      console.log('❌ Could not check indexes')
    }

    // Test 5: Test CRUD operations
    console.log('\n5️⃣ Testing CRUD operations...')
    
    // Insert test user
    const testEmail = `test_${Date.now()}@example.com`
    const insertResult = await pool.query(`
      INSERT INTO users (name, email, password, role) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, name, email, role, created_at
    `, ['Test User', testEmail, 'hashed_password', 'student'])
    
    const testUserId = insertResult.rows[0].id
    console.log('✅ INSERT test passed')
    console.log(`   Created user: ${insertResult.rows[0].name} (ID: ${testUserId})`)

    // Select test user
    const selectResult = await pool.query('SELECT * FROM users WHERE id = $1', [testUserId])
    console.log('✅ SELECT test passed')
    console.log(`   Found user: ${selectResult.rows[0].name}`)

    // Update test user
    await pool.query('UPDATE users SET name = $1 WHERE id = $2', ['Updated Test User', testUserId])
    const updatedResult = await pool.query('SELECT name, updated_at FROM users WHERE id = $1', [testUserId])
    console.log('✅ UPDATE test passed')
    console.log(`   Updated name: ${updatedResult.rows[0].name}`)
    console.log(`   Updated at: ${updatedResult.rows[0].updated_at}`)

    // Delete test user
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId])
    const deletedResult = await pool.query('SELECT * FROM users WHERE id = $1', [testUserId])
    console.log('✅ DELETE test passed')
    console.log(`   User deleted: ${deletedResult.rows.length === 0}`)

    // Test 6: Check existing data
    console.log('\n6️⃣ Checking existing data...')
    const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users')
    const userCount = parseInt(userCountResult.rows[0].count)
    console.log(`📊 Total users in database: ${userCount}`)

    if (userCount > 0) {
      const recentUsersResult = await pool.query(`
        SELECT id, name, email, role, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `)
      console.log('👥 Recent users:')
      recentUsersResult.rows.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.role} - ${user.created_at.toISOString().split('T')[0]}`)
      })
    }

    console.log('\n🎉 All database tests passed successfully!')
    console.log('\n📋 Database is ready for use!')

  } catch (error) {
    console.error('\n❌ Database test failed:', error.message)
    console.error('Stack trace:', error.stack)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 PostgreSQL is not running. Start it with:')
      console.log('- macOS: brew services start postgresql')
      console.log('- Ubuntu: sudo systemctl start postgresql')
      console.log('- Windows: Start PostgreSQL service')
    } else if (error.code === '3D000') {
      console.log('\n💡 Database does not exist. Create it with:')
      console.log('psql -U postgres -c "CREATE DATABASE vola_db;"')
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication failed. Check your DATABASE_URL credentials.')
    }
    
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runTests()