# ITI Quiz & Learning Platform - Complete Technical Documentation

## 📋 Executive Summary

The ITI (Industrial Training Institute) Quiz & Learning Platform is a comprehensive AI-powered educational system designed for vocational training students in India. The platform combines modern web technologies with advanced AI capabilities to deliver personalized learning experiences through intelligent quizzes, RAG-based chatbot assistance, and structured curriculum management.

**Project Name:** VOLA Stage 1  
**Version:** 0.1.0  
**Technology Stack:** Next.js 16, TypeScript, PostgreSQL, AI/ML (Gemini, Transformers.js)  
**Target Users:** ITI students (Electrician & Fitter trades), Instructors, Administrators  
**Deployment:** Vercel (Production), Local Docker (Development)

---

## 🎯 Core Features & Capabilities

### 1. User Management System
- **Multi-role Authentication**: Student, Instructor, Admin roles with JWT-based authentication
- **Course-specific Registration**: Users select trade (Electrician/Fitter) during registration
- **Profile Management**: Update personal information, track learning progress
- **Secure Password Handling**: bcrypt hashing with salt rounds

### 2. AI-Powered Quiz System
- **Intelligent Quiz Generation**: AI generates contextual questions from course materials
- **Module-based Organization**: Quizzes aligned with ITI curriculum modules
- **Trade Type Support**: Separate content for Trade Theory (TT) and Trade Practical (TP)
- **Adaptive Difficulty**: Dynamic difficulty calculation based on content complexity
- **Performance Tracking**: Comprehensive quiz history with statistics and analytics
- **Balanced Content Distribution**: Ensures diverse question coverage across topics

### 3. RAG (Retrieval-Augmented Generation) System
- **Semantic Search**: Vector-based similarity search using pgvector
- **Local Embeddings**: BGE (BAAI General Embedding) model running offline (384 dimensions)
- **Context-Aware Responses**: AI chatbot with course material grounding
- **Source Citations**: Automatic citation of source materials with page numbers
- **Multi-modal Content**: Supports both text and OCR-extracted content from PDFs
- **Conversation History**: Persistent chat sessions with context retention

### 4. PDF Processing Pipeline
- **Automated Content Extraction**: Processes ITI curriculum PDFs
- **Intelligent Chunking**: Semantic chunking with configurable overlap (750 chars, 100 overlap)
- **Module Detection**: Automatic identification of curriculum modules
- **Trade Type Classification**: Distinguishes between Theory and Practical content
- **OCR Integration**: Tesseract.js for image-based text extraction
- **Batch Processing**: Concurrent processing with rate limiting

### 5. Admin Dashboard
- **User Analytics**: Real-time statistics on registrations and activity
- **Content Management**: Monitor RAG system performance and quality
- **Quiz Analytics**: Track quiz completion rates and scores
- **System Health**: Database connection monitoring and performance metrics
- **Data Export**: CSV export functionality for reporting

### 6. Student Dashboard
- **Progress Tracking**: Visual representation of learning journey
- **Module Explorer**: Browse curriculum with topic-level granularity
- **Quick Actions**: Direct access to quizzes, chatbot, and resources
- **Performance Metrics**: Average scores, study time, completed modules
- **Recent Activity**: Quiz history with detailed breakdowns

---

## 🏗️ System Architecture

### Technology Stack

#### Frontend
- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript 5.6.3
- **UI Library**: React 19.2.4
- **Styling**: Tailwind CSS 3.4.14
- **Icons**: Lucide React 0.460.0
- **Charts**: Recharts 2.13.3
- **Form Handling**: React Hook Form 7.53.2

#### Backend
- **Runtime**: Node.js ≥20.19.0
- **API**: Next.js API Routes (serverless)
- **Database**: PostgreSQL with pgvector extension
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcryptjs 2.4.3

#### AI/ML Components
- **LLM**: Google Gemini 2.5 Flash (via @google/generative-ai 0.21.0)
- **Embeddings**: BGE-small-en-v1.5 (via @xenova/transformers 2.17.2)
- **Vector Database**: PostgreSQL with pgvector
- **PDF Processing**: pdf-parse 2.4.5, pdf-lib 1.17.1
- **OCR**: Tesseract.js 7.0.0
- **Image Processing**: Sharp 0.34.5

#### Testing
- **Framework**: Vitest 1.0.4
- **Property-Based Testing**: fast-check 4.5.3
- **Component Testing**: @testing-library/react 16.3.2
- **DOM Testing**: jsdom 28.1.0

