const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5432/vola_db'
})

async function addCourseField() {
  try {
    console.log('🔧 Adding course field to users table...')

    // Add course column if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS course VARCHAR(50);
    `)

    console.log('✅ Course field added successfully')

    // Check the updated structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'course'
    `)

    if (result.rows.length > 0) {
      console.log('✅ Course column verified:')
      console.log('   - Name:', result.rows[0].column_name)
      console.log('   - Type:', result.rows[0].data_type)
      console.log('   - Nullable:', result.rows[0].is_nullable)
    }

    console.log('\n📋 Course field is ready!')
    console.log('   Users can now select: Fitter or Electrician')

  } catch (error) {
    console.error('❌ Error adding course field:', error.message)
  } finally {
    await pool.end()
  }
}

addCourseField()
