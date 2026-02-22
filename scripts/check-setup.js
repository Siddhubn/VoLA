#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔍 VoLA Setup Checker\n')

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file found')
  
  // Read and check environment variables
  const envContent = fs.readFileSync(envPath, 'utf8')
  const hasMongoUri = envContent.includes('MONGODB_URI')
  const hasJwtSecret = envContent.includes('JWT_SECRET')
  
  if (hasMongoUri) {
    console.log('✅ MONGODB_URI configured')
  } else {
    console.log('⚠️  MONGODB_URI not found in .env.local')
  }
  
  if (hasJwtSecret) {
    console.log('✅ JWT_SECRET configured')
  } else {
    console.log('⚠️  JWT_SECRET not found in .env.local')
  }
} else {
  console.log('❌ .env.local file not found')
  console.log('   Please copy .env.local.example to .env.local and configure it')
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, '..', 'node_modules')
if (fs.existsSync(nodeModulesPath)) {
  console.log('✅ node_modules found')
} else {
  console.log('❌ node_modules not found')
  console.log('   Please run: npm install')
}

// Check package.json
const packagePath = path.join(__dirname, '..', 'package.json')
if (fs.existsSync(packagePath)) {
  console.log('✅ package.json found')
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    const hasNextJs = packageJson.dependencies && packageJson.dependencies.next
    const hasMongoose = packageJson.dependencies && packageJson.dependencies.mongoose
    const hasBcrypt = packageJson.dependencies && packageJson.dependencies.bcryptjs
    
    if (hasNextJs) {
      console.log('✅ Next.js dependency found')
    } else {
      console.log('❌ Next.js dependency missing')
    }
    
    if (hasMongoose) {
      console.log('✅ Mongoose dependency found')
    } else {
      console.log('⚠️  Mongoose dependency missing (will use fallback auth)')
    }
    
    if (hasBcrypt) {
      console.log('✅ bcryptjs dependency found')
    } else {
      console.log('❌ bcryptjs dependency missing')
    }
  } catch (error) {
    console.log('❌ Error reading package.json:', error.message)
  }
} else {
  console.log('❌ package.json not found')
}

console.log('\n📋 Setup Summary:')
console.log('- If MongoDB is not available, the app will use in-memory storage')
console.log('- This is perfect for testing and development')
console.log('- Data will be lost when the server restarts')
console.log('\n🚀 To start the application:')
console.log('   npm run dev')
console.log('\n🌐 Then open: http://localhost:3000')