#### DevOps
- **Containerization**: Docker (PostgreSQL with pgvector)
- **Deployment**: Vercel
- **Database Hosting**: Neon (Production), Local Docker (Development)
- **Environment Management**: dotenv 16.4.5

### Database Architecture

#### Core Tables

**1. users**
```sql
- id: SERIAL PRIMARY KEY
- name: VARCHAR(255)
- email: VARCHAR(255) UNIQUE
- password: VARCHAR(255) -- bcrypt hashed
- role: VARCHAR(50) -- 'student', 'instructor', 'admin'
- course: VARCHAR(50) -- 'fitter', 'electrician'
- avatar: TEXT
- is_active: BOOLEAN DEFAULT true
- created_at: TIMESTAMP DEFAULT NOW()
- updated_at: TIMESTAMP DEFAULT NOW()
- last_login: TIMESTAMP
- bio: TEXT
- skills: TEXT[]
- learning_goals: TEXT[]
- completed_courses: INTEGER DEFAULT 0
- total_study_time: INTEGER DEFAULT 0
```

**2. knowledge_chunks** (RAG System)
```sql
- id: SERIAL PRIMARY KEY
- course: VARCHAR(50) -- 'fitter', 'electrician'
- pdf_source: VARCHAR(255)
- module: VARCHAR(255)
- module_name: VARCHAR(255)
- section: VARCHAR(255)
- page_number: INTEGER
- chunk_index: INTEGER
- content: TEXT
- content_preview: TEXT
- embedding: VECTOR(384) -- BGE embeddings
- token_count: INTEGER
- trade_type: VARCHAR(20) -- 'trade_theory', 'trade_practical'
- metadata: JSONB
- created_at: TIMESTAMP DEFAULT NOW()
- updated_at: TIMESTAMP DEFAULT NOW()
```

**3. module_syllabus**
```sql
- id: SERIAL PRIMARY KEY
- course: VARCHAR(50)
- trade_type: VARCHAR(20)
- module_id: VARCHAR(255)
- module_name: VARCHAR(255)
- module_number: INTEGER
- topics: JSONB
- extracted_from: VARCHAR(10) DEFAULT 'index'
- created_at: TIMESTAMP DEFAULT NOW()
- updated_at: TIMESTAMP DEFAULT NOW()
- UNIQUE(course, trade_type, module_id)
```

**4. pdf_documents**
```sql
- id: SERIAL PRIMARY KEY
- course: VARCHAR(50)
- filename: VARCHAR(255)
- file_path: TEXT
- file_size: BIGINT
- total_pages: INTEGER
- total_chunks: INTEGER
- processing_status: VARCHAR(50)
- processing_started_at: TIMESTAMP
- processing_completed_at: TIMESTAMP
- metadata: JSONB
- created_at: TIMESTAMP DEFAULT NOW()
```

**5. quiz_attempts**
```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER REFERENCES users(id)
- course: VARCHAR(50)
- module: VARCHAR(255)
- module_name: VARCHAR(255)
- trade_type: VARCHAR(20)
- total_questions: INTEGER
- correct_answers: INTEGER
- score: DECIMAL(5,2)
- time_spent: INTEGER -- seconds
- completed_at: TIMESTAMP DEFAULT NOW()
- answers: JSONB
- metadata: JSONB
```

**6. chat_history**
```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER REFERENCES users(id)
- course: VARCHAR(50)
- session_id: UUID
- message_type: VARCHAR(20) -- 'user', 'assistant'
- message: TEXT
- sources: JSONB
- created_at: TIMESTAMP DEFAULT NOW()
```

#### Indexes
- `idx_knowledge_chunks_course_module` on (course, module)
- `idx_knowledge_chunks_trade_type` on (trade_type)
- `idx_knowledge_chunks_embedding` using ivfflat (embedding vector_cosine_ops)
- `idx_module_syllabus_course_trade` on (course, trade_type)
- `idx_quiz_attempts_user` on (user_id)
- `idx_chat_history_session` on (session_id)

---

## 🔧 Core System Components

### 1. PDF Processing Pipeline (`lib/rag/pdf-pipeline.ts`)

**Purpose**: Automated extraction and processing of ITI curriculum PDFs into searchable knowledge chunks.

**Key Features**:
- Multi-stage processing: Extraction → Chunking → Embedding → Storage
- Progress tracking with callbacks
- Batch processing with concurrency control
- Error handling and retry logic
- Module detection and classification
- Trade type identification

