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

async function addTradeTypeColumn() {
  try {
    console.log('\n🔧 Adding trade_type and module_name columns to knowledge_chunks table...\n');
    
    // Check if trade_type column already exists
    const checkTradeType = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_chunks' AND column_name = 'trade_type'
    `);
    
    if (checkTradeType.rows.length === 0) {
      // Add the trade_type column
      await pool.query(`
        ALTER TABLE knowledge_chunks 
        ADD COLUMN trade_type VARCHAR(20)
      `);
      console.log('✅ Successfully added trade_type column');
    } else {
      console.log('ℹ️  trade_type column already exists');
    }
    
    // Check if module_name column already exists
    const checkModuleName = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_chunks' AND column_name = 'module_name'
    `);
    
    if (checkModuleName.rows.length === 0) {
      // Add the module_name column
      await pool.query(`
        ALTER TABLE knowledge_chunks 
        ADD COLUMN module_name VARCHAR(255)
      `);
      console.log('✅ Successfully added module_name column');
    } else {
      console.log('ℹ️  module_name column already exists');
    }
    
    // Check if index already exists
    const checkIndex = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'knowledge_chunks' 
      AND indexname = 'idx_knowledge_chunks_trade_type'
    `);
    
    if (checkIndex.rows.length === 0) {
      // Create index on (course, trade_type, module)
      await pool.query(`
        CREATE INDEX idx_knowledge_chunks_trade_type 
        ON knowledge_chunks(course, trade_type, module)
      `);
      console.log('✅ Successfully created index on (course, trade_type, module)');
    } else {
      console.log('ℹ️  Index idx_knowledge_chunks_trade_type already exists');
    }
    
    console.log('\n📋 Updated knowledge_chunks table structure:');
    
    // Show updated table structure
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_chunks'
      ORDER BY ordinal_position
    `);
    
    columnsResult.rows.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`   - ${col.column_name} ${col.data_type}${length} ${nullable}`);
    });
    
    console.log('\n📊 Indexes on knowledge_chunks:');
    const indexesResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'knowledge_chunks'
      ORDER BY indexname
    `);
    
    indexesResult.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    
    console.log('\n✅ Schema update complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

addTradeTypeColumn();
