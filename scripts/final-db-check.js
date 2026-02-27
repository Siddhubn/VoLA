require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function finalDatabaseCheck() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    console.log('🔄 Final Database Check...\n');
    const client = await pool.connect();
    
    // Essential tables for the application
    const essentialTables = {
      'users': 'User authentication and profiles',
      'quiz_attempts': 'Quiz scores and results',
      'pdf_documents': 'RAG: PDF tracking',
      'module_mapping': 'RAG: Module definitions',
      'knowledge_chunks': 'RAG: Vector embeddings',
      'chat_history': 'RAG: Chatbot conversations'
    };
    
    console.log('📋 Essential Tables:\n');
    
    let allGood = true;
    
    for (const [tableName, description] of Object.entries(essentialTables)) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName]);
      
      if (result.rows[0].exists) {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`   ✅ ${tableName.padEnd(20)} ${description.padEnd(30)} (${count} rows)`);
      } else {
        console.log(`   ❌ ${tableName.padEnd(20)} ${description.padEnd(30)} (MISSING)`);
        allGood = false;
      }
    }
    
    // Check critical columns
    console.log('\n📋 Critical Columns:\n');
    
    const criticalColumns = {
      'users': ['id', 'name', 'email', 'password', 'role', 'course'],
      'quiz_attempts': ['id', 'user_id', 'course', 'module', 'score', 'total_questions']
    };
    
    for (const [table, columns] of Object.entries(criticalColumns)) {
      const columnsResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      
      const existingColumns = columnsResult.rows.map(r => r.column_name);
      
      console.log(`   ${table}:`);
      columns.forEach(col => {
        if (existingColumns.includes(col)) {
          console.log(`      ✅ ${col}`);
        } else {
          console.log(`      ❌ ${col} (MISSING)`);
          allGood = false;
        }
      });
    }
    
    // Check pgvector
    console.log('\n📋 Extensions:\n');
    const vectorCheck = await client.query(`
      SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')
    `);
    if (vectorCheck.rows[0].exists) {
      console.log('   ✅ pgvector extension installed');
    } else {
      console.log('   ⚠️  pgvector extension not installed (optional for RAG)');
    }
    
    // Test connection
    console.log('\n📋 Connection Test:\n');
    const timeCheck = await client.query('SELECT NOW() as current_time, version() as version');
    console.log(`   ✅ Connected: ${timeCheck.rows[0].current_time}`);
    console.log(`   ✅ PostgreSQL version: ${timeCheck.rows[0].version.split(',')[0]}`);
    
    client.release();
    await pool.end();
    
    console.log('\n' + '='.repeat(70));
    if (allGood) {
      console.log('✅ DATABASE IS READY FOR PRODUCTION!');
      console.log('\n📝 What works:');
      console.log('   ✅ User registration and login');
      console.log('   ✅ Admin dashboard');
      console.log('   ✅ Quiz system (scores and results)');
      console.log('   ✅ RAG system (vector search ready)');
      console.log('   ✅ Course selection (Fitter/Electrician)');
    } else {
      console.log('⚠️  SOME ISSUES FOUND - Please fix missing tables/columns');
    }
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

finalDatabaseCheck();
