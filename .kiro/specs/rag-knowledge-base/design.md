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

#### 1. `knowledge_chunks` Table (Enhanced)
Stores processed content chunks with embeddings and classification.

```sql
CREATE TABLE knowledge_chunks (
  id SERIAL PRIMARY KEY,
  trade VARCHAR(50) NOT NULL,               -- 'electrician' (expanded from course)
  trade_type VARCHAR(10) NOT NULL,          -- 'TT' (Trade Theory) or 'TP' (Trade Practical)
  pdf_source VARCHAR(255) NOT NULL,         -- Source PDF filename
  module_id VARCHAR(100),                   -- Module identifier (e.g., 'module-1')
  module_name VARCHAR(255),                 -- Module display name
  module_number INTEGER,                    -- Module sequence number
  section_title VARCHAR(255),               -- Section/topic name
  page_number INTEGER,                      -- Page number in PDF
  chunk_index INTEGER NOT NULL,             -- Sequential chunk number within document
  content TEXT NOT NULL,                    -- Original text content
  content_preview TEXT,                     -- First 200 chars for display
  content_type VARCHAR(50) NOT NULL,        -- 'theory', 'safety', 'practical', 'tools', 'definition'
  priority INTEGER DEFAULT 5,               -- Content priority (1-10, higher = more important)
  topic_keywords TEXT[],                    -- Extracted topic keywords
  word_count INTEGER,                       -- Number of words in chunk
  embedding vector(384),                    -- Embedding vector (384 dimensions)
  similarity_threshold FLOAT DEFAULT 0.7,   -- Minimum similarity for relevance
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced indexes for performance
CREATE INDEX idx_chunks_trade ON knowledge_chunks(trade);
CREATE INDEX idx_chunks_trade_type ON knowledge_chunks(trade_type);
CREATE INDEX idx_chunks_module ON knowledge_chunks(module_id);
CREATE INDEX idx_chunks_content_type ON knowledge_chunks(content_type);
CREATE INDEX idx_chunks_priority ON knowledge_chunks(priority);
CREATE INDEX idx_chunks_trade_module ON knowledge_chunks(trade, module_id);
CREATE INDEX idx_chunks_type_priority ON knowledge_chunks(content_type, priority);
CREATE INDEX idx_chunks_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_chunks_keywords ON knowledge_chunks USING gin(topic_keywords);
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

### 5. RAG Helper Service

**Location:** `lib/rag-helper.ts`

```typescript
interface RAGChunk {
  content: string;
  module_name: string;
  module_number: number;
  content_type: string;
  section_title: string | null;
  priority: number;
  distance: number;
  trade_type: string;
  topic_keywords: string[];
}

interface SearchOptions {
  trade?: string;
  tradeType?: 'TT' | 'TP';
  moduleId?: string;
  contentType?: string;
  limit?: number;
  maxDistance?: number;
  minPriority?: number;
}

class RAGHelper {
  async searchKnowledgeBase(embedding: number[], options: SearchOptions): Promise<RAGChunk[]>;
  async getModuleContent(moduleId: string, tradeType: 'TT' | 'TP'): Promise<RAGChunk[]>;
  async getSafetyContent(tradeType?: 'TT' | 'TP'): Promise<RAGChunk[]>;
  async contextualSearch(query: string, embedding: number[], context: UserContext): Promise<RAGChunk[]>;
  async getRelatedContent(keywords: string[], options: RelatedOptions): Promise<RAGChunk[]>;
  async generateEmbedding(text: string): Promise<number[]>;
}
```

### 6. Quiz Helper Service

**Location:** `lib/quiz-helper.ts`

```typescript
interface QuizContent {
  content: string;
  module_name: string;
  module_number: number;
  section_title: string | null;
  content_type: string;
  priority: number;
  topic_keywords: string[];
  trade_type: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  module: string;
  contentType: string;
  section?: string;
}

class QuizHelper {
  async getQuizContent(moduleId: string, tradeType: 'TT' | 'TP', count: number): Promise<QuizContent[]>;
  async getMixedQuizContent(moduleId: string, tradeType: 'TT' | 'TP', total: number): Promise<{content: QuizContent[], distribution: Record<string, number>}>;
  async getSafetyQuestions(tradeType: 'TT' | 'TP', count: number): Promise<QuizContent[]>;
  async getToolsQuestions(moduleId: string, tradeType: 'TT' | 'TP', count: number): Promise<QuizContent[]>;
  async generateQuestionsFromContent(content: QuizContent[]): Promise<QuizQuestion[]>;
  calculateQuizDifficulty(content: QuizContent[]): 'easy' | 'medium' | 'hard';
  estimateQuizTime(questionCount: number, difficulty: string): number;
}
```

## API Endpoints

### 1. Enhanced Quiz Generation with Content Classification

**Endpoint:** `POST /api/quiz/generate`

```typescript
// Request
{
  moduleId: string,
  tradeType: 'TT' | 'TP',
  questionCount?: number,        // Default: 10
  difficulty?: string,           // Auto-calculated if not provided
  focusArea?: string            // Optional focus area
}

// Response
{
  success: boolean,
  quiz: {
    id: string,
    moduleId: string,
    moduleName: string,
    tradeType: 'TT' | 'TP',
    difficulty: 'easy' | 'medium' | 'hard',
    questionCount: number,
    questions: QuizQuestion[],
    timeLimit: number,           // Estimated time in seconds
    metadata: QuizMetadata,
    createdAt: string
  }
}

interface QuizMetadata {
  moduleId: string;
  tradeType: 'TT' | 'TP';
  totalQuestions: number;
  contentTypes: Record<string, number>;  // Distribution by type
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
}
```

### 2. Context-Aware Chat API

**Endpoint:** `POST /api/chat`

```typescript
// Request
{
  message: string,
  context?: {
    currentModule?: string,
    tradeType?: 'TT' | 'TP',
    userLevel?: 'beginner' | 'intermediate' | 'advanced',
    focusArea?: 'theory' | 'practical' | 'safety' | 'tools'
  },
  history?: ChatMessage[]
}

// Response
{
  response: string,
  sources: {
    module: string,
    moduleNumber: number,
    type: string,
    section: string,
    priority: number,
    tradeType: string
  }[],
  metadata: {
    chunksUsed: number,
    context: any,
    responseTime: number
  }
}
```

### 3. Enhanced Semantic Search

**Endpoint:** `POST /api/rag/search`

```typescript
// Request
{
  query: string,
  trade?: string,              // Default: 'electrician'
  tradeType?: 'TT' | 'TP',
  moduleId?: string,
  contentType?: string,
  limit?: number,              // Default: 5
  maxDistance?: number,        // Default: 0.5
  minPriority?: number         // Default: 1
}

// Response
{
  success: boolean,
  results: RAGChunk[],
  totalFound: number,
  metadata: {
    searchTime: number,
    avgSimilarity: number
  }
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
