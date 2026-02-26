#!/usr/bin/env node

const { Pool } = require('pg')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const DATABASE_URL = process.env.DATABASE_URL

console.log('🔍 RAG Knowledge Base Database Initializer\n')

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local')
  process.exit(1)
}

async function testConnection(pool) {
  try {
    console.log('🔄 Testing PostgreSQL connection...')
    const client = await pool.connect()
    const result = await client.query('SELECT NOW() as current_time, version() as version')
    console.log('✅ Connected to PostgreSQL successfully!')
    console.log(`📅 Server time: ${result.rows[0].current_time}`)
    console.log(`🐘 PostgreSQL version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`)
    client.release()
    return true
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    return false
  }
}

async function enablePgVector(pool) {
  try {
    console.log('\n🔄 Enabling pgvector extension...')
    
    // Check if pgvector is already installed
    const checkExtension = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `)
    
    if (checkExtension.rows.length > 0) {
      console.log('✅ pgvector extension already enabled')
      return true
    }
    
    // Try to create the extension
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector')
      console.log('✅ pgvector extension enabled successfully')
      
      // Verify installation
      const verify = await pool.query(`
        SELECT * FROM pg_extension WHERE extname = 'vector'
      `)
      
      if (verify.rows.length === 0) {
        throw new Error('pgvector extension not found after installation')
      }
      
      return true
    } catch (createError) {
      // If creation fails, check if it's because the extension is not available
      if (createError.message.includes('not available') || createError.message.includes('could not open extension control file')) {
        console.log('\n⚠️  pgvector is not installed on your PostgreSQL server.')
        console.log('The database schema will be created without vector support.')
        console.log('\n📋 To enable full RAG functionality, install pgvector:')
        console.log('- macOS: brew install pgvector')
        console.log('- Ubuntu: sudo apt install postgresql-17-pgvector')
        console.log('- Windows: Download from https://github.com/pgvector/pgvector/releases')
        console.log('\nAfter installation, restart PostgreSQL and run this script again.')
        console.log('\n⚠️  Continuing without pgvector - vector operations will not work!')
        return false
      } else {
        // Some other error occurred
        throw createError
      }
    }
  } catch (error) {
    console.error('❌ Error enabling pgvector:', error.message)
    return false
  }
}

async function createRagTables(pool) {
  try {
    console.log('\n🔄 Creating RAG database tables...')
    
    // Check if pgvector is available
    const vectorCheck = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `)
    const hasVector = vectorCheck.rows.length > 0
    
    // 1. Create pdf_documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pdf_documents (
        id SERIAL PRIMARY KEY,
        course VARCHAR(50) NOT NULL CHECK (course IN ('fitter', 'electrician')),
        filename VARCHAR(255) NOT NULL UNIQUE,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT,
        total_pages INTEGER,
        total_chunks INTEGER DEFAULT 0,
        processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
        processing_started_at TIMESTAMP WITH TIME ZONE,
        processing_completed_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ pdf_documents table created')
    
    // 2. Create module_mapping table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS module_mapping (
        id SERIAL PRIMARY KEY,
        course VARCHAR(50) NOT NULL CHECK (course IN ('fitter', 'electrician')),
        module_id VARCHAR(100) NOT NULL,
        module_name VARCHAR(255) NOT NULL,
        keywords TEXT[] DEFAULT '{}',
        description TEXT,
        display_order INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(course, module_id)
      )
    `)
    console.log('✅ module_mapping table created')
    
    // 3. Create knowledge_chunks table with or without vector column
    if (hasVector) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id SERIAL PRIMARY KEY,
          course VARCHAR(50) NOT NULL CHECK (course IN ('fitter', 'electrician')),
          pdf_source VARCHAR(255) NOT NULL,
          module VARCHAR(100),
          section VARCHAR(255),
          page_number INTEGER,
          chunk_index INTEGER NOT NULL,
          content TEXT NOT NULL,
          content_preview TEXT,
          embedding vector(768),
          token_count INTEGER,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pdf_source) REFERENCES pdf_documents(filename) ON DELETE CASCADE
        )
      `)
      console.log('✅ knowledge_chunks table created (with vector support)')
    } else {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id SERIAL PRIMARY KEY,
          course VARCHAR(50) NOT NULL CHECK (course IN ('fitter', 'electrician')),
          pdf_source VARCHAR(255) NOT NULL,
          module VARCHAR(100),
          section VARCHAR(255),
          page_number INTEGER,
          chunk_index INTEGER NOT NULL,
          content TEXT NOT NULL,
          content_preview TEXT,
          embedding_placeholder TEXT,
          token_count INTEGER,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pdf_source) REFERENCES pdf_documents(filename) ON DELETE CASCADE
        )
      `)
      console.log('⚠️  knowledge_chunks table created (without vector support - install pgvector for full functionality)')
    }
    
    // 4. Create chat_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course VARCHAR(50) CHECK (course IN ('fitter', 'electrician')),
        session_id UUID NOT NULL,
        message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'assistant')),
        message TEXT NOT NULL,
        sources JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ chat_history table created')
    
    return true
  } catch (error) {
    console.error('❌ Error creating tables:', error.message)
    return false
  }
}

async function createIndexes(pool) {
  try {
    console.log('\n🔄 Creating indexes for performance...')
    
    // Check if pgvector is available
    const vectorCheck = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `)
    const hasVector = vectorCheck.rows.length > 0
    
    const indexes = [
      // pdf_documents indexes
      'CREATE INDEX IF NOT EXISTS idx_pdf_course ON pdf_documents(course)',
      'CREATE INDEX IF NOT EXISTS idx_pdf_status ON pdf_documents(processing_status)',
      
      // module_mapping indexes
      'CREATE INDEX IF NOT EXISTS idx_module_course ON module_mapping(course)',
      'CREATE INDEX IF NOT EXISTS idx_module_course_id ON module_mapping(course, module_id)',
      
      // knowledge_chunks indexes
      'CREATE INDEX IF NOT EXISTS idx_chunks_course ON knowledge_chunks(course)',
      'CREATE INDEX IF NOT EXISTS idx_chunks_module ON knowledge_chunks(module)',
      'CREATE INDEX IF NOT EXISTS idx_chunks_course_module ON knowledge_chunks(course, module)',
      'CREATE INDEX IF NOT EXISTS idx_chunks_pdf_source ON knowledge_chunks(pdf_source)',
      
      // chat_history indexes
      'CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_chat_course ON chat_history(course)'
    ]
    
    for (const indexQuery of indexes) {
      await pool.query(indexQuery)
    }
    console.log('✅ Standard indexes created')
    
    // Create vector similarity index (IVFFlat) only if pgvector is available
    if (hasVector) {
      console.log('🔄 Creating vector similarity index (this may take a moment)...')
      
      // Check if we have any embeddings first
      const countResult = await pool.query('SELECT COUNT(*) as count FROM knowledge_chunks WHERE embedding IS NOT NULL')
      const embeddingCount = parseInt(countResult.rows[0].count)
      
      if (embeddingCount > 0) {
        // Only create IVFFlat index if we have data
        // lists parameter should be roughly sqrt(row_count)
        const lists = Math.max(10, Math.floor(Math.sqrt(embeddingCount)))
        
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
          ON knowledge_chunks 
          USING ivfflat (embedding vector_cosine_ops) 
          WITH (lists = ${lists})
        `)
        console.log(`✅ Vector similarity index created with ${lists} lists`)
      } else {
        console.log('⚠️  No embeddings found - vector index will be created after processing PDFs')
        console.log('   Run this script again after processing PDFs to create the vector index')
      }
    } else {
      console.log('⚠️  Skipping vector index creation (pgvector not installed)')
    }
    
    return true
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message)
    return false
  }
}

async function createTriggers(pool) {
  try {
    console.log('\n🔄 Creating triggers...')
    
    // Create updated_at trigger function if it doesn't exist
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `)
    
    // Add triggers for tables with updated_at
    const triggers = [
      {
        table: 'pdf_documents',
        trigger: 'update_pdf_documents_updated_at'
      },
      {
        table: 'knowledge_chunks',
        trigger: 'update_knowledge_chunks_updated_at'
      }
    ]
    
    for (const { table, trigger } of triggers) {
      await pool.query(`
        DROP TRIGGER IF EXISTS ${trigger} ON ${table};
        CREATE TRIGGER ${trigger}
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `)
    }
    
    console.log('✅ Triggers created')
    return true
  } catch (error) {
    console.error('❌ Error creating triggers:', error.message)
    return false
  }
}

