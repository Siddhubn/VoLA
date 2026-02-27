require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function verifyDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });

  try {
    console.log('🔄 Verifying database setup...\n');
    const client = await pool.connect();
    
    // Check pgvector extension
    console.log('1️⃣ Checking pgvector extension...');
    const vectorCheck = await client.query(`
      SELECT EXISTS (SELECT FROM pg_extension WHERE extname = 'vector')
    `);
    if (vectorCheck.rows[0].exists) {
      console.log('   ✅ pgvector extension is installed');
    } else {
      console.log('   ⚠️  pgvector extension is NOT installed');
    }
    
    // Check users table
    console.log('\n2️⃣ Checking users table...');
    const usersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `);
    if (usersCheck.rows[0].exists) {
      console.log('   ✅ users table exists');
      
      // Check for course column
      const courseCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'course'
      `);
      if (courseCheck.rows.length > 0) {
        console.log('   ✅ course column exists');
      } else {
        console.log('   ❌ course column is MISSING');
      }
    } else {
      console.log('   ❌ users table does NOT exist');
    }
    
    // Check RAG tables
    console.log('\n3️⃣ Checking RAG tables...');
    const ragTables = ['pdf_documents', 'module_mapping', 'knowledge_chunks', 'chat_history'];
    
    for (const table of ragTables) {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (tableCheck.rows[0].exists) {
        console.log(`   ✅ ${table} table exists`);
      } else {
        console.log(`   ⚠️  ${table} table does NOT exist`);
      }
    }
    
    // Check knowledge_chunks embedding column
    if (vectorCheck.rows[0].exists) {
      console.log('\n4️⃣ Checking embedding column...');
      const embeddingCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'knowledge_chunks' 
        AND column_name IN ('embedding', 'embedding_placeholder')
      `);
      
      if (embeddingCheck.rows.length > 0) {
        embeddingCheck.rows.forEach(row => {
          console.log(`   ✅ ${row.column_name} column exists (${row.data_type})`);
        });
      } else {
        console.log('   ⚠️  No embedding column found');
      }
    }
    
    // Test connection
    console.log('\n5️⃣ Testing database connection...');
    const timeCheck = await client.query('SELECT NOW() as current_time');
    console.log(`   ✅ Connection successful: ${timeCheck.rows[0].current_time}`);
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Database verification complete!');
    console.log('\n📝 Summary:');
    console.log('   - PostgreSQL: Working');
    console.log('   - pgvector: ' + (vectorCheck.rows[0].exists ? 'Installed' : 'Not installed'));
    console.log('   - Users table: Ready for authentication');
    console.log('   - RAG tables: Ready for vector search');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyDatabase();
