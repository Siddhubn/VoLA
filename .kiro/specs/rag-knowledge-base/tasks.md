# Implementation Plan - RAG Knowledge Base System

## Overview
This implementation plan breaks down the RAG Knowledge Base system into discrete, actionable coding tasks. Each task builds incrementally on previous work, ensuring the system is integrated and functional at every step.

---

## Tasks

- [x] 1. Set up vector database infrastructure





  - Install and configure pgvector extension in PostgreSQL
  - Create database schema for knowledge_chunks, pdf_documents, module_mapping, and chat_history tables
  - Create vector similarity indexes (IVFFlat) for performance
  - Add database migration script
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 1.1 Write unit tests for database schema


  - Test table creation and constraints
  - Test index creation
  - Verify vector operations work correctly



  - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. Implement PDF text extraction service





  - Create PDFProcessor class with text extraction using pdf-parse library
  - Implement content filtering to remove headers, footers, page numbers
  - Add logic to exclude bibliography, references, and index sections


  - Preserve document structure (chapters, sections, headings)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 9.1, 9.2, 9.3_

- [x] 2.1 Write unit tests for PDF extraction



  - Test text extraction from sample PDFs
  - Test content filtering rules
  - Test structure preservation
  - _Requirements: 1.1, 1.2, 9.2_

- [x] 3. Implement content chunking engine






  - Create chunking algorithm with configurable chunk size (default 750 tokens)
  - Implement 100-token overlap between consecutive chunks
  - Preserve sentence boundaries (no mid-sentence breaks)
  - Extract and attach metadata (module, section, page number)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.1 Write property test for chunk overlap


  - **Property 1: Chunk Overlap Consistency**
  - **Validates: Requirements 2.1, 2.2**

- [x] 3.2 Write unit tests for chunking


  - Test sentence boundary preservation
  - Test metadata extraction
  - Test edge cases (very short/long content)
  - _Requirements: 2.2, 2.3_

- [x] 4. Implement module detection and mapping




  - Create module_mapping seed data for Fitter and Electrician courses
  - Implement pattern matching to detect module boundaries in PDFs
  - Create fuzzy matching algorithm to assign chunks to modules
  - Handle ambiguous cases with confidence scoring
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 4.1 Write unit tests for module detection


  - Test pattern matching accuracy
  - Test fuzzy matching algorithm
  - Test edge cases and ambiguous content
  - _Requirements: 12.1, 12.5_

- [x] 5. Implement Gemini embedding service



  - Create EmbeddingService class using Gemini API
  - Implement single embedding generation
  - Implement batch embedding generation (batch size: 100)
  - Add retry logic with exponential backoff
  - Add rate limiting to respect API quotas
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 11.1, 11.2_

- [x] 5.1 Write property test for embedding determinism


  - **Property 2: Embedding Determinism**
  - **Validates: Requirements 3.1, 3.3**

- [x] 5.2 Write unit tests for embedding service




  - Test API integration
  - Test batch processing
  - Test retry logic
  - Test rate limiting
  - _Requirements: 3.2, 3.4, 11.1_

- [x] 6. Implement PDF processing pipeline



  - Create end-to-end pipeline that orchestrates extraction, chunking, embedding, and storage
  - Add progress tracking and logging
  - Implement error handling and recovery
  - Store processing status in pdf_documents table
  - Generate processing summary report
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 6.1 Write integration tests for PDF pipeline


  - Test complete pipeline with sample PDF
  - Test error handling and recovery
  - Test progress tracking
  - _Requirements: 10.3, 10.4_

- [x] 7. Create batch processing script






  - Create CLI script to process all PDFs in fitter/ and electrician/ folders
  - Add command-line options for configuration
  - Display progress bars and estimated completion time
  - Generate detailed processing report
  - _Requirements: 10.1, 10.3, 10.5_

- [x] 8. Implement vector search service



  - Create VectorSearchService class for semantic search
  - Implement cosine similarity search using pgvector
  - Add filtering by course and module
  - Implement configurable topK results and similarity threshold
  - Return results with similarity scores and metadata
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8.1 Write property test for search relevance


  - **Property 3: Search Relevance**
  - **Validates: Requirements 5.2, 5.3**

- [x] 8.2 Write property test for module filtering


  - **Property 4: Module Filtering**
  - **Validates: Requirements 5.5, 12.4**

- [x] 8.3 Write unit tests for vector search

  - Test similarity search accuracy
  - Test filtering logic
  - Test result ranking
  - _Requirements: 5.2, 5.4, 5.5_

- [x] 9. Implement RAG context builder
  - Create ContextBuilder class to prepare context for AI generation
  - Implement buildQuizContext method for quiz generation
  - Implement buildChatContext method for chatbot
  - Implement buildSyllabusContext method for syllabus explorer
  - Format retrieved chunks into coherent context windows
  - _Requirements: 6.1, 6.2, 8.1, 8.2_

