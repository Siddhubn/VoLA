-- Supabase Database Setup Script
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ============================================
-- 1. Enable pgvector extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- 2. Create users table
-- ============================================
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

-- ============================================
-- 3. Create quiz_history table
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course VARCHAR(50) NOT NULL,
  module VARCHAR(100) NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  time_spent INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  answers JSONB,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- 4. Create knowledge_base table (for RAG)
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_base (
  id SERIAL PRIMARY KEY,
  course VARCHAR(50) NOT NULL,
  module VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(384),  -- 384 dimensions for sentence-transformers/all-MiniLM-L6-v2
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. Create indexes for performance
-- ============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_course ON users(course);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Quiz history indexes
CREATE INDEX IF NOT EXISTS idx_quiz_history_user_id ON quiz_history(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_history_course ON quiz_history(course);
CREATE INDEX IF NOT EXISTS idx_quiz_history_module ON quiz_history(module);
CREATE INDEX IF NOT EXISTS idx_quiz_history_completed_at ON quiz_history(completed_at);
CREATE INDEX IF NOT EXISTS idx_quiz_history_percentage ON quiz_history(percentage);

-- Knowledge base indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_base_course ON knowledge_base(course);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_module ON knowledge_base(module);

-- Vector similarity search index (HNSW for fast approximate nearest neighbor search)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================
-- 6. Create triggers for updated_at
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for knowledge_base table
DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. Create vector search function
-- ============================================

-- Function for semantic search using cosine similarity
CREATE OR REPLACE FUNCTION search_knowledge_base(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  filter_course text DEFAULT NULL,
  filter_module text DEFAULT NULL
)
RETURNS TABLE (
  id int,
  course text,
  module text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.course::text,
    kb.module::text,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM knowledge_base kb
  WHERE 
    (filter_course IS NULL OR kb.course = filter_course)
    AND (filter_module IS NULL OR kb.module = filter_module)
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- 8. Insert default admin user
-- ============================================

-- Check if admin exists, if not create one
-- Password: Admin@1234 (hashed with bcrypt)
INSERT INTO users (name, email, password, role, is_active)
VALUES (
  'Admin',
  'admin@vola.com',
  '$2a$10$YourHashedPasswordHere',  -- You'll need to hash this properly
  'admin',
  true
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 9. Grant necessary permissions (if needed)
-- ============================================

-- Supabase handles most permissions automatically
-- But you can add custom RLS policies here if needed

-- ============================================
-- Setup Complete!
-- ============================================

-- Verify setup
SELECT 'pgvector extension' as component, 
       CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
       THEN '✅ Enabled' ELSE '❌ Not enabled' END as status
UNION ALL
SELECT 'users table', 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
       THEN '✅ Created' ELSE '❌ Not created' END
UNION ALL
SELECT 'quiz_history table', 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_history') 
       THEN '✅ Created' ELSE '❌ Not created' END
UNION ALL
SELECT 'knowledge_base table', 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_base') 
       THEN '✅ Created' ELSE '❌ Not created' END;
