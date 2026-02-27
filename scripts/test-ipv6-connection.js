const { Pool } = require('pg')

async function testIPv6() {
  console.log('🔍 Testing IPv6 direct connection...\n')
  
  // Try with IPv6 address directly
  const ipv6Connection = 'postgresql://postgres:InternXcelerator@[2406:da14:271:9917:20ae:f7cb:e3ed:b9cf]:5432/postgres'
  
  console.log('Connection: Using IPv6 address directly')
  console.log('Address: [2406:da14:271:9917:20ae:f7cb:e3ed:b9cf]:5432\n')
  
  const pool = new Pool({
    connectionString: ipv6Connection,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  })

  try {
    console.log('⏳ Attempting to connect...')
    const client = await pool.connect()
    console.log('✅ Connected successfully via IPv6!\n')
    
    const result = await client.query('SELECT NOW()')
    console.log('📅 Server time:', result.rows[0].now)
    
    client.release()
    await pool.end()
    
    console.log('\n✨ IPv6 connection works! Update your .env.local with:')
    console.log('DATABASE_URL=' + ipv6Connection)
    
  } catch (error) {
    console.error('\n❌ IPv6 connection failed:', error.message)
    console.log('\n💡 Your network does not support IPv6 connectivity to Supabase.')
    console.log('   This is a common issue. Supabase should provide an IPv4 address.')
    console.log('\n📧 Contact Supabase support or check if your project region supports IPv4.')
    await pool.end()
  }
}

testIPv6()
