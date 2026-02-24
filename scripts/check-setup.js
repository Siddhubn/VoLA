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
  const hasDatabaseUrl = envContent.includes('DATABASE_URL')
  const hasJwtSecret = envContent.includes('JWT_SECRET')
  
  if (hasDatabaseUrl) {
    console.log('✅ DATABASE_URL configured')
  } else {
    console.log('⚠️  DATABASE_URL not found in .env.local')
    console.log('   Please add: DATABASE_URL=postgresql://username:password@localhost:5432/vola_db')
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
    const hasPostgres = packageJson.dependencies && packageJson.dependencies.pg
    const hasBcrypt = packageJson.dependencies && packageJson.dependencies.bcryptjs
    
    if (hasNextJs) {
      console.log('✅ Next.js dependency found')
    } else {
      console.log('❌ Next.js dependency missing')
    }
    
    if (hasPostgres) {
      console.log('✅ PostgreSQL (pg) dependency found')
    } else {
      console.log('❌ PostgreSQL (pg) dependency missing')
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
console.log('- This application now uses PostgreSQL for data storage')
console.log('- Make sure PostgreSQL is running on your system')
console.log('- Update your DATABASE_URL in .env.local with your PostgreSQL credentials')
console.log('\n🚀 To initialize the database:')
console.log('   npm run init-db')
console.log('\n🚀 To start the application:')
console.log('   npm run dev')
console.log('\n🌐 Then open: http://localhost:3000')
console.log('\n💡 PostgreSQL Setup Help:')
console.log('- Install PostgreSQL: https://www.postgresql.org/download/')
console.log('- Create database: CREATE DATABASE vola_db;')
console.log('- Update .env.local with your credentials')