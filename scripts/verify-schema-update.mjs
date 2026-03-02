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

async function verifySchemaUpdate() {
  try {
    console.log('\n🔍 Verifying schema updates...\n');
    
    // Check for new columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_chunks' 
      AND column_name IN ('trade_type', 'module_name')
      ORDER BY column_name
    `);
    
    console.log('✅ New columns in knowledge_chunks:');
    columnsResult.rows.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   - ${col.column_name}: ${col.data_type}${length} ${nullable}`);
    });
    
    // Check for new index
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'knowledge_chunks' 
      AND indexname = 'idx_knowledge_chunks_trade_type'
    `);
    
    console.log('\n✅ New index:');
    if (indexResult.rows.length > 0) {
      indexResult.rows.forEach(idx => {
        console.log(`   - ${idx.indexname}`);
        console.log(`     ${idx.indexdef}`);
      });
    } else {
      console.log('   ⚠️  Index not found!');
    }
    
    // Check current data count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total_chunks
      FROM knowledge_chunks
    `);
    
    console.log(`\n📊 Current data: ${countResult.rows[0].total_chunks} chunks in database`);
    
    console.log('\n✅ Schema verification complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

verifySchemaUpdate();
