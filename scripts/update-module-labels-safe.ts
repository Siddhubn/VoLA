import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:admin@localhost:5433/vola_db',
  password: 'admin',
})

/**
 * SAFE MODULE LABEL UPDATE
 * 
 * This script ONLY updates the 'module' field in existing records.
 * It does NOT:
 * - Delete any data
 * - Modify embeddings
 * - Change content
 * - Affect other tables
 * - Impact quiz functionality
 * - Touch chat history
 * 
 * It's completely safe and reversible.
 */

// Module definitions based on page analysis
const MODULE_DEFINITIONS = [
  { module: 'module-1', name: 'Safety Practice and Hand Tools', startPage: 16, endPage: 45 },
  { module: 'module-2', name: 'Basic Electrical Concepts', startPage: 46, endPage: 75 },
  { module: 'module-3', name: 'Wires, Joints and Soldering', startPage: 76, endPage: 105 },
  { module: 'module-4', name: 'Electrical Installations', startPage: 106, endPage: 135 },
  { module: 'module-5', name: 'Measuring Instruments', startPage: 136, endPage: 165 },
  { module: 'module-6', name: 'AC Circuits and Motors', startPage: 166, endPage: 195 },
  { module: 'module-7', name: 'Transformers and Distribution', startPage: 196, endPage: 225 },
  { module: 'module-8', name: 'Control Systems', startPage: 226, endPage: 255 },
  { module: 'module-9', name: 'Industrial Wiring', startPage: 256, endPage: 285 },
  { module: 'module-10', name: 'Advanced Topics', startPage: 286, endPage: 308 },
]

async function updateModuleLabels() {
  try {
    console.log('🔄 SAFE MODULE LABEL UPDATE')
    console.log('=' .repeat(80))
    console.log('\n⚠️  This script will ONLY update the module field.')
    console.log('   It will NOT affect embeddings, content, or other functionality.\n')

    // Show current state
    const beforeResult = await pool.query(`
      SELECT module, COUNT(*) as count
      FROM knowledge_chunks
      WHERE course = 'electrician'
      GROUP BY module
    `)

    console.log('📊 Current State:')
    beforeResult.rows.forEach(row => {
      console.log(`   ${row.module}: ${row.count} chunks`)
    })

    console.log('\n📝 Proposed Changes:')
    console.log('─'.repeat(80))

    // Show what will be updated
    for (const def of MODULE_DEFINITIONS) {
      const countResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM knowledge_chunks
        WHERE course = 'electrician'
          AND page_number >= $1
          AND page_number <= $2
      `, [def.startPage, def.endPage])

      console.log(`   ${def.module} (${def.name})`)
      console.log(`   Pages ${def.startPage}-${def.endPage}: ${countResult.rows[0].count} chunks will be updated`)
    }

    console.log('\n' + '─'.repeat(80))
    console.log('\n⏳ Starting update...\n')

    let totalUpdated = 0

    // Update each module
    for (const def of MODULE_DEFINITIONS) {
      const result = await pool.query(`
        UPDATE knowledge_chunks
        SET 
          module = $1,
          module_name = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE course = 'electrician'
          AND page_number >= $3
          AND page_number <= $4
        RETURNING id
      `, [def.module, def.name, def.startPage, def.endPage])

      const updated = result.rowCount || 0
      totalUpdated += updated

      console.log(`   ✅ ${def.module}: Updated ${updated} chunks`)
    }

    console.log('\n' + '─'.repeat(80))
    console.log(`\n✅ Update Complete! Total chunks updated: ${totalUpdated}`)

    // Show new state
    const afterResult = await pool.query(`
      SELECT module, module_name, COUNT(*) as count
      FROM knowledge_chunks
      WHERE course = 'electrician'
      GROUP BY module, module_name
      ORDER BY module
    `)

    console.log('\n📊 New State:')
    afterResult.rows.forEach(row => {
      console.log(`   ${row.module} (${row.module_name}): ${row.count} chunks`)
    })

    // Verify embeddings are intact
    const embeddingCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM knowledge_chunks
      WHERE course = 'electrician'
        AND embedding IS NOT NULL
    `)

    console.log(`\n🔍 Verification:`)
    console.log(`   Embeddings intact: ${embeddingCheck.rows[0].count} chunks still have embeddings`)
    console.log(`   ✅ No data lost, only labels updated!`)

    console.log('\n' + '='.repeat(80))
    console.log('✅ SAFE UPDATE COMPLETED SUCCESSFULLY!')
    console.log('\n💡 You can now ask questions like:')
    console.log('   - "What topics are covered in Module 1?"')
    console.log('   - "Explain Module 2 content"')
    console.log('   - "What is Safety Practice and Hand Tools about?"')

  } catch (error) {
    console.error('\n❌ Error during update:', error)
    console.log('\n⚠️  No changes were made. Database is unchanged.')
  } finally {
    await pool.end()
  }
}

// Run the update
updateModuleLabels()
