# Requirements Document - RAG Knowledge Base System

## Introduction

This document outlines the requirements for implementing a Retrieval-Augmented Generation (RAG) system that processes ITI course PDFs (Fitter and Electrician) to create a vector-based knowledge base. This system will enhance quiz generation accuracy, enable syllabus exploration, and power an AI assistant chatbot with course-specific knowledge.

## Glossary

- **RAG System**: Retrieval-Augmented Generation - A system that retrieves relevant information from a knowledge base before generating responses
- **Vector Embeddings**: Numerical representations of text that capture semantic meaning
- **Knowledge Base**: Structured storage of course content extracted from PDFs
- **Gemini API**: Google's generative AI API used for embeddings and text generation
- **PDF Parser**: Component that extracts text and structure from PDF documents
- **Vector Database**: Database optimized for storing and querying vector embeddings
- **Chunk**: A segment of text from the PDF (typically 500-1000 tokens)
- **Semantic Search**: Finding relevant content based on meaning rather than exact keywords

## Requirements

### Requirement 1: PDF Content Extraction

**User Story:** As a system administrator, I want to extract clean, structured content from ITI course PDFs, so that the knowledge base contains only relevant educational material.

#### Acceptance Criteria

1. WHEN the system processes a PDF THEN it SHALL extract text content while preserving chapter and section structure
2. WHEN extracting content THEN the system SHALL exclude bibliography pages, references, and non-syllabus content
3. WHEN processing PDFs THEN the system SHALL identify and preserve module/chapter boundaries
4. WHEN text is extracted THEN the system SHALL maintain the relationship between headings and content
5. WHERE a PDF contains images with text THEN the system SHALL attempt OCR extraction if needed

### Requirement 2: Content Chunking and Preprocessing

**User Story:** As a developer, I want PDF content split into optimal chunks, so that vector search returns precise and relevant results.

#### Acceptance Criteria

1. WHEN content is chunked THEN the system SHALL create segments of 500-1000 tokens with 100-token overlap
2. WHEN chunking THEN the system SHALL preserve complete sentences and avoid mid-sentence breaks
3. WHEN processing chunks THEN the system SHALL maintain metadata including course, module, page number, and section title
4. WHEN a chunk is created THEN the system SHALL include surrounding context for better semantic understanding
5. WHEN preprocessing text THEN the system SHALL normalize formatting while preserving technical terms

### Requirement 3: Vector Embedding Generation

**User Story:** As a system, I want to convert text chunks into vector embeddings using Gemini API, so that semantic search can find relevant content.

#### Acceptance Criteria

1. WHEN generating embeddings THEN the system SHALL use Gemini API's embedding model
2. WHEN creating embeddings THEN the system SHALL batch process chunks to optimize API usage
3. WHEN an embedding is generated THEN the system SHALL store it with its associated metadata
4. IF embedding generation fails THEN the system SHALL retry with exponential backoff
5. WHEN processing completes THEN the system SHALL log statistics including total chunks and embeddings created

### Requirement 4: Vector Database Storage

**User Story:** As a developer, I want embeddings stored in an efficient vector database, so that semantic search queries execute quickly.

#### Acceptance Criteria

1. WHEN storing embeddings THEN the system SHALL use PostgreSQL with pgvector extension for vector storage
2. WHEN creating the database schema THEN the system SHALL include indexes for fast similarity search
3. WHEN storing a chunk THEN the system SHALL save the embedding, original text, metadata, and course information
4. WHEN querying THEN the system SHALL support cosine similarity search
5. WHEN the database is initialized THEN the system SHALL create separate collections for Fitter and Electrician courses

### Requirement 5: Semantic Search API

**User Story:** As a quiz generation system, I want to search the knowledge base for relevant content, so that quizzes are based on actual course material.

#### Acceptance Criteria

1. WHEN a search query is received THEN the system SHALL convert it to a vector embedding
2. WHEN searching THEN the system SHALL return the top K most similar chunks (configurable, default 5)
3. WHEN results are returned THEN the system SHALL include similarity scores and source metadata
4. WHEN filtering by course THEN the system SHALL only search within that course's content
5. WHEN filtering by module THEN the system SHALL only return chunks from specified modules

### Requirement 6: Enhanced Quiz Generation with Content Classification

**User Story:** As a student, I want quizzes generated from classified course content with balanced question types, so that questions test different aspects of learning (theory, safety, practical, tools).

#### Acceptance Criteria

1. WHEN generating a quiz THEN the system SHALL retrieve content chunks classified by type (theory, safety, practical, tools)
2. WHEN creating questions THEN the system SHALL generate balanced question distribution (40% theory, 30% safety, 20% practical, 10% tools)
3. WHEN selecting content THEN the system SHALL prioritize high-priority chunks (priority >= 6 for theory, >= 8 for safety)
4. WHEN generating questions THEN the system SHALL create different question types based on content classification
5. WHEN calculating difficulty THEN the system SHALL determine quiz difficulty based on content priority and complexity
6. WHEN estimating time THEN the system SHALL provide realistic completion time based on question types and difficulty

### Requirement 7: Syllabus Explorer

**User Story:** As a student, I want to browse the course syllabus by module, so that I can understand what topics are covered.

#### Acceptance Criteria

1. WHEN viewing a module THEN the system SHALL display extracted topics and subtopics
2. WHEN browsing syllabus THEN the system SHALL show module descriptions from the PDF
3. WHEN a topic is selected THEN the system SHALL display relevant content excerpts
4. WHEN viewing content THEN the system SHALL show page references to the original PDF
5. WHEN searching syllabus THEN the system SHALL support keyword and semantic search

### Requirement 8: Context-Aware AI Assistant Chatbot

**User Story:** As a student, I want to ask questions about course content with intelligent context awareness, so that I get personalized responses based on my learning level and focus area.

#### Acceptance Criteria

1. WHEN a question is asked THEN the system SHALL use contextual search to retrieve relevant content based on user context
2. WHEN generating responses THEN the system SHALL adapt language and complexity to user level (beginner/intermediate/advanced)
3. WHEN user specifies focus area THEN the system SHALL prioritize content types (safety → safety content, tools → tools content)
4. WHEN in module context THEN the system SHALL prioritize content from current module while including related content
5. WHEN answering THEN the system SHALL provide specialized response types (safety warnings, tool information, definitions, procedures)
6. WHEN citing sources THEN the system SHALL include module, section, content type, and priority information

### Requirement 9: Content Filtering and Quality Control

**User Story:** As a system administrator, I want to ensure only high-quality, relevant content is indexed, so that the knowledge base remains accurate.

#### Acceptance Criteria

1. WHEN processing PDFs THEN the system SHALL detect and skip cover pages, blank pages, and index pages
2. WHEN extracting text THEN the system SHALL filter out page headers, footers, and page numbers
3. WHEN identifying content THEN the system SHALL recognize and exclude bibliography and reference sections
4. WHEN processing tables THEN the system SHALL extract and structure tabular data appropriately
5. WHEN quality is low THEN the system SHALL flag chunks for manual review

### Requirement 10: Batch Processing and Updates

**User Story:** As a system administrator, I want to process PDFs in batches and update the knowledge base, so that content stays current.

#### Acceptance Criteria

1. WHEN processing starts THEN the system SHALL support batch processing of multiple PDFs
2. WHEN a PDF is updated THEN the system SHALL detect changes and re-process only modified content
3. WHEN processing THEN the system SHALL display progress indicators and estimated completion time
4. WHEN errors occur THEN the system SHALL log details and continue processing remaining files
5. WHEN processing completes THEN the system SHALL generate a summary report with statistics

### Requirement 11: API Rate Limiting and Cost Management

**User Story:** As a system administrator, I want to manage API usage efficiently, so that costs remain controlled.

#### Acceptance Criteria

1. WHEN making API calls THEN the system SHALL implement rate limiting to stay within quotas
2. WHEN batching requests THEN the system SHALL optimize to minimize API calls
3. WHEN processing THEN the system SHALL cache embeddings to avoid regeneration
4. WHEN usage is high THEN the system SHALL queue requests and process them gradually
5. WHEN processing completes THEN the system SHALL report total API calls and estimated costs

