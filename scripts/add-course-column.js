require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function addCourseColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    
    console.log('📝 Adding course column to users table...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS course VARCHAR(50) DEFAULT 'fitter'
    `);
    
    console.log('✅ Course column added successfully!');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'course'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: course column exists');
      console.log(`   Type: ${result.rows[0].data_type}`);
      console.log(`   Default: ${result.rows[0].column_default}`);
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Migration complete! You can now register users.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

addCourseColumn();
