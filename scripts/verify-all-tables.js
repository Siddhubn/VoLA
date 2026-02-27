require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function verifyAllTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    console.log('🔄 Verifying all database tables...\n');
    const client = await pool.connect();
    
    // List of expected tables
    const expectedTables = [
      'users',
      'quiz_attempts',
      'quiz_questions',
      'pdf_documents',
      'module_mapping',
      'knowledge_chunks',
      'chat_history'
    ];
    
    console.log('📋 Checking tables:\n');
    
    const missingTables = [];
    const existingTables = [];
    
    for (const tableName of expectedTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName]);
      
      if (result.rows[0].exists) {
        // Get row count
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   ✅ ${tableName.padEnd(20)} (${count} rows)`);
        existingTables.push(tableName);
      } else {
        console.log(`   ❌ ${tableName.padEnd(20)} (MISSING)`);
        missingTables.push(tableName);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Existing: ${existingTables.length}/${expectedTables.length}`);
    console.log(`   Missing: ${missingTables.length}`);
    
    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing tables:', missingTables.join(', '));
      console.log('\n💡 To create missing tables, run:');
      console.log('   npm run init-db');
    } else {
      console.log('\n✅ All tables exist!');
    }
    
    // Check users table columns
    console.log('\n📋 Users table columns:');
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    const requiredColumns = ['id', 'name', 'email', 'password', 'role', 'course'];
    const existingColumns = columnsResult.rows.map(r => r.column_name);
    
    requiredColumns.forEach(col => {
      if (existingColumns.includes(col)) {
        console.log(`   ✅ ${col}`);
      } else {
        console.log(`   ❌ ${col} (MISSING)`);
      }
    });
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyAllTables();