### Requirement 13: Content Classification and Priority System

**User Story:** As a system, I want content automatically classified by type and priority, so that search and quiz generation can provide contextually appropriate results.

#### Acceptance Criteria

1. WHEN processing content THEN the system SHALL classify chunks into types: theory, safety, practical, tools, definition
2. WHEN assigning priority THEN the system SHALL score content from 1-10 based on importance and educational value
3. WHEN storing chunks THEN the system SHALL include content_type and priority fields in database
4. WHEN searching THEN the system SHALL support filtering by content type and minimum priority
5. WHEN ranking results THEN the system SHALL prioritize higher priority content in search results

### Requirement 14: Contextual Search and Retrieval

**User Story:** As a developer, I want intelligent search that adapts to user context, so that results are relevant to the user's current learning situation.

#### Acceptance Criteria

1. WHEN searching THEN the system SHALL support context parameters (user level, focus area, current module, trade type)
2. WHEN user level is beginner THEN the system SHALL prioritize high-priority, foundational content
3. WHEN focus area is specified THEN the system SHALL filter content types accordingly (safety → safety content)
4. WHEN in module context THEN the system SHALL boost relevance of module-specific content
5. WHEN trade type is specified THEN the system SHALL filter results to TT (Trade Theory) or TP (Trade Practical)

### Requirement 15: Advanced Quiz Content Selection

**User Story:** As a quiz system, I want intelligent content selection for balanced question generation, so that quizzes comprehensively test different learning aspects.

#### Acceptance Criteria

1. WHEN selecting quiz content THEN the system SHALL get mixed content with balanced distribution by type
2. WHEN generating safety questions THEN the system SHALL prioritize content with priority >= 8
3. WHEN generating theory questions THEN the system SHALL select definition and concept content
4. WHEN generating practical questions THEN the system SHALL select procedure and application content
5. WHEN generating tool questions THEN the system SHALL select equipment and instrument content
6. WHEN content is insufficient THEN the system SHALL provide distribution statistics and adjust accordingly

### Requirement 16: Related Content Discovery

**User Story:** As a student, I want to discover related content based on keywords and topics, so that I can explore connected concepts.

#### Acceptance Criteria

1. WHEN searching for related content THEN the system SHALL use keyword matching and topic analysis
2. WHEN finding related content THEN the system SHALL exclude specified content types if requested
3. WHEN ranking related content THEN the system SHALL prioritize by relevance and word count
4. WHEN displaying results THEN the system SHALL include topic keywords and content classification
5. WHEN no related content found THEN the system SHALL suggest alternative search terms

---

## Non-Functional Requirements

### Performance
- Vector search queries SHALL complete within 200ms for 95% of requests
- PDF processing SHALL handle files up to 50MB in size
- The system SHALL support concurrent processing of multiple PDFs

### Scalability
- The knowledge base SHALL support up to 10,000 content chunks per course
- The system SHALL handle up to 100 concurrent search queries

### Reliability
- The system SHALL implement retry logic for failed API calls
- The system SHALL maintain data integrity during batch processing
- The system SHALL provide rollback capability for failed updates

### Security
- API keys SHALL be stored securely in environment variables
- The system SHALL validate all input to prevent injection attacks
- Access to admin functions SHALL require authentication

---

## Technical Constraints

1. Use Gemini API for both embeddings and text generation
2. Use PostgreSQL with pgvector extension for vector storage
3. Support PDF files from the `fitter/` and `electrician/` folders
4. Maintain compatibility with existing quiz generation system
5. Process PDFs server-side to avoid client-side performance issues

---

## Success Criteria

1. Successfully extract and index content from all 4 ITI PDFs
2. Generate quizzes with 90%+ accuracy based on actual course content
3. Chatbot provides relevant answers with source citations
4. Syllabus explorer displays complete module structure
5. System processes new PDFs within 5 minutes
6. Vector search returns relevant results in under 200ms

---

**Document Version:** 1.0  
**Last Updated:** February 24, 2026  
**Status:** Draft - Ready for Design Phase