**Configuration**:
```typescript
{
  chunkSize: 750,              // Characters per chunk
  chunkOverlap: 100,           // Overlap between chunks
  embeddingBatchSize: 50,      // Embeddings per batch
  embeddingRetries: 3,         // Retry attempts
  maxConcurrentFiles: 3,       // Parallel file processing
  storeEmbeddings: true,       // Store vectors in DB
  generatePreview: true        // Generate content previews
}
```

**Processing Stages**:
1. **Extraction**: PDF text extraction with OCR fallback
2. **Filtering**: Remove headers, footers, page numbers
3. **Module Detection**: Identify curriculum modules using pattern matching
4. **Chunking**: Semantic chunking with overlap
5. **Embedding**: Generate 384-dim vectors using BGE model
6. **Storage**: Store chunks with metadata in PostgreSQL

### 2. Vector Search Service (`lib/rag/vector-search.ts`)

**Purpose**: Semantic search over knowledge base using vector similarity.

**Key Features**:
- Cosine similarity search using pgvector
- Multi-filter support (course, module, trade type)
- Configurable similarity thresholds
- Result caching for performance
- Batch query support

**Search Parameters**:
```typescript
{
  query: string,               // Search query
  course?: 'fitter' | 'electrician',
  module?: string,             // Specific module filter
  tradeType?: 'trade_theory' | 'trade_practical',
  topK?: number,               // Results to return (default: 5)
  minSimilarity?: number       // Threshold (default: 0.7)
}
```

**Performance Optimizations**:
- IVFFlat index for fast approximate search
- Query result caching
- Chunk metadata caching
- Connection pooling

### 3. Embedding Service (`lib/rag/local-embedding-service.ts`)

**Purpose**: Generate semantic embeddings using local BGE model (no API calls).

**Model**: BAAI/bge-small-en-v1.5
- **Dimensions**: 384
- **Max Tokens**: 512
- **Language**: English
- **Performance**: ~100ms per embedding on CPU

**Features**:
- Offline operation (no internet required)
- Batch processing support
- Automatic model caching
- Memory-efficient inference

### 4. Context Builder (`lib/rag/context-builder.ts`)

**Purpose**: Build contextual prompts for AI chatbot using RAG.

**Workflow**:
1. Embed user query
2. Search knowledge base
3. Rank results by relevance
4. Format context with citations
5. Include conversation history
6. Generate system prompt

**Context Structure**:
```typescript
{
  relevantContent: string,     // Formatted context
  sources: Array<{
    section: string,
    pageNumber: number,
    pdfSource: string,
    similarity: number
  }>,
  chunkCount: number,
  conversationHistory: Array<{
    role: 'user' | 'assistant',
    content: string
  }>
}
```

### 5. Quiz Helper (`lib/quiz-helper.ts`)

**Purpose**: Generate balanced quizzes from knowledge base.

**Features**:
- Content distribution balancing
- Difficulty calculation
- Time estimation
- Topic coverage analysis
- Question generation support

**Quiz Metadata**:
```typescript
{
  moduleId: string,
  tradeType: 'TT' | 'TP',
  totalQuestions: number,
  contentTypes: {
    theory: number,
    practical: number,
    mixed: number
  },
  difficulty: 'easy' | 'medium' | 'hard',
  estimatedTime: number        // minutes
}
```

---

## 🔐 Authentication & Authorization

### JWT Token Structure
```typescript
{
  userId: number,
  email: string,
  role: 'student' | 'instructor' | 'admin',
  course: 'fitter' | 'electrician',
  iat: number,                 // Issued at
  exp: number                  // Expiration (24 hours)
}
```

### Authentication Flow
1. User submits credentials to `/api/auth/login`
2. Server validates against database
3. Password verified using bcrypt
4. JWT token generated and set as HTTP-only cookie
5. Token validated on subsequent requests
6. `last_login` timestamp updated

### Authorization Levels
- **Public**: Landing page, registration, login
- **Student**: Dashboard, quizzes, chatbot, profile
- **Instructor**: Student management, content review
- **Admin**: Full system access, analytics, user management

