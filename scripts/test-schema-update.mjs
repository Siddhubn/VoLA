import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
});

async function testSchemaUpdate() {
  try {
    console.log('\n🧪 Testing schema update...\n');
    
    // Test 1: Verify columns exist
    console.log('Test 1: Verifying new columns exist...');
    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_chunks' 
      AND column_name IN ('trade_type', 'module_name')
      ORDER BY column_name
    `);
    
    if (columnsResult.rows.length === 2) {
      console.log('✅ Both columns exist');
    } else {
      console.log('❌ Missing columns:', columnsResult.rows);
      throw new Error('Columns not found');
    }
    
    // Test 2: Verify index exists
    console.log('\nTest 2: Verifying index exists...');
    const indexResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes 
      WHERE tablename = 'knowledge_chunks' 
      AND indexname = 'idx_knowledge_chunks_trade_type'
    `);
    
    if (indexResult.rows.length === 1) {
      console.log('✅ Index exists');
    } else {
      console.log('❌ Index not found');
      throw new Error('Index not found');
    }
    
    // Test 3: Test inserting a record with new fields (dry run - we'll rollback)
    console.log('\nTest 3: Testing insert with new fields...');
    await pool.query('BEGIN');
    
    try {
      // First create a test PDF document
      const pdfInsert = await pool.query(`
        INSERT INTO pdf_documents 
        (course, filename, file_path, processing_status)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, ['electrician', 'test.pdf', '/test/test.pdf', 'completed']);
      
      const testInsert = await pool.query(`
        INSERT INTO knowledge_chunks 
        (course, pdf_source, module, module_name, section, page_number, chunk_index, 
         content, content_preview, token_count, trade_type, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, trade_type, module_name
      `, [
        'electrician',
        'test.pdf',
        'module-1',
        'Module 1 - Test Module',
        'test-section',
        1,
        0,
        'Test content',
        'Test preview',
        10,
        'trade_theory',
        JSON.stringify({})
      ]);
      
      console.log('✅ Insert successful');
      console.log('   Returned:', testInsert.rows[0]);
      
      // Rollback the test insert
      await pool.query('ROLLBACK');
      console.log('✅ Test insert rolled back (no data persisted)');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    
    // Test 4: Test querying with trade_type filter
    console.log('\nTest 4: Testing query with trade_type filter...');
    const queryResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM knowledge_chunks
      WHERE trade_type IS NULL
    `);
    
    console.log(`✅ Query successful - ${queryResult.rows[0].count} chunks without trade_type`);
    
    console.log('\n✅ All tests passed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

testSchemaUpdate();
