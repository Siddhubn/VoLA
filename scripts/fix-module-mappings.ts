#!/usr/bin/env tsx
/**
 * Fix module mappings to match the actual knowledge chunks
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

async function fixModuleMappings() {
  console.log('🔧 Fixing module mappings to match knowledge chunks...\n');
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon DB\n');

    // Clear existing module mappings
    console.log('🗑️  Clearing old module mappings...');
    await client.query('DELETE FROM module_mapping');
    console.log('   ✅ Cleared\n');

    // Get actual modules from knowledge_chunks
    console.log('📊 Extracting modules from knowledge_chunks...');
    const modules = await client.query(`
      SELECT 
        course,
        module as module_id,
        module_name,
        COUNT(*) as chunk_count,
        MIN(page_number) as first_page
      FROM knowledge_chunks
      WHERE module IS NOT NULL AND module_name IS NOT NULL
      GROUP BY course, module, module_name
      ORDER BY course, module
    `);
    
    console.log(`   Found ${modules.rows.length} modules\n`);

    // Insert correct module mappings
    console.log('📝 Inserting correct module mappings...\n');
    
    for (const row of modules.rows) {
      const displayOrder = parseInt(row.module_id.replace('module-', ''));
      
      await client.query(`
        INSERT INTO module_mapping (course, module_id, module_name, display_order)
        VALUES ($1, $2, $3, $4)
      `, [row.course, row.module_id, row.module_name, displayOrder]);
      
      console.log(`   ✅ [${row.course}] ${row.module_id}: ${row.module_name} (${row.chunk_count} chunks)`);
    }

    console.log('\n🎉 Module mappings fixed successfully!\n');

    // Verify the fix
    console.log('🔍 Verifying updated mappings...\n');
    const verification = await client.query(`
      SELECT course, module_id, module_name, display_order
      FROM module_mapping
      ORDER BY course, display_order
    `);
    
    console.log('Updated Module Mappings:\n');
    verification.rows.forEach((row: any) => {
      console.log(`  [${row.course}] ${row.module_id}`);
      console.log(`    ${row.module_name}`);
      console.log('');
    });

    client.release();
    await pool.end();
    
  } catch (error: any) {
    console.error('\n❌ Fix failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

fixModuleMappings();
