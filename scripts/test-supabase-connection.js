const { Pool } = require('pg')

// Test different connection formats
const connections = [
  {
    name: 'Direct Connection',
    url: 'postgresql://postgres:InternXcelerator@db.swnlggxbfjapndekvlgr.supabase.co:5432/postgres'
  },
  {
    name: 'Pooler Connection (IPv4)',
    url: 'postgresql://postgres.swnlggxbfjapndekvlgr:InternXcelerator@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
  },
  {
    name: 'Pooler Connection (IPv6)',
    url: 'postgresql://postgres.swnlggxbfjapndekvlgr:InternXcelerator@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
  }
]

async function testConnection(config) {
  console.log(`\n🔍 Testing: ${config.name}`)
  console.log(`   URL: ${config.url.replace(/:[^:@]+@/, ':****@')}`)
  
  const pool = new Pool({
    connectionString: config.url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  })

  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW(), version()')
    client.release()
    
    console.log(`   ✅ SUCCESS!`)
    console.log(`   Time: ${result.rows[0].now}`)
    console.log(`   Version: ${result.rows[0].version.split(',')[0]}`)
    
    await pool.end()
    return true
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`)
    await pool.end()
    return false
  }
}

async function testAll() {
  console.log('🚀 Testing Supabase Connections...\n')
  console.log('=' .repeat(60))
  
  let successCount = 0
  
  for (const config of connections) {
    const success = await testConnection(config)
    if (success) successCount++
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`\n📊 Results: ${successCount}/${connections.length} connections successful`)
  
  if (successCount === 0) {
    console.log('\n⚠️  All connections failed. Please check:')
    console.log('   1. Is your Supabase project active?')
    console.log('   2. Is your internet connection working?')
    console.log('   3. Is the password correct?')
    console.log('   4. Try accessing Supabase Dashboard: https://supabase.com/dashboard')
    console.log('\n💡 Alternative: Use the SQL Editor in Supabase Dashboard')
    console.log('   Copy and paste scripts/setup-supabase.sql into SQL Editor')
  } else {
    console.log('\n✅ Connection successful! You can proceed with migration.')
  }
}

testAll()
