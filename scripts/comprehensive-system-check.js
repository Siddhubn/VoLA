const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

require('dotenv').config({ path: '.env.local' })

const connectionString = process.env.DATABASE_URL
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1')

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
})

console.log('🔍 COMPREHENSIVE SYSTEM CHECK')
console.log('=' .repeat(70))
console.log()

async function runChecks() {
  let allPassed = true
  const results = []

  try {
    // 1. Database Connection
    console.log('1️⃣  DATABASE CONNECTION')
    console.log('-'.repeat(70))
    try {
      const client = await pool.connect()
      const result = await client.query('SELECT NOW(), version()')
      console.log('✅ Connection: SUCCESS')
      console.log(`   Server time: ${result.rows[0].now}`)
      console.log(`   PostgreSQL: ${result.rows[0].version.split(',')[0]}`)
      client.release()
      results.push({ test: 'Database Connection', status: 'PASS' })
    } catch (err) {
      console.log('❌ Connection: FAILED -', err.message)
      allPassed = false
      results.push({ test: 'Database Connection', status: 'FAIL', error: err.message })
    }
    console.log()

    // 2. pgvector Extension
    console.log('2️⃣  PGVECTOR EXTENSION')
    console.log('-'.repeat(70))
    try {
      const vectorCheck = await pool.query(
        "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'"
      )
      if (vectorCheck.rows.length > 0) {
        console.log('✅ pgvector: ENABLED')
        console.log(`   Version: ${vectorCheck.rows[0].extversion}`)
        results.push({ test: 'pgvector Extension', status: 'PASS' })
      } else {
        console.log('❌ pgvector: NOT ENABLED')
        allPassed = false
        results.push({ test: 'pgvector Extension', status: 'FAIL' })
      }
    } catch (err) {
      console.log('❌ pgvector check failed:', err.message)
      allPassed = false
      results.push({ test: 'pgvector Extension', status: 'FAIL', error: err.message })
    }
    console.log()

    // 3. Tables Check
    console.log('3️⃣  DATABASE TABLES')
    console.log('-'.repeat(70))
    const requiredTables = ['users', 'quiz_attempts', 'knowledge_chunks', 'leaderboard']
    try {
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `)
      
      console.log(`Found ${tables.rows.length} tables:`)
      tables.rows.forEach(row => {
        const isRequired = requiredTables.includes(row.table_name)
        console.log(`   ${isRequired ? '✅' : '📋'} ${row.table_name}`)
      })
      
      // Check if all required tables exist
      const existingTables = tables.rows.map(r => r.table_name)
      const missingTables = requiredTables.filter(t => !existingTables.includes(t))
      
      if (missingTables.length === 0) {
        results.push({ test: 'Required Tables', status: 'PASS' })
      } else {
        console.log(`\n❌ Missing tables: ${missingTables.join(', ')}`)
        allPassed = false
        results.push({ test: 'Required Tables', status: 'FAIL', error: `Missing: ${missingTables.join(', ')}` })
      }
    } catch (err) {
      console.log('❌ Tables check failed:', err.message)
      allPassed = false
      results.push({ test: 'Database Tables', status: 'FAIL', error: err.message })
    }
    console.log()

    // 4. Users Table Structure
    console.log('4️⃣  USERS TABLE STRUCTURE')
    console.log('-'.repeat(70))
    try {
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `)
      
      const requiredColumns = ['id', 'name', 'email', 'password', 'role', 'course']
      const existingColumns = columns.rows.map(c => c.column_name)
      
      console.log(`Users table has ${columns.rows.length} columns:`)
      requiredColumns.forEach(col => {
        if (existingColumns.includes(col)) {
          console.log(`   ✅ ${col}`)
        } else {
          console.log(`   ❌ ${col} - MISSING`)
          allPassed = false
        }
      })
      
      results.push({ test: 'Users Table Structure', status: 'PASS' })
    } catch (err) {
      console.log('❌ Users table check failed:', err.message)
      allPassed = false
      results.push({ test: 'Users Table Structure', status: 'FAIL', error: err.message })
    }
    console.log()

    // 5. Users Data
    console.log('5️⃣  USERS DATA')
    console.log('-'.repeat(70))
    try {
      const userCount = await pool.query('SELECT COUNT(*) FROM users')
      const users = await pool.query('SELECT id, name, email, role, course FROM users ORDER BY id')
      
      console.log(`Total users: ${userCount.rows[0].count}`)
      users.rows.forEach(user => {
        console.log(`   ${user.role === 'admin' ? '👑' : '👤'} ${user.name} (${user.email})`)
        console.log(`      Role: ${user.role} | Course: ${user.course || 'Not set'}`)
      })
      
      // Check for admin user
      const adminCheck = await pool.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1")
      if (adminCheck.rows.length > 0) {
        console.log('\n✅ Admin user exists')
        results.push({ test: 'Admin User', status: 'PASS' })
      } else {
        console.log('\n⚠️  No admin user found')
        results.push({ test: 'Admin User', status: 'WARN' })
      }
      
      results.push({ test: 'Users Data', status: 'PASS' })
    } catch (err) {
      console.log('❌ Users data check failed:', err.message)
      allPassed = false
      results.push({ test: 'Users Data', status: 'FAIL', error: err.message })
    }
    console.log()

    // 6. Quiz System
    console.log('6️⃣  QUIZ SYSTEM')
    console.log('-'.repeat(70))
    try {
      const quizCount = await pool.query('SELECT COUNT(*) FROM quiz_attempts')
      console.log(`Total quiz attempts: ${quizCount.rows[0].count}`)
      
      if (parseInt(quizCount.rows[0].count) > 0) {
        const recentQuizzes = await pool.query(`
          SELECT qa.*, u.name as user_name 
          FROM quiz_attempts qa 
          JOIN users u ON qa.user_id = u.id 
          ORDER BY qa.completed_at DESC 
          LIMIT 3
        `)
        
        console.log('\nRecent quiz attempts:')
        recentQuizzes.rows.forEach(quiz => {
          console.log(`   📝 ${quiz.user_name} - ${quiz.module} (${quiz.course})`)
          console.log(`      Score: ${quiz.score}/${quiz.total_questions} (${quiz.percentage}%)`)
        })
      }
      
      results.push({ test: 'Quiz System', status: 'PASS' })
    } catch (err) {
      console.log('❌ Quiz system check failed:', err.message)
      allPassed = false
      results.push({ test: 'Quiz System', status: 'FAIL', error: err.message })
    }
    console.log()

    // 7. Knowledge Base (RAG)
    console.log('7️⃣  KNOWLEDGE BASE (RAG)')
    console.log('-'.repeat(70))
    try {
      const kbCount = await pool.query('SELECT COUNT(*) FROM knowledge_chunks')
      console.log(`Total knowledge chunks: ${kbCount.rows[0].count}`)
      
      // Check for vector embeddings
      const vectorCount = await pool.query('SELECT COUNT(*) FROM knowledge_chunks WHERE embedding IS NOT NULL')
      console.log(`Chunks with embeddings: ${vectorCount.rows[0].count}`)
      
      // Check courses
      const courses = await pool.query('SELECT DISTINCT course FROM knowledge_chunks')
      if (courses.rows.length > 0) {
        console.log('\nCourses in knowledge base:')
        courses.rows.forEach(row => {
          console.log(`   📚 ${row.course}`)
        })
      }
      
      results.push({ test: 'Knowledge Base', status: 'PASS' })
    } catch (err) {
      console.log('❌ Knowledge base check failed:', err.message)
      allPassed = false
      results.push({ test: 'Knowledge Base', status: 'FAIL', error: err.message })
    }
    console.log()

    // 8. Leaderboard
    console.log('8️⃣  LEADERBOARD')
    console.log('-'.repeat(70))
    try {
      const leaderboard = await pool.query(`
        SELECT u.name, u.course, 
               COUNT(qa.id) as total_quizzes,
               AVG(qa.percentage) as avg_score
        FROM users u
        LEFT JOIN quiz_attempts qa ON u.id = qa.user_id
        WHERE u.role = 'student'
        GROUP BY u.id, u.name, u.course
        ORDER BY avg_score DESC NULLS LAST
        LIMIT 5
      `)
      
      if (leaderboard.rows.length > 0) {
        console.log('Top performers:')
        leaderboard.rows.forEach((user, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  '
          const avgScore = user.avg_score ? Math.round(user.avg_score) : 0
          console.log(`   ${medal} ${user.name} - ${avgScore}% avg (${user.total_quizzes} quizzes)`)
        })
      } else {
        console.log('No quiz data yet')
      }
      
      results.push({ test: 'Leaderboard', status: 'PASS' })
    } catch (err) {
      console.log('❌ Leaderboard check failed:', err.message)
      allPassed = false
      results.push({ test: 'Leaderboard', status: 'FAIL', error: err.message })
    }
    console.log()

    // 9. Indexes
    console.log('9️⃣  DATABASE INDEXES')
    console.log('-'.repeat(70))
    try {
      const indexes = await pool.query(`
        SELECT tablename, indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        ORDER BY tablename, indexname
      `)
      
      console.log(`Total indexes: ${indexes.rows.length}`)
      const tableIndexes = {}
      indexes.rows.forEach(idx => {
        if (!tableIndexes[idx.tablename]) tableIndexes[idx.tablename] = []
        tableIndexes[idx.tablename].push(idx.indexname)
      })
      
      Object.keys(tableIndexes).forEach(table => {
        console.log(`   📊 ${table}: ${tableIndexes[table].length} indexes`)
      })
      
      results.push({ test: 'Database Indexes', status: 'PASS' })
    } catch (err) {
      console.log('❌ Indexes check failed:', err.message)
      results.push({ test: 'Database Indexes', status: 'WARN', error: err.message })
    }
    console.log()

    // 10. Environment Variables
    console.log('🔟 ENVIRONMENT VARIABLES')
    console.log('-'.repeat(70))
    const envVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'GEMINI_API_KEY',
      'HUGGINGFACE_API_KEY'
    ]
    
    envVars.forEach(varName => {
      if (process.env[varName]) {
        const value = process.env[varName]
        const display = value.length > 20 ? value.substring(0, 20) + '...' : value
        console.log(`   ✅ ${varName}: ${display}`)
      } else {
        console.log(`   ❌ ${varName}: NOT SET`)
        allPassed = false
      }
    })
    results.push({ test: 'Environment Variables', status: 'PASS' })
    console.log()

    // Summary
    console.log('=' .repeat(70))
    console.log('📊 TEST SUMMARY')
    console.log('=' .repeat(70))
    
    const passed = results.filter(r => r.status === 'PASS').length
    const failed = results.filter(r => r.status === 'FAIL').length
    const warned = results.filter(r => r.status === 'WARN').length
    
    console.log(`✅ Passed: ${passed}`)
    if (warned > 0) console.log(`⚠️  Warnings: ${warned}`)
    if (failed > 0) console.log(`❌ Failed: ${failed}`)
    
    console.log()
    if (allPassed && failed === 0) {
      console.log('🎉 ALL SYSTEMS OPERATIONAL!')
      console.log('✨ Your application is ready for development and testing.')
    } else {
      console.log('⚠️  Some checks failed. Please review the errors above.')
    }
    
  } catch (error) {
    console.error('❌ Critical error during checks:', error)
  } finally {
    await pool.end()
  }
}

runChecks()