- [x] 9.1 Write unit tests for context builder
  - Test context formatting
  - Test chunk combination logic
  - Test context window limits
  - _Requirements: 6.1, 8.2_

- [x] 10. Create semantic search API endpoint





  - Implement POST /api/rag/search endpoint
  - Add authentication middleware
  - Validate input parameters
  - Call VectorSearchService and return results
  - Include error handling and logging
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10.1 Write API tests for search endpoint


  - Test authenticated requests
  - Test input validation
  - Test error responses
  - _Requirements: 5.1_

- [x] 11. Enhance quiz generation with RAG



  - Update existing quiz generation API to use RAG context
  - Retrieve relevant chunks using VectorSearchService
  - Pass retrieved content as context to Gemini API
  - Include source references (page numbers, sections) in quiz metadata
  - Add fallback to general knowledge if content insufficient
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11.1 Write integration tests for RAG-enhanced quiz generation


  - Test quiz generation with RAG context
  - Test source reference inclusion
  - Test fallback behavior
  - _Requirements: 6.1, 6.4, 6.5_

- [x] 12. Implement syllabus explorer API





  - Create GET /api/rag/syllabus/:course/:module? endpoint
  - Return module structure with topics and descriptions
  - Support both course-level and module-level queries
  - Include chunk counts and page references
  - Add keyword and semantic search within syllabus
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12.1 Write API tests for syllabus endpoint


  - Test course-level queries
  - Test module-level queries
  - Test search functionality
  - _Requirements: 7.1, 7.5_

- [x] 13. Implement AI chatbot API





  - Create POST /api/rag/chat endpoint
  - Retrieve relevant content using semantic search
  - Build context with conversation history
  - Generate response using Gemini API with RAG context
  - Include source citations in response
  - Store conversation in chat_history table
  - Handle session management
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 13.1 Write integration tests for chatbot API



  - Test question answering with context
  - Test source citation
  - Test conversation history
  - Test session management
  - _Requirements: 8.2, 8.3, 8.5_

- [x] 14. Create syllabus explorer UI component





  - Build React component to display course modules
  - Show module descriptions and topics
  - Display content excerpts with page references
  - Add search functionality
  - Integrate with syllabus API
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 15. Create AI chatbot UI component





  - Build React chat interface component
  - Display conversation history
  - Show source citations with each response
  - Add course selection
  - Handle loading states and errors
  - Integrate with chatbot API
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 16. Add RAG system monitoring and statistics




  - Create admin dashboard for RAG system stats
  - Display processing status of PDFs
  - Show total chunks, embeddings, and API usage
  - Add search analytics (query count, avg similarity)
  - Create database statistics endpoint
  - _Requirements: 10.5, 11.5_

- [x] 16.1 Write unit tests for statistics collection

  - Test metric calculation
  - Test data aggregation
  - _Requirements: 10.5_

- [x] 17. Implement caching layer





  - Add Redis or in-memory cache for frequently accessed chunks
  - Cache module mappings
  - Cache embedding results to avoid regeneration
  - Implement cache invalidation strategy
  - _Requirements: 11.3_

- [x] 17.1 Write unit tests for caching


  - Test cache hit/miss behavior
  - Test cache invalidation
  - Test cache expiration
  - _Requirements: 11.3_

- [x] 18. Add content quality validation




  - Implement quality scoring for extracted chunks
  - Flag low-quality chunks for review
  - Add manual review interface for admins
  - Create quality metrics dashboard
  - _Requirements: 9.5_

- [x] 19. Checkpoint - Ensure all tests pass






  - Run all unit tests and property tests
  - Run integration tests
  - Verify API endpoints work correctly
  - Test with sample PDFs from both courses
  - Ask the user if questions arise

- [x] 20. Performance optimization





  - Optimize vector search queries
  - Tune IVFFlat index parameters
  - Add query result caching
  - Optimize batch processing
  - Profile and optimize slow operations
  - _Requirements: Performance requirements_

- [x] 20.1 Write performance tests


  - Test search query response time (<200ms)
  - Test concurrent query handling
  - Test batch processing throughput
  - _Requirements: Performance requirements_

- [x] 21. Documentation and deployment preparation





  - Document API endpoints with examples
  - Create setup guide for pgvector installation
  - Document environment variables
  - Create deployment checklist
  - Add troubleshooting guide
  - _Requirements: All requirements_

- [x] 22. Final integration testing and validation





  - Process all 4 ITI PDFs (Fitter and Electrician)
  - Verify quiz generation accuracy
  - Test chatbot with sample questions
  - Validate syllabus explorer completeness
  - Measure and verify performance metrics
  - Ensure all tests pass, ask the user if questions arise
  - _Requirements: Success Criteria_

- [x] 23. Implement RAG Helper Service



  - Create comprehensive RAG helper with searchKnowledgeBase function
  - Implement contextual search with user level and focus area adaptation
  - Add getModuleContent and getSafetyContent functions
  - Implement getRelatedContent for keyword-based discovery
  - Add generateEmbedding function with simple hash-based approach
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 16.1, 16.2_

- [x] 23.1 Write property test for contextual search adaptation







  - **Property 6: Context Adaptation**
  - **Validates: Requirements 14.2, 14.3**



- [x] 23.2 Write unit tests for RAG helper functions





  - Test search filtering and ranking
  - Test context-aware result adaptation
  - Test related content discovery
  - _Requirements: 14.1, 16.1_

- [x] 24. Implement Quiz Helper Service






  - Create QuizHelper class with content selection by type
  - Implement getMixedQuizContent with balanced distribution (40% theory, 30% safety, 20% practical, 10% tools)


  - Add generateQuestionsFromContent with multiple question types
  - Implement calculateQuizDifficulty based on content priority
  - Add estimateQuizTime function
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 6.5, 6.6_

- [x] 24.1 Write property test for content distribution







  - **Property 7: Quiz Content Balance**
  - **Validates: Requirements 15.1, 6.2**

- [x] 24.2 Write unit tests for quiz helper functions





  - Test content selection by type
  - Test question generation from content
  - Test difficulty calculation
  - Test time estimation
  - _Requirements: 15.2, 15.3, 6.5_

- [x] 25. Update Chatbot API with Context Awareness





  - Enhance existing chat API to use contextualSearch
  - Add support for user context (level, focus area, current module)
  - Implement specialized response types (safety, tools, definitions, procedures)
  - Add enhanced source attribution with content type and priority
  - Improve response generation based on content classification
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [-] 25.1 Write integration tests for context-aware chat




  - Test user level adaptation
  - Test focus area specialization
  - Test module context awareness
  - Test specialized response types
  - _Requirements: 8.2, 8.3, 8.5_



- [x] 26. Update Quiz Generation API with Content Classification


  - Enhance existing quiz generation to use getMixedQuizContent
  - Add support for tradeType parameter (TT/TP)
  - Implement automatic difficulty calculation
  - Add realistic time estimation
  - Include enhanced metadata with content distribution
  - _Requirements: 6.1, 6.2, 6.5, 6.6, 15.1, 15.6_

- [x] 26.1 Write integration tests for enhanced quiz generation


  - Test balanced content distribution
  - Test difficulty calculation
  - Test time estimation accuracy
  - Test metadata inclusion


  - _Requirements: 6.2, 6.5, 15.1_

- [x] 27. Implement Content Classification System



  - Add content type classification during PDF processing
  - Implement priority scoring algorithm (1-10 scale)
  - Update database schema to include content_type and priority fields
  - Add topic keyword extraction
  - Create classification validation tools
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 27.1 Write unit tests for content classification



  - Test content type detection
  - Test priority scoring


  - Test keyword extraction
  - _Requirements: 13.1, 13.2_

- [x] 28. Add Advanced Search Filtering




  - Enhance vector search with content type filtering
  - Add priority-based ranking
  - Implement trade type filtering (TT/TP)
  - Add minimum priority thresholds
  - Create search result optimization
  - _Requirements: 13.4, 13.5, 14.5_

- [x] 28.1 Write property test for search filtering



  - **Property 8: Search Filter Consistency**
  - **Validates: Requirements 13.4, 14.5**

- [x] 29. Checkpoint - Ensure enhanced features work





  - Test RAG helper functions with real data
  - Test quiz helper with content classification
  - Test enhanced chatbot with context awareness
  - Test enhanced quiz generation with balanced content
  - Verify all new property tests pass
  - Ask the user if questions arise

- [x] 30. Performance optimization for enhanced features


  - Optimize contextual search queries
  - Add caching for content classification results
  - Optimize quiz content selection queries
  - Profile and optimize new helper functions
  - _Requirements: Performance requirements_

- [-] 30.1 Write performance tests for enhanced features

  - Test contextual search performance
  - Test quiz content selection speed
  - Test content classification performance
  - _Requirements: Performance requirements_

---

## Notes

- All tasks are required for comprehensive implementation
- Each task includes requirement references for traceability
- Property-based tests are explicitly marked with property numbers from the design document
- Integration points are tested at each major milestone
- The implementation follows a bottom-up approach: infrastructure → services → APIs → UI
- Enhanced tasks (23-30) build on existing foundation to add content classification, contextual search, and intelligent quiz generation

---

**Document Version:** 2.0  
**Last Updated:** March 3, 2026  
**Status:** Enhanced with Content Classification and Context-Aware Features