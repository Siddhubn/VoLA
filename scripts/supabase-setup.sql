-- ============================================
-- Supabase Database Setup Script
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
  course VARCHAR(50) CHECK (course IN ('fitter', 'electrician')),
  avatar TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE,
  bio TEXT DEFAULT '',
  skills TEXT[] DEFAULT '{}',
  learning_goals TEXT[] DEFAULT '{}',
  completed_courses INTEGER DEFAULT 0,
  total_study_time INTEGER DEFAULT 0
);

-- 3. Create pdf_documents table
CREATE TABLE IF NOT EXISTS pdf_documents (
  id SERIAL PRIMARY KEY,
  course VARCHAR(50) NOT NULL,
  filename VARCHAR(255) NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  total_pages INTEGER,
  total_chunks INTEGER,
  processing_status VARCHAR(20) DEFAULT 'completed',
  processing_started_at TIMESTAMP,
  processing_completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create module_mapping table
CREATE TABLE IF NOT EXISTS module_mapping (
  id SERIAL PRIMARY KEY,
  course VARCHAR(50) NOT NULL,
  module_id VARCHAR(255) NOT NULL,
  module_name VARCHAR(255) NOT NULL,
  keywords TEXT[],
  description TEXT,
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course, module_id)
);

-- 5. Create knowledge_chunks table with vector support (384 dimensions for BGE embeddings)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id SERIAL PRIMARY KEY,
  course VARCHAR(50) NOT NULL,
  pdf_source VARCHAR(255) NOT NULL,
  module VARCHAR(255),
  module_name VARCHAR(255),
  section TEXT,
  page_number INTEGER,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_preview TEXT,
  embedding vector(384),
  token_count INTEGER,
  trade_type VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  course VARCHAR(50),
  session_id UUID NOT NULL,
  message_type VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  sources JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Create quiz_history table
CREATE TABLE IF NOT EXISTS quiz_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  course VARCHAR(50) NOT NULL,
  module VARCHAR(100) NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  time_spent INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  answers JSONB
);

-- 8. Create indexes for performance

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_course ON users(course);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- PDF documents indexes
CREATE INDEX IF NOT EXISTS idx_pdf_documents_course ON pdf_documents(course);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_filename ON pdf_documents(filename);

-- Module mapping indexes
CREATE INDEX IF NOT EXISTS idx_module_mapping_course ON module_mapping(course);

-- Knowledge chunks indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_course ON knowledge_chunks(course);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_module ON knowledge_chunks(module);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_pdf_source ON knowledge_chunks(pdf_source);

-- Vector similarity search index (HNSW for fast approximate nearest neighbor search)
-- This may take a moment to create
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Chat history indexes
CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id);

-- Quiz history indexes
CREATE INDEX IF NOT EXISTS idx_quiz_history_user ON quiz_history(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_history_course ON quiz_history(course);

-- 9. Verify setup
SELECT 
  'pgvector extension' as component, 
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
  THEN '✅ Enabled' ELSE '❌ Not enabled' END as status
UNION ALL
SELECT 'users table', 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
  THEN '✅ Created' ELSE '❌ Not created' END
UNION ALL
SELECT 'pdf_documents table', 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_documents') 
  THEN '✅ Created' ELSE '❌ Not created' END
UNION ALL
SELECT 'module_mapping table', 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'module_mapping') 
  THEN '✅ Created' ELSE '❌ Not created' END
UNION ALL
SELECT 'knowledge_chunks table', 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_chunks') 
  THEN '✅ Created' ELSE '❌ Not created' END
UNION ALL
SELECT 'chat_history table', 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_history') 
  THEN '✅ Created' ELSE '❌ Not created' END
UNION ALL
SELECT 'quiz_history table', 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_history') 
  THEN '✅ Created' ELSE '❌ Not created' END;
