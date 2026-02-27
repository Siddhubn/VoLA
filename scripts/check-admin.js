require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function checkAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    console.log('🔍 Checking admin user...\n');
    const client = await pool.connect();
    
    // Check if admin user exists
    const result = await client.query(`
      SELECT id, name, email, role, course, created_at 
      FROM users 
      WHERE email = 'admin@vola.com' OR role = 'admin'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Admin user found:');
      result.rows.forEach(user => {
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Course: ${user.course}`);
        console.log(`   Created: ${user.created_at}`);
      });
      
      // Check password
      const passwordCheck = await client.query(`
        SELECT password FROM users WHERE email = 'admin@vola.com'
      `);
      
      if (passwordCheck.rows.length > 0) {
        const storedHash = passwordCheck.rows[0].password;
        const testPassword = 'Admin@1234';
        const isMatch = await bcrypt.compare(testPassword, storedHash);
        
        console.log(`\n🔐 Password check:`);
        console.log(`   Test password: ${testPassword}`);
        console.log(`   Match: ${isMatch ? '✅ YES' : '❌ NO'}`);
        
        if (!isMatch) {
          console.log('\n⚠️  Password does not match! Updating...');
          const newHash = await bcrypt.hash(testPassword, 10);
          await client.query(`
            UPDATE users 
            SET password = $1 
            WHERE email = 'admin@vola.com'
          `, [newHash]);
          console.log('✅ Password updated successfully!');
        }
      }
    } else {
      console.log('❌ No admin user found!');
      console.log('\n📝 Creating admin user...');
      
      const hashedPassword = await bcrypt.hash('Admin@1234', 10);
      
      await client.query(`
        INSERT INTO users (name, email, password, role, course, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['Admin', 'admin@vola.com', hashedPassword, 'admin', 'fitter', true]);
      
      console.log('✅ Admin user created!');
      console.log('   Email: admin@vola.com');
      console.log('   Password: Admin@1234');
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Admin check complete!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: admin@vola.com');
    console.log('   Password: Admin@1234');
    console.log('   URL: http://localhost:3000/master');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkAdmin();
