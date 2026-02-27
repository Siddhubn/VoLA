require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function updateMandatoryFields() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    console.log('🔄 Updating users table to make role and course mandatory...\n');
    const client = await pool.connect();
    
    // Remove default values from role and course columns
    console.log('📝 Removing default value from role column...');
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN role DROP DEFAULT
    `);
    console.log('✅ Role column: No default value');
    
    console.log('📝 Removing default value from course column...');
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN course DROP DEFAULT
    `);
    console.log('✅ Course column: No default value');
    
    // Make columns NOT NULL
    console.log('📝 Making role column NOT NULL...');
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN role SET NOT NULL
    `);
    console.log('✅ Role column: NOT NULL');
    
    console.log('📝 Making course column NOT NULL...');
    await client.query(`
      ALTER TABLE users 
      ALTER COLUMN course SET NOT NULL
    `);
    console.log('✅ Course column: NOT NULL');
    
    // Verify changes
    console.log('\n📋 Verifying changes:');
    const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('role', 'course')
      ORDER BY column_name
    `);
    
    result.rows.forEach(row => {
      console.log(`\n   ${row.column_name}:`);
      console.log(`      Type: ${row.data_type}`);
      console.log(`      Nullable: ${row.is_nullable}`);
      console.log(`      Default: ${row.column_default || 'NONE (mandatory)'}`);
    });
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Update complete!');
    console.log('\n📝 Users must now provide:');
    console.log('   • Role (student/instructor/admin) - MANDATORY');
    console.log('   • Course (fitter/electrician) - MANDATORY');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

updateMandatoryFields();
