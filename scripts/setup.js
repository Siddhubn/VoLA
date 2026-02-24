#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 VoLA Complete Setup Script\n')

function runCommand(command, description) {
  console.log(`🔄 ${description}...`)
  try {
    execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') })
    console.log(`✅ ${description} completed\n`)
    return true
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    return false
  }
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath)
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${description} exists`)
    return true
  } else {
    console.log(`❌ ${description} missing`)
    return false
  }
}

async function main() {
  console.log('📋 Pre-setup checks...')
  
  // Check if .env.local exists
  if (!checkFile('.env.local', '.env.local file')) {
    console.log('\n💡 Creating .env.local from template...')
    const envTemplate = `DATABASE_URL=postgresql://postgres:password@localhost:5432/vola_db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-${Date.now()}
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-${Date.now()}`
    
    fs.writeFileSync(path.join(__dirname, '..', '.env.local'), envTemplate)
    console.log('✅ .env.local created with default values')
    console.log('⚠️  Please update DATABASE_URL with your PostgreSQL credentials')
  }

  // Check Node.js version
  console.log('\n🔍 Checking Node.js version...')
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim()
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0])
    if (majorVersion >= 18) {
      console.log(`✅ Node.js ${nodeVersion} (compatible)`)
    } else {
      console.log(`❌ Node.js ${nodeVersion} (requires 18+)`)
      console.log('Please upgrade Node.js to version 18 or higher')
      process.exit(1)
    }
  } catch (error) {
    console.log('❌ Node.js not found')
    process.exit(1)
  }

  // Install dependencies
  if (!runCommand('npm install', 'Installing dependencies')) {
    console.log('💡 Try running: rm -rf node_modules package-lock.json && npm install')
    process.exit(1)
  }

  // Fix vulnerabilities
  console.log('🔒 Fixing security vulnerabilities...')
  try {
    execSync('npm audit fix', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
    console.log('✅ Security vulnerabilities fixed\n')
  } catch (error) {
    console.log('⚠️  Some vulnerabilities could not be auto-fixed (this is usually okay)\n')
  }

  // Check setup
  if (!runCommand('npm run check-setup', 'Checking setup')) {
    console.log('💡 Please fix the setup issues above before continuing')
    process.exit(1)
  }

  // Initialize database
  console.log('🗄️  Initializing PostgreSQL database...')
  if (!runCommand('npm run init-db', 'Database initialization')) {
    console.log('\n💡 Database initialization failed. Common solutions:')
    console.log('1. Make sure PostgreSQL is running:')
    console.log('   - macOS: brew services start postgresql')
    console.log('   - Ubuntu: sudo systemctl start postgresql')
    console.log('2. Create the database: psql -U postgres -c "CREATE DATABASE vola_db;"')
    console.log('3. Update DATABASE_URL in .env.local with correct credentials')
    process.exit(1)
  }

  // Test database
  if (!runCommand('npm run test-db', 'Testing database connection')) {
    console.log('💡 Database tests failed. Please check your PostgreSQL setup.')
    process.exit(1)
  }

  console.log('🎉 Setup completed successfully!')
  console.log('\n📋 Next steps:')
  console.log('1. Start the development server: npm run dev')
  console.log('2. Open your browser: http://localhost:3000')
  console.log('3. Register a new account to test the application')
  console.log('\n💡 Useful commands:')
  console.log('- npm run dev          # Start development server')
  console.log('- npm run test-db      # Test database connection')
  console.log('- npm run init-db      # Reinitialize database')
  console.log('- npm run check-setup  # Check configuration')
  console.log('\n📚 Documentation:')
  console.log('- README.md            # Complete setup guide')
  console.log('- POSTGRESQL_SETUP.md  # PostgreSQL specific help')
  console.log('- TROUBLESHOOTING.md   # Common issues and solutions')
}

main().catch(error => {
  console.error('\n❌ Setup failed:', error.message)
  process.exit(1)
})