### Security Measures
- HTTP-only cookies (XSS protection)
- bcrypt password hashing (10 salt rounds)
- JWT expiration (24 hours)
- CORS configuration
- SQL injection prevention (parameterized queries)
- Input validation and sanitization

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/admin-login` - Admin login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `PUT /api/auth/update-profile` - Update profile

### Quiz System
- `POST /api/quiz/generate` - Generate quiz for module
- `POST /api/quiz/generate-topic` - Generate topic-specific quiz
- `POST /api/quiz/submit` - Submit quiz answers
- `POST /api/quiz/save` - Save quiz attempt
- `GET /api/quiz/history` - Get quiz history

### RAG/Chat System
- `POST /api/rag/chat` - Send chat message
- `GET /api/rag/chat?sessionId=xxx` - Get chat history
- `POST /api/rag/search` - Semantic search
- `GET /api/rag/syllabus/[course]` - Get course syllabus
- `GET /api/rag/stats` - RAG system statistics

### Admin
- `GET /api/admin/stats` - System statistics
- `GET /api/rag/quality/metrics` - Quality metrics
- `POST /api/rag/quality/validate` - Validate content quality
- `GET /api/rag/performance` - Performance metrics

### Chat Sessions
- `GET /api/chat/sessions` - Get user's chat sessions
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/history` - Clear chat history

### Leaderboard
- `GET /api/leaderboard` - Get top performers

---

## 🧪 Testing Strategy

### Testing Framework
- **Unit Tests**: Vitest with fast-check for property-based testing
- **Component Tests**: React Testing Library with jsdom
- **Integration Tests**: Full API endpoint testing
- **Property-Based Tests**: Automated test case generation

### Test Coverage Areas

#### 1. RAG System Tests
- Embedding determinism
- Chunk storage completeness
- Module detection accuracy
- Search relevance
- Context building
- Cache functionality

#### 2. Quiz System Tests
- Content distribution
- Question generation
- Difficulty calculation
- Score calculation
- History tracking

#### 3. Component Tests
- User interactions
- Form validation
- State management
- Navigation flows

#### 4. Property-Based Tests
Examples from codebase:
- `chunk-overlap.property.test.ts` - Validates chunk overlap consistency
- `module-extraction.property.test.ts` - Tests module detection across inputs
- `search-relevance.property.test.ts` - Ensures search quality
- `trade-type-detection.property.test.ts` - Validates classification

### Running Tests
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Specific test file
npm test -- lib/rag/__tests__/vector-search.test.ts
```

---

## 🚀 Deployment & Operations

### Environment Variables

**Required**:
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-key
```

**Optional**:
```env
HUGGINGFACE_API_KEY=your-hf-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password
NEXTAUTH_URL=http://localhost:3000
```

### Database Setup

**Local Development (Docker)**:
```bash
# Start PostgreSQL with pgvector
npm run docker:start

# Initialize database
npm run init-db

# Create admin user
npm run create-admin

# Initialize RAG database
npm run init-rag
```

**Production (Neon)**:
```bash
# Set DATABASE_URL to Neon connection string
# Run migrations
npx tsx scripts/setup-database-schema.ts
```

### PDF Processing

**Process curriculum PDFs**:
```bash
# Dry run (preview)
npm run process-pdfs:dry-run

# Process with verbose output
npm run process-pdfs:verbose

# Standard processing
npm run process-pdfs
```

**PDF Organization**:
```
electrician-sep-modules/
├── TP/
│   ├── curriculum/
│   │   ├── index.pdf
│   │   └── syllabus.pdf
│   ├── module-1-safety-practice-and-hand-tools.pdf
│   ├── module-2-wires-joints-soldering---ug-cables.pdf
│   └── ...
└── TT/
    ├── curriculum/
    └── modules...

fitter/
├── Fitter - 1st Year - TP (NSQF 2022).pdf
└── Fitter - 1st Year - TT (NSQF 2022).pdf
```

### Deployment Process

**Vercel Deployment**:
1. Connect GitHub repository
2. Configure environment variables
3. Set build command: `npm run build`
4. Set output directory: `.next`
5. Deploy

**Database Migration**:
```bash
# Export from local
npx tsx scripts/export-local-data.ts

# Import to Neon
npx tsx scripts/import-to-neon.ts
```

### Monitoring & Maintenance

**Health Checks**:
```bash
# Database connection
npm run test-db

# System verification
npx tsx scripts/verify-complete-system.ts

# Content validation
npx tsx scripts/verify-content.ts
```

**Performance Optimization**:
```bash
# Optimize database
npx tsx scripts/optimize-performance.js

# Validate quality
npx tsx scripts/validate-quality.js
```

---

## 📊 System Performance

### Metrics

**PDF Processing**:
- Processing speed: ~2-3 pages/second
- Chunk generation: ~100 chunks/minute
- Embedding generation: ~50 embeddings/minute (local)
- Storage: ~1000 chunks/minute