async function seedModuleMappings(pool) {
  try {
    console.log('\n🔄 Seeding module mappings...')
    
    // Check if we already have module mappings
    const existing = await pool.query('SELECT COUNT(*) as count FROM module_mapping')
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('✅ Module mappings already exist')
      return true
    }
    
    // Seed data for Fitter course
    const fitterModules = [
      {
        course: 'fitter',
        module_id: 'safety',
        module_name: 'Safety and First Aid',
        keywords: ['safety', 'first aid', 'ppe', 'hazard', 'accident'],
        description: 'Workshop safety, personal protective equipment, and first aid procedures',
        display_order: 1
      },
      {
        course: 'fitter',
        module_id: 'tools',
        module_name: 'Hand Tools and Measuring Instruments',
        keywords: ['tools', 'measuring', 'instruments', 'vernier', 'micrometer'],
        description: 'Hand tools, measuring instruments, and their proper usage',
        display_order: 2
      },
      {
        course: 'fitter',
        module_id: 'fitting',
        module_name: 'Fitting Operations',
        keywords: ['fitting', 'filing', 'sawing', 'drilling', 'tapping'],
        description: 'Basic fitting operations including filing, sawing, drilling, and threading',
        display_order: 3
      }
    ]
    
    // Seed data for Electrician course
    const electricianModules = [
      {
        course: 'electrician',
        module_id: 'safety',
        module_name: 'Electrical Safety',
        keywords: ['safety', 'electrical', 'shock', 'earthing', 'protection'],
        description: 'Electrical safety practices, shock prevention, and protective measures',
        display_order: 1
      },
      {
        course: 'electrician',
        module_id: 'basics',
        module_name: 'Electrical Fundamentals',
        keywords: ['voltage', 'current', 'resistance', 'ohm', 'circuit'],
        description: 'Basic electrical concepts, Ohms law, and circuit theory',
        display_order: 2
      },
      {
        course: 'electrician',
        module_id: 'wiring',
        module_name: 'Electrical Wiring',
        keywords: ['wiring', 'installation', 'conduit', 'cable', 'connection'],
        description: 'Electrical wiring methods, installation practices, and connections',
        display_order: 3
      }
    ]
    
    const allModules = [...fitterModules, ...electricianModules]
    
    for (const module of allModules) {
      await pool.query(`
        INSERT INTO module_mapping (course, module_id, module_name, keywords, description, display_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (course, module_id) DO NOTHING
      `, [
        module.course,
        module.module_id,
        module.module_name,
        module.keywords,
        module.description,
        module.display_order
      ])
    }
    
    console.log(`✅ Seeded ${allModules.length} module mappings`)
    return true
  } catch (error) {
    console.error('❌ Error seeding module mappings:', error.message)
    return false
  }
}

