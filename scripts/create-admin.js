const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/vola_db'
})

// Get admin credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234'

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...')

    // Check if admin user already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@vola.system']
    )

    if (existingAdmin.rows.length > 0) {
      console.log('✅ Admin user already exists')
      return
    }

    // Hash the admin password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12)

    // Create admin user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, is_active, skills, learning_goals, completed_courses, total_study_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, email, role`,
      [
        'System Administrator',
        'admin@vola.system',
        hashedPassword,
        'admin',
        true,
        ['System Administration', 'User Management'],
        ['Maintain System Security', 'Monitor User Activity'],
        0,
        0
      ]
    )

    const admin = result.rows[0]
    console.log('✅ Admin user created successfully:')
    console.log(`   ID: ${admin.id}`)
    console.log(`   Name: ${admin.name}`)
    console.log(`   Email: ${admin.email}`)
    console.log(`   Role: ${admin.role}`)
    console.log('')
    console.log('🔑 Admin Login Credentials:')
    console.log(`   Username: ${ADMIN_USERNAME}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log('   URL: http://localhost:3003/master')
    console.log('')
    console.log('⚠️  SECURITY NOTE: Change these credentials in production!')

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message)
  } finally {
    await pool.end()
  }
}

createAdminUser()