**Vector Search**:
- Query latency: <100ms (with index)
- Embedding generation: ~100ms (local BGE)
- Result retrieval: <50ms
- Cache hit rate: ~60-70%

**API Response Times**:
- Authentication: <50ms
- Quiz generation: 1-2 seconds
- Chat response: 2-4 seconds (including LLM)
- Search: <200ms

### Scalability Considerations

**Current Limits**:
- Database: 10GB storage (Neon free tier)
- Concurrent users: ~100 (Vercel hobby)
- API rate limits: Gemini free tier (15 RPM, 1500 RPD)
- Embedding model: CPU-bound, ~10 concurrent requests

**Optimization Strategies**:
- Connection pooling
- Result caching
- Batch processing
- Lazy loading
- CDN for static assets
- Database indexing

---

## 🔄 Data Flow Diagrams

### Quiz Generation Flow
```
User selects module/topic
    ↓
Dashboard → API: /api/quiz/generate
    ↓
Quiz Helper: getBalancedQuizContent()
    ↓
Vector Search: Find relevant chunks
    ↓
Content Distribution: Balance theory/practical
    ↓
Difficulty Calculation
    ↓
Question Generation (AI)
    ↓
Return quiz to frontend
    ↓
User takes quiz
    ↓
Submit → API: /api/quiz/submit
    ↓
Calculate score
    ↓
Store in quiz_attempts
    ↓
Update user statistics
```

### RAG Chat Flow
```
User sends message
    ↓
Chatbot → API: /api/rag/chat
    ↓
Verify authentication
    ↓
Context Builder: buildChatContext()
    ↓
Embedding Service: Embed query
    ↓
Vector Search: Find relevant chunks
    ↓
Format context with sources
    ↓
Include conversation history
    ↓
Gemini API: Generate response
    ↓
Extract citations
    ↓
Store in chat_history
    ↓
Return response with sources
```

### PDF Processing Flow
```
PDF file uploaded/selected
    ↓
PDF Pipeline: processPDF()
    ↓
Stage 1: Extract text (pdf-parse)
    ↓
Stage 2: OCR if needed (Tesseract)
    ↓
Stage 3: Filter content
    ↓
Stage 4: Detect modules
    ↓
Stage 5: Chunk content
    ↓
Stage 6: Assign modules to chunks
    ↓
Stage 7: Generate embeddings (BGE)
    ↓
Stage 8: Store in knowledge_chunks
    ↓
Stage 9: Update pdf_documents
    ↓
Complete
```

---

## 🛠️ Development Workflow

### Setup
```bash
# Clone repository
git clone <repo-url>
cd vola-stage1

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Start database
npm run docker:start

# Initialize database
npm run init-db
npm run init-rag

# Create admin
npm run create-admin

# Start development server
npm run dev
```

### Development Commands
```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode

# Database
npm run docker:start     # Start PostgreSQL
npm run docker:stop      # Stop PostgreSQL
npm run docker:status    # Check status
npm run docker:reset     # Reset database

# PDF Processing
npm run process-pdfs     # Process PDFs
npm run process-pdfs:dry-run  # Preview
npm run process-pdfs:verbose  # Verbose output
```

### Code Structure
```
vola-stage1/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication
│   │   ├── quiz/         # Quiz system
│   │   ├── rag/          # RAG/Chat
│   │   └── admin/        # Admin endpoints
│   ├── auth/             # Auth pages
│   ├── dashboard/        # Student dashboard
│   ├── chatbot/          # Chatbot page
│   ├── quiz/             # Quiz pages
│   └── admin/            # Admin pages
├── components/            # React components
│   ├── ui/               # Base UI components
│   └── __tests__/        # Component tests
├── lib/                   # Core libraries
│   ├── rag/              # RAG system
│   │   ├── pdf-pipeline.ts
│   │   ├── vector-search.ts
│   │   ├── embedding-service.ts
│   │   ├── context-builder.ts
│   │   └── __tests__/    # RAG tests
│   ├── models/           # Database models
│   ├── postgresql.ts     # DB connection
│   ├── auth.ts           # Auth utilities
│   └── quiz-helper.ts    # Quiz utilities
├── scripts/              # Utility scripts
│   ├── setup-database-schema.ts
│   ├── process-pdfs.ts
│   └── __tests__/        # Script tests
├── __tests__/            # Integration tests
├── .env.local            # Environment variables
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── vitest.config.ts      # Test config
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check if PostgreSQL is running
npm run docker:status

# Restart database
npm run docker:reset

# Verify connection
npm run test-db
```

