import { config } from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
config({ path: path.join(__dirname, '../../../.env.local') })

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in .env.local for tests')
}

console.log('✅ Test environment configured')