async function verifySetup(pool) {
  try {
    console.log('\n📊 Verifying database setup...')
    
    // Check pgvector
    const vectorCheck = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `)
    console.log(`✅ pgvector extension: ${vectorCheck.rows.length > 0 ? 'enabled' : 'not found'}`)
    
    // Check tables
    const tables = ['pdf_documents', 'module_mapping', 'knowledge_chunks', 'chat_history']
    for (const table of tables) {
      const result = await pool.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [table])
      
      if (parseInt(result.rows[0].count) > 0) {
        const rowCount = await pool.query(`SELECT COUNT(*) as count FROM ${table}`)
        console.log(`✅ ${table}: ${rowCount.rows[0].count} rows`)
      } else {
        console.log(`❌ ${table}: not found`)
      }
    }
    
    // Check indexes
    const indexCount = await pool.query(`
      SELECT COUNT(*) as count FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('pdf_documents', 'module_mapping', 'knowledge_chunks', 'chat_history')
    `)
    console.log(`✅ Indexes created: ${indexCount.rows[0].count}`)
    
    return true
  } catch (error) {
    console.error('❌ Error verifying setup:', error.message)
    return false
  }
}

async function initializeRagDatabase() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })

  try {
    // Test connection
    const connected = await testConnection(pool)
    if (!connected) {
      throw new Error('Failed to connect to database')
    }

    // Enable pgvector (optional - will continue without it)
    const vectorEnabled = await enablePgVector(pool)
    // Note: vectorEnabled may be false, but we continue anyway

    // Create tables
    const tablesCreated = await createRagTables(pool)
    if (!tablesCreated) {
      throw new Error('Failed to create tables')
    }

    // Create indexes
    const indexesCreated = await createIndexes(pool)
    if (!indexesCreated) {
      throw new Error('Failed to create indexes')
    }

    // Create triggers
    const triggersCreated = await createTriggers(pool)
    if (!triggersCreated) {
      throw new Error('Failed to create triggers')
    }

    // Seed module mappings
    const seeded = await seedModuleMappings(pool)
    if (!seeded) {
      throw new Error('Failed to seed module mappings')
    }

    // Verify setup
    await verifySetup(pool)

    console.log('\n🎉 RAG Knowledge Base database initialized successfully!')
    console.log('\n📋 Next steps:')
    console.log('1. Place PDF files in fitter/ and electrician/ folders')
    console.log('2. Run the PDF processing pipeline to extract and embed content')
    console.log('3. Test semantic search and RAG features')

  } catch (error) {
    console.error('\n❌ RAG database initialization failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
    console.log('\n🔌 Database connection closed')
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message)
  process.exit(1)
})

initializeRagDatabase()
