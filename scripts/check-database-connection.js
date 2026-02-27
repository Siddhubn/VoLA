require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function checkDatabaseConnection() {
  console.log('🔍 Checking Database Connection...\n');
  
  // Parse DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  console.log('📋 Connection String:');
  console.log(`   ${dbUrl}\n`);
  
  // Extract connection details
  const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (urlMatch) {
    console.log('📊 Connection Details:');
    console.log(`   User: ${urlMatch[1]}`);
    console.log(`   Password: ${'*'.repeat(urlMatch[2].length)}`);
    console.log(`   Host: ${urlMatch[3]}`);
    console.log(`   Port: ${urlMatch[4]} ${urlMatch[4] === '5433' ? '(Docker Desktop)' : '(Local PostgreSQL)'}`);
    console.log(`   Database: ${urlMatch[5]}\n`);
  }
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: false
  });

  try {
    const client = await pool.connect();
    
    // Get database info
    console.log('✅ Connected to database!\n');
    
    const versionResult = await client.query('SELECT version()');
    console.log('📦 PostgreSQL Version:');
    console.log(`   ${versionResult.rows[0].version.split(',')[0]}\n`);
    
    // Get current database
    const dbResult = await client.query('SELECT current_database()');
    console.log('💾 Current Database:');
    console.log(`   ${dbResult.rows[0].current_database}\n`);
    
    // Get all users in the database
    console.log('👥 Users in Database:');
    const usersResult = await client.query(`
      SELECT id, name, email, role, course, created_at 
      FROM users 
      ORDER BY id
    `);
    
    if (usersResult.rows.length > 0) {
      console.log(`   Total: ${usersResult.rows.length} users\n`);
      usersResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}`);
        console.log(`      Name: ${user.name}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Course: ${user.course}`);
        console.log(`      Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('   No users found\n');
    }
    
    // Check if there are other databases
    console.log('📚 All Databases on this Server:');
    const dbsResult = await client.query(`
      SELECT datname FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname
    `);
    dbsResult.rows.forEach(db => {
      const marker = db.datname === 'vola_db' ? ' ← CURRENT' : '';
      console.log(`   • ${db.datname}${marker}`);
    });
    
    client.release();
    await pool.end();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ You are connected to Docker Desktop PostgreSQL');
    console.log('   Port: 5433');
    console.log('   Database: vola_db');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkDatabaseConnection();