**2. Embedding Model Not Loading**
```bash
# Clear cache
rm -rf node_modules/.cache

# Reinstall dependencies
npm install

# Test embedding service
npx tsx scripts/test-bge-embeddings.ts
```

**3. PDF Processing Fails**
```bash
# Check PDF structure
npx tsx scripts/inspect-pdf-structure.ts

# Verify module detection
npx tsx scripts/debug-index-detection.ts

# Test single PDF
npx tsx scripts/test-single-pdf.ts
```

**4. Quiz Generation Returns No Content**
```bash
# Check knowledge chunks
npx tsx scripts/check-knowledge-data.ts

# Verify modules
npx tsx scripts/verify-modules.ts

# Check content distribution
npx tsx scripts/analyze-page-distribution.ts
```

**5. Chat Not Responding**
- Check Gemini API key in `.env.local`
- Verify rate limits not exceeded
- Check chat history table exists
- Verify vector search working

### Debug Tools

**Database Inspection**:
```bash
# Check all tables
npx tsx scripts/verify-all-tables.js

# Check specific content
npx tsx scripts/comprehensive-content-check.ts

# Verify vector database
npx tsx scripts/verify-vector-db.ts
```

**System Verification**:
```bash
# Complete system check
npx tsx scripts/verify-complete-system.ts

# RAG system check
npx tsx scripts/verify-rag-system.ts

# Database health
npx tsx scripts/final-db-check.js
```

---

## 📈 Future Enhancements

### Planned Features
1. **Advanced Analytics**
   - Learning path recommendations
   - Skill gap analysis
   - Predictive performance modeling

2. **Enhanced Quiz System**
   - Adaptive difficulty
   - Spaced repetition
   - Peer comparison
   - Certification preparation

3. **Expanded Content**
   - Video tutorials
   - Interactive simulations
   - 3D models for practical training
   - Multi-language support

4. **Social Features**
   - Study groups
   - Peer tutoring
   - Discussion forums
   - Collaborative learning

5. **Mobile Application**
   - Native iOS/Android apps
   - Offline mode
   - Push notifications
   - Mobile-optimized quizzes

6. **Instructor Tools**
   - Custom quiz creation
   - Student progress monitoring
   - Assignment management
   - Grade book integration

### Technical Improvements
1. **Performance**
   - Redis caching layer
   - GraphQL API
   - Server-side rendering optimization
   - Image optimization

2. **Scalability**
   - Microservices architecture
   - Load balancing
   - Database sharding
   - CDN integration

3. **AI/ML**
   - Fine-tuned models for ITI content
   - Multi-modal embeddings
   - Question quality scoring
   - Automated content tagging

4. **Security**
   - OAuth integration
   - Two-factor authentication
   - Role-based access control (RBAC)
   - Audit logging

---

## 📚 References & Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js)

### Key Libraries
- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) - Gemini API
- [@xenova/transformers](https://www.npmjs.com/package/@xenova/transformers) - Local ML models
- [pg](https://www.npmjs.com/package/pg) - PostgreSQL client
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) - PDF text extraction
- [tesseract.js](https://www.npmjs.com/package/tesseract.js) - OCR
- [vitest](https://vitest.dev/) - Testing framework
- [fast-check](https://fast-check.dev/) - Property-based testing

### ITI Curriculum
- NCVT (National Council for Vocational Training)
- NSQF (National Skills Qualifications Framework)
- DGT (Directorate General of Training)

---

## 👥 Team & Support

### Development Team
- **Project Lead**: [Name]
- **Backend Development**: [Name]
- **Frontend Development**: [Name]
- **AI/ML Engineering**: [Name]
- **DevOps**: [Name]

### Contact
- **Email**: support@iti-platform.com
- **GitHub**: [Repository URL]
- **Documentation**: [Docs URL]

### Contributing
Contributions are welcome! Please read our contributing guidelines and submit pull requests.

### License
This project is licensed under the MIT License.

---

## 📝 Changelog

### Version 0.1.0 (Current)
- Initial release
- User authentication system
- Quiz generation with AI
- RAG-based chatbot
- PDF processing pipeline
- Admin dashboard
- Student dashboard
- Leaderboard system
- Property-based testing suite

---

**Last Updated**: March 4, 2026  
**Document Version**: 1.0  
**Status**: Active Development
