# Design Document - RAG Knowledge Base System

## Overview

This document outlines the technical design for a Retrieval-Augmented Generation (RAG) system that processes ITI course PDFs to create a searchable knowledge base. The system uses Gemini API for embeddings and text generation, PostgreSQL with pgvector for vector storage, and provides APIs for quiz generation, syllabus exploration, and an AI chatbot.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│  (Quiz Interface, Chatbot UI, Syllabus Explorer)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Quiz Gen API │  │ Search API   │  │ Chatbot API  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    RAG Service Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Vector Search│  │ Embedding    │  │ Content      │     │
│  │ Service      │  │ Service      │  │ Retrieval    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐
│  PostgreSQL +    │    │   Gemini API     │
│  pgvector        │    │  (Embeddings +   │
│  (Vector DB)     │    │   Generation)    │
└──────────────────┘    └──────────────────┘
        ▲
        │
┌──────────────────┐
│  PDF Processing  │
│  Pipeline        │
│  (Batch/Offline) │
└──────────────────┘
```

### Component Breakdown

1. **PDF Processing Pipeline** (Offline/Batch)
   - PDF Parser
   - Content Cleaner
   - Chunking Engine
   - Embedding Generator
   - Database Loader

2. **RAG Service Layer** (Runtime)
   - Vector Search Service
   - Embedding Service
   - Content Retrieval Service
   - Context Builder

3. **API Layer** (Next.js Routes)
   - Quiz Generation API
   - Semantic Search API
   - Chatbot API
   - Syllabus Explorer API

## Data Models

### Database Schema

#### 1. `knowledge_chunks` Table
Stores processed content chunks with embeddings.

```sql
CREATE TABLE knowledge_chunks (
  id SERIAL PRIMARY KEY,
  course VARCHAR(50) NOT NULL,           -- 'fitter' or 'electrician'
  pdf_source VARCHAR(255) NOT NULL,      -- Source PDF filename
  module VARCHAR(100),                    -- Module/chapter name
  section VARCHAR(255),                   -- Section/topic name
  page_number INTEGER,                    -- Page number in PDF
  chunk_index INTEGER NOT NULL,           -- Sequential chunk number
  content TEXT NOT NULL,                  -- Original text content
  content_preview TEXT,                   -- First 200 chars for display
  embedding vector(768),                  -- Gemini embedding (768 dimensions)
  token_count INTEGER,                    -- Number of tokens in chunk
  metadata JSONB,                         -- Additional metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_chunks_course ON knowledge_chunks(course);
CREATE INDEX idx_chunks_module ON knowledge_chunks(module);
CREATE INDEX idx_chunks_course_module ON knowledge_chunks(course, module);
CREATE INDEX idx_chunks_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops);
```

#### 2. `pdf_documents` Table
Tracks processed PDFs and their status.

```sql
CREATE TABLE pdf_documents (
  id SERIAL PRIMARY KEY,
  course VARCHAR(50) NOT NULL,
  filename VARCHAR(255) NOT NULL UNIQUE,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  total_pages INTEGER,
  total_chunks INTEGER,
  processing_status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
  processing_started_at TIMESTAMP,
  processing_completed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `module_mapping` Table
Maps detected content to predefined modules.

```sql
CREATE TABLE module_mapping (
  id SERIAL PRIMARY KEY,
  course VARCHAR(50) NOT NULL,
  module_id VARCHAR(100) NOT NULL,       -- e.g., 'safety-signs'
  module_name VARCHAR(255) NOT NULL,     -- e.g., 'Safety Signs'
  keywords TEXT[],                        -- Keywords for matching
  description TEXT,
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course, module_id)
);
```

#### 4. `chat_history` Table
Stores chatbot conversation history.

```sql
CREATE TABLE chat_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  course VARCHAR(50),
  session_id UUID NOT NULL,
  message_type VARCHAR(20) NOT NULL,     -- 'user' or 'assistant'
  message TEXT NOT NULL,
  sources JSONB,                          -- Referenced chunks
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_session ON chat_history(session_id, created_at);
CREATE INDEX idx_chat_user ON chat_history(user_id, created_at);
```

## Components and Interfaces

### 1. PDF Processing Service

**Location:** `lib/rag/pdf-processor.ts`

```typescript
interface PDFProcessorConfig {
  chunkSize: number;          // Target tokens per chunk (default: 750)
  chunkOverlap: number;       // Overlap tokens (default: 100)
  excludePatterns: string[];  // Patterns to exclude (bibliography, etc.)
}

interface ProcessedChunk {
  content: string;
  module: string | null;
  section: string | null;
  pageNumber: number;
  chunkIndex: number;
  tokenCount: number;
  metadata: Record<string, any>;
}

class PDFProcessor {
  async extractText(pdfPath: string): Promise<string>;
  async detectModules(text: string, course: string): Promise<ModuleInfo[]>;
  async chunkContent(text: string, config: PDFProcessorConfig): Promise<ProcessedChunk[]>;
  async filterContent(text: string): Promise<string>;
}
```

### 2. Embedding Service

**Location:** `lib/rag/embedding-service.ts`

```typescript
interface EmbeddingConfig {
  model: string;              // 'text-embedding-004'
  batchSize: number;          // Batch size for API calls
  retryAttempts: number;
}

class EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]>;
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
  async embedQuery(query: string): Promise<number[]>;
}
```

### 3. Vector Search Service

**Location:** `lib/rag/vector-search.ts`

```typescript
interface SearchQuery {
  query: string;
  course?: string;
  module?: string;
  topK?: number;              // Number of results (default: 5)
  minSimilarity?: number;     // Minimum similarity score (default: 0.7)
}

interface SearchResult {
  chunkId: number;
  content: string;
  similarity: number;
  source: {
    course: string;
    module: string;
    section: string;
    pageNumber: number;
    pdfSource: string;
  };
}

class VectorSearchService {
  async search(query: SearchQuery): Promise<SearchResult[]>;
  async searchByEmbedding(embedding: number[], filters: any): Promise<SearchResult[]>;
}
```

### 4. RAG Context Builder

**Location:** `lib/rag/context-builder.ts`

```typescript
interface RAGContext {
  query: string;
  retrievedChunks: SearchResult[];
  systemPrompt: string;
  contextWindow: string;
}

class ContextBuilder {
  async buildQuizContext(module: string, course: string): Promise<RAGContext>;
  async buildChatContext(question: string, course: string, history?: ChatMessage[]): Promise<RAGContext>;
  async buildSyllabusContext(module: string, course: string): Promise<RAGContext>;
}
```

## API Endpoints

### 1. RAG-Enhanced Quiz Generation

**Endpoint:** `POST /api/quiz/generate-rag`

```typescript
// Request
{
  course: 'fitter' | 'electrician',
  module: string,
  numQuestions: number,
  difficulty: 'easy' | 'medium' | 'hard'
}

// Response
{
  success: boolean,
  questions: QuizQuestion[],
  sources: {
    chunkIds: number[],
    pageReferences: string[]
  },
  metadata: {
    retrievedChunks: number,
    avgSimilarity: number
  }
}
```

### 2. Semantic Search

**Endpoint:** `POST /api/rag/search`

```typescript
// Request
{
  query: string,
  course?: string,
  module?: string,
  topK?: number
}

// Response
{
  success: boolean,
  results: SearchResult[],
  totalFound: number
}
```

### 3. AI Chatbot

**Endpoint:** `POST /api/rag/chat`

```typescript
// Request
{
  message: string,
  course: string,
  sessionId?: string,
  history?: ChatMessage[]
}

// Response
{
  success: boolean,
  response: string,
  sources: {
    chunks: SearchResult[],
    citations: string[]
  },
  sessionId: string
}
```

### 4. Syllabus Explorer

**Endpoint:** `GET /api/rag/syllabus/:course/:module?`

```typescript
// Response
{
  success: boolean,
  course: string,
  modules: {
    id: string,
    name: string,
    topics: string[],
    chunkCount: number,
    pageRange: string
  }[]
}
```

## PDF Processing Pipeline

### Workflow

```
1. PDF Upload/Detection
   ↓
2. Text Extraction (pdf-parse)
   ↓
3. Content Filtering
   - Remove headers/footers
   - Exclude bibliography
   - Filter page numbers
   ↓
4. Module Detection
   - Pattern matching
   - Heading analysis
   ↓
5. Content Chunking
   - Split into 750-token chunks
   - 100-token overlap
   - Preserve sentences
   ↓
6. Embedding Generation
   - Batch process chunks
   - Call Gemini API
   - Rate limiting
   ↓
7. Database Storage
   - Store chunks + embeddings
   - Update metadata
   - Create indexes
   ↓
8. Verification
   - Test search queries
   - Validate embeddings
```

### Content Filtering Rules

```typescript
const EXCLUDE_PATTERNS = [
  /^bibliography$/i,
  /^references$/i,
  /^index$/i,
  /^table of contents$/i,
  /^acknowledgments?$/i,
  /^appendix [a-z]/i,
  /^page \d+$/,
  /^\d+$/,  // Page numbers alone
];

const HEADER_FOOTER_PATTERNS = [
  /^NSQF Level \d+$/,
  /^ITI - \w+$/,
  /^Fitter|Electrician$/,
];
```

## Error Handling

### Retry Strategy

```typescript
interface RetryConfig {
  maxAttempts: number;        // Default: 3
  initialDelay: number;       // Default: 1000ms
  maxDelay: number;           // Default: 10000ms
  backoffMultiplier: number;  // Default: 2
}

// Exponential backoff for API calls
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  // Implementation
}
```

### Error Types

1. **PDF Processing Errors**
   - Corrupt PDF
   - Unsupported format
   - Extraction failure

2. **API Errors**
   - Rate limit exceeded
   - Invalid API key
   - Network timeout

3. **Database Errors**
   - Connection failure
   - Constraint violation
   - Query timeout

## Testing Strategy

### Unit Tests

1. **PDF Processing**
   - Test text extraction
   - Test content filtering
   - Test chunking logic

2. **Embedding Service**
   - Test API integration
   - Test batch processing
   - Test error handling

3. **Vector Search**
   - Test similarity search
   - Test filtering
   - Test ranking

### Integration Tests

1. **End-to-End Pipeline**
   - Process sample PDF
   - Generate embeddings
   - Perform search
   - Validate results

2. **API Tests**
   - Test quiz generation with RAG
   - Test chatbot responses
   - Test syllabus retrieval

### Property-Based Tests

**Property 1: Chunk Overlap Consistency**
*For any* document, when chunked with overlap, consecutive chunks should share content at boundaries
**Validates: Requirements 2.1, 2.2**

**Property 2: Embedding Determinism**
*For any* text input, generating embeddings multiple times should produce identical results
**Validates: Requirements 3.1, 3.3**

**Property 3: Search Relevance**
*For any* search query, results should be ordered by decreasing similarity score
**Validates: Requirements 5.2, 5.3**

**Property 4: Module Filtering**
*For any* module-specific search, all results should belong to that module
**Validates: Requirements 5.5, 12.4**

**Property 5: Content Preservation**
*For any* chunk stored in database, retrieving it should return identical content
**Validates: Requirements 4.3**

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**
   - Process embeddings in batches of 100
   - Use connection pooling for database
   - Parallel processing where possible

2. **Caching**
   - Cache frequently accessed chunks
   - Cache module mappings
   - Cache embedding results

3. **Indexing**
   - IVFFlat index for vector search
   - B-tree indexes for filters
   - Composite indexes for common queries

4. **Query Optimization**
   - Limit result sets
   - Use prepared statements
   - Optimize vector search parameters

### Expected Performance

- **PDF Processing:** 2-5 minutes per PDF
- **Embedding Generation:** 100 chunks/minute
- **Vector Search:** <200ms per query
- **Quiz Generation:** <3 seconds
- **Chatbot Response:** <2 seconds

## Security Considerations

1. **API Key Management**
   - Store in environment variables
   - Separate keys for different services
   - Rotate keys periodically

2. **Input Validation**
   - Sanitize all user inputs
   - Validate file uploads
   - Limit query lengths

3. **Access Control**
   - Authenticate API requests
   - Rate limit per user
   - Log all access

4. **Data Privacy**
   - No PII in embeddings
   - Secure chat history
   - GDPR compliance

## Deployment Strategy

### Phase 1: Initial Setup
1. Install pgvector extension
2. Create database schema
3. Set up environment variables

### Phase 2: PDF Processing
1. Process Fitter PDFs
2. Process Electrician PDFs
3. Verify embeddings

### Phase 3: API Deployment
1. Deploy search API
2. Deploy quiz generation
3. Deploy chatbot

### Phase 4: Testing & Optimization
1. Load testing
2. Performance tuning
3. User acceptance testing

## Monitoring and Maintenance

### Metrics to Track

1. **Processing Metrics**
   - PDFs processed
   - Chunks created
   - Embeddings generated
   - Processing time

2. **API Metrics**
   - Request count
   - Response time
   - Error rate
   - API costs

3. **Search Metrics**
   - Query count
   - Average similarity
   - Result relevance
   - User feedback

### Maintenance Tasks

1. **Regular Updates**
   - Re-process updated PDFs
   - Refresh embeddings
   - Update module mappings

2. **Performance Monitoring**
   - Query performance
   - Database size
   - API usage

3. **Quality Assurance**
   - Review search results
   - Validate quiz quality
   - Monitor chatbot accuracy

---

**Document Version:** 1.0  
**Last Updated:** February 24, 2026  
**Status:** Ready for Implementation
