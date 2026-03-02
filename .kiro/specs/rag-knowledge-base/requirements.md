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

### Requirement 6: RAG-Enhanced Quiz Generation

**User Story:** As a student, I want quizzes generated from actual course content, so that questions are accurate and aligned with the syllabus.

#### Acceptance Criteria

1. WHEN generating a quiz THEN the system SHALL retrieve relevant content chunks from the knowledge base
2. WHEN creating questions THEN the system SHALL use retrieved content as context for Gemini API
3. WHEN a module is selected THEN the system SHALL prioritize content from that specific module
4. WHEN generating questions THEN the system SHALL include source references (page numbers, sections)
5. WHEN content is insufficient THEN the system SHALL fall back to general knowledge with a warning

### Requirement 7: Syllabus Explorer

**User Story:** As a student, I want to browse the course syllabus by module, so that I can understand what topics are covered.

#### Acceptance Criteria

1. WHEN viewing a module THEN the system SHALL display extracted topics and subtopics
2. WHEN browsing syllabus THEN the system SHALL show module descriptions from the PDF
3. WHEN a topic is selected THEN the system SHALL display relevant content excerpts
4. WHEN viewing content THEN the system SHALL show page references to the original PDF
5. WHEN searching syllabus THEN the system SHALL support keyword and semantic search

### Requirement 8: AI Assistant Chatbot

**User Story:** As a student, I want to ask questions about course content, so that I can get instant clarification on topics.

#### Acceptance Criteria

1. WHEN a question is asked THEN the system SHALL retrieve relevant content from the knowledge base
2. WHEN generating a response THEN the system SHALL use retrieved content as context for Gemini API
3. WHEN answering THEN the system SHALL cite sources with page numbers and sections
4. WHEN content is not found THEN the system SHALL inform the user and suggest related topics
5. WHEN conversation continues THEN the system SHALL maintain context from previous messages

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

### Requirement 12: Module and Topic Mapping

**User Story:** As a developer, I want content mapped to specific modules and topics, so that search results are contextually relevant.

#### Acceptance Criteria

1. WHEN processing PDFs THEN the system SHALL automatically detect module boundaries
2. WHEN extracting content THEN the system SHALL map chunks to predefined module names
3. WHEN storing chunks THEN the system SHALL tag them with module IDs and topic keywords
4. WHEN searching by module THEN the system SHALL filter results to that module's content
5. WHEN modules are ambiguous THEN the system SHALL use fuzzy matching to assign content